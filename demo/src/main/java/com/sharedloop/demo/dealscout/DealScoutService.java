package com.sharedloop.demo.dealscout;

import com.sharedloop.demo.model.Building;
import com.sharedloop.demo.model.Host;
import com.sharedloop.demo.model.Listing;
import com.sharedloop.demo.repository.BuildingRepository;
import com.sharedloop.demo.repository.HostRepository;
import com.sharedloop.demo.repository.ListingRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
public class DealScoutService {

    @Value("${dealscout.outreach.allow-unverified-drafts:true}")
    private boolean allowUnverifiedDrafts;

    private final BuildingRepository buildingRepository;
    private final HostRepository hostRepository;
    private final ListingRepository listingRepository;
    private final DealScoutLlmService llmService;
    private final EnrichmentService enrichmentService;

    private final Map<String, DealScoutRunResponse> runHistory = new ConcurrentHashMap<>();

    public DealScoutService(BuildingRepository buildingRepository,
                            HostRepository hostRepository,
                            ListingRepository listingRepository,
                            DealScoutLlmService llmService,
                            EnrichmentService enrichmentService) {
        this.buildingRepository = buildingRepository;
        this.hostRepository = hostRepository;
        this.listingRepository = listingRepository;
        this.llmService = llmService;
        this.enrichmentService = enrichmentService;
    }

    public DealScoutRunResponse runPipeline(DealScoutRunRequest request) {
        List<EnergyBenchmarkInput> benchmarkInputs = request != null ? request.getBenchmarks() : null;
        if (benchmarkInputs == null || benchmarkInputs.isEmpty()) {
            benchmarkInputs = buildSyntheticBenchmarks();
        }

        int topN = request != null && request.getTopN() != null && request.getTopN() > 0 ? request.getTopN() : 5;
        boolean dryRun = request != null && Boolean.TRUE.equals(request.getDryRun());

        List<DealOpportunityDraft> allOpportunities = benchmarkInputs.stream()
                .map(this::toOpportunity)
                .filter(opportunity -> opportunity != null)
                .sorted(Comparator.comparing(DealOpportunityDraft::getUnderutilizationScore).reversed())
                .collect(Collectors.toList());

        List<DealOpportunityDraft> selected = allOpportunities.stream().limit(topN).collect(Collectors.toList());

        String runId = UUID.randomUUID().toString();
        DealScoutRunResponse response = DealScoutRunResponse.builder()
                .runId(runId)
                .generatedAt(Instant.now())
                .topN(topN)
                .totalAnalyzed(allOpportunities.size())
                .dryRun(dryRun)
                .opportunities(selected)
                .build();

        runHistory.put(runId, response);
        return response;
    }

    public List<DealScoutRunResponse> listRuns() {
        return runHistory.values().stream()
                .sorted(Comparator.comparing(DealScoutRunResponse::getGeneratedAt).reversed())
                .collect(Collectors.toList());
    }

    public DealScoutRunResponse getRun(String runId) {
        return runHistory.get(runId);
    }

    public DealOpportunityDraft updateOpportunityStatus(String runId, Long buildingId, String status) {
        DealScoutRunResponse run = runHistory.get(runId);
        if (run == null || run.getOpportunities() == null) {
            return null;
        }

        for (DealOpportunityDraft opportunity : run.getOpportunities()) {
            if (buildingId.equals(opportunity.getBuildingId())) {
                opportunity.setQueueStatus(status == null ? "REVIEW_REQUIRED" : status.toUpperCase());
                return opportunity;
            }
        }
        return null;
    }

    private DealOpportunityDraft toOpportunity(EnergyBenchmarkInput input) {
        if (input == null || input.getBuildingId() == null) {
            return null;
        }

        Building building = buildingRepository.findById(input.getBuildingId()).orElse(null);
        if (building == null) {
            return null;
        }

        List<Listing> buildingListings = listingRepository.findByBuildingId(building.getId());

        int desksShared = buildingListings.stream()
                .filter(listing -> Boolean.TRUE.equals(listing.getActive()))
                .map(Listing::getDesksAvailable)
                .filter(value -> value != null)
                .mapToInt(Integer::intValue)
                .sum();

        double deskSharePct = percentage(desksShared, building.getTotalDesks());

        double occupancyRate = input.getOccupancyRatePct() != null
            ? input.getOccupancyRatePct()
            : Math.max(15.0, Math.min(95.0, deskSharePct));

        double euiPrior = resolveEuiPrior(input.getEuiPrior(), building);
        double euiCurrent = resolveEuiCurrent(input.getEuiCurrent(), euiPrior, building);
        double euiDropPct = calculateEuiDropPct(euiPrior, euiCurrent);

        double underutilizationScore = round(
                (0.55 * (100.0 - occupancyRate)) +
                        (0.30 * Math.max(0.0, euiDropPct)) +
                        (0.15 * (100.0 - deskSharePct))
        );

        double estimatedSavings = estimateAnnualTaxSavings(building.getTotalDesks(), euiDropPct, occupancyRate);

        DealScoutContact contact = resolveContact(building);

        // Real-world enrichment step
        contact = enrichmentService.enrichContact(contact, building);

        boolean outreachReady = Boolean.TRUE.equals(contact.getContactVerified()) || allowUnverifiedDrafts;
        String queueStatus = Boolean.TRUE.equals(contact.getContactVerified()) ? "REVIEW_REQUIRED" : "RESEARCH_REQUIRED";

        DealScoutLlmService.DraftResult draftResult;
        if (outreachReady) {
            draftResult = llmService.draftEmail(
                new DealScoutLlmService.EmailContext(
                    building.getName(),
                    building.getAddress(),
                    contact.getContactName(),
                    contact.getCompanyName(),
                    euiDropPct,
                    estimatedSavings
                )
            );
        } else {
            draftResult = new DealScoutLlmService.DraftResult(
                "Manual research required: verify contact for " + building.getName(),
                "Contact is not verified yet. Please validate company owner/operator, direct CRE contact, and deliverable email before outreach.\n\n" +
                    "Verification details: " + (contact.getVerificationNotes() == null ? "n/a" : contact.getVerificationNotes())
            );
        }

        return DealOpportunityDraft.builder()
                .buildingId(building.getId())
                .buildingName(building.getName())
                .buildingAddress(building.getAddress())
                .underutilizationScore(underutilizationScore)
                .euiDropPct(round(euiDropPct))
                .occupancyRatePct(round(occupancyRate))
                .estimatedAnnualTaxSavingsUsd(round(estimatedSavings))
                .contact(contact)
                .emailSubject(draftResult.subject)
                .emailBody(draftResult.body)
                .queueStatus(queueStatus)
                .build();
    }

    private List<EnergyBenchmarkInput> buildSyntheticBenchmarks() {
        List<EnergyBenchmarkInput> synthetic = new ArrayList<>();

        for (Building building : buildingRepository.findAll()) {
            int totalDesks = building.getTotalDesks() == null ? 0 : building.getTotalDesks();
            int listedDesks = listingRepository.findByBuildingId(building.getId()).stream()
                    .filter(listing -> Boolean.TRUE.equals(listing.getActive()))
                    .map(Listing::getDesksAvailable)
                    .filter(value -> value != null)
                    .mapToInt(Integer::intValue)
                    .sum();

            double occupancyRate = totalDesks > 0 ? Math.min(95.0, Math.max(20.0, (listedDesks * 100.0) / totalDesks)) : 50.0;
            double euiPrior = syntheticEuiPrior(building);
            double euiCurrent = syntheticEuiCurrent(building, euiPrior);

            EnergyBenchmarkInput row = new EnergyBenchmarkInput();
            row.setBuildingId(building.getId());
            row.setReportingYear(2025);
            row.setEuiPrior(euiPrior);
            row.setEuiCurrent(euiCurrent);
            row.setOccupancyRatePct(round(occupancyRate));
            row.setSource("synthetic-default");

            synthetic.add(row);
        }

        return synthetic;
    }

    private DealScoutContact resolveContact(Building building) {
        List<Host> hosts = hostRepository.findByBuildingId(building.getId());

        if (!hosts.isEmpty()) {
            Host best = hosts.get(0);
            return DealScoutContact.builder()
                    .companyName(best.getCompanyName())
                    .contactName(best.getContactName() == null || best.getContactName().isBlank() ? "Corporate Real Estate Lead" : best.getContactName())
                    .title("Corporate Real Estate")
                    .email(best.getContactEmail() == null || best.getContactEmail().isBlank() ? "realestate@" + safeDomain(best.getCompanyName()) : best.getContactEmail())
                    .linkedinUrl("https://www.linkedin.com/company/" + safeSlug(best.getCompanyName()))
                    .website("https://www." + safeDomain(best.getCompanyName()))
                    .sourceNotes("Resolved from existing host record + heuristic LinkedIn/company URL")
                    .confidence(0.85)
                    .sourceCount(1)
                    .emailVerified(false)
                    .contactVerified(false)
                    .verificationNotes("Pending enrichment verification")
                    .build();
        }

        return DealScoutContact.builder()
                .companyName(building.getName() + " Ownership Group")
                .contactName("Corporate Real Estate Lead")
                .title("Corporate Real Estate")
                .email("realestate@" + safeDomain(building.getName()))
                .linkedinUrl("https://www.linkedin.com/search/results/people/?keywords=" + safeSlug(building.getName()) + "%20real%20estate")
                .website("https://www." + safeDomain(building.getName()))
                .sourceNotes("No host record found. Placeholder generated for manual verification.")
                .confidence(0.45)
                .sourceCount(1)
                .emailVerified(false)
                .contactVerified(false)
                .verificationNotes("Placeholder contact; verification required")
                .build();
    }

    private double calculateEuiDropPct(Double prior, Double current) {
        if (prior == null || current == null || prior <= 0) {
            return 0.0;
        }
        return ((prior - current) / prior) * 100.0;
    }

    private double resolveEuiPrior(Double providedPrior, Building building) {
        if (providedPrior != null && providedPrior > 0) {
            return providedPrior;
        }
        return syntheticEuiPrior(building);
    }

    private double resolveEuiCurrent(Double providedCurrent, double resolvedPrior, Building building) {
        if (providedCurrent != null && providedCurrent >= 0) {
            return providedCurrent;
        }
        return syntheticEuiCurrent(building, resolvedPrior);
    }

    private double syntheticEuiPrior(Building building) {
        long id = building.getId() == null ? 1L : building.getId();
        return 90.0 + (id % 20);
    }

    private double syntheticEuiCurrent(Building building, double euiPrior) {
        long id = building.getId() == null ? 1L : building.getId();
        return Math.max(55.0, euiPrior - (5.0 + (id % 15)));
    }

    private double percentage(Integer part, Integer whole) {
        if (part == null || whole == null || whole <= 0) {
            return 0.0;
        }
        return (part * 100.0) / whole;
    }

    private double estimateAnnualTaxSavings(Integer totalDesks, double euiDropPct, double occupancyRatePct) {
        double desks = totalDesks == null ? 0.0 : totalDesks;
        double underutilizationFactor = Math.max(0.0, (100.0 - occupancyRatePct) / 100.0);
        double euiFactor = Math.max(0.0, euiDropPct / 100.0);

        double baselineDeskValuePerYear = 1800.0;
        double deductibleMultiplier = 2.0;

        return desks * baselineDeskValuePerYear * underutilizationFactor * (0.4 + euiFactor) * deductibleMultiplier;
    }

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private String safeDomain(String companyOrBuildingName) {
        if (companyOrBuildingName == null || companyOrBuildingName.isBlank()) {
            return "example.com";
        }

        String normalized = companyOrBuildingName.toLowerCase()
                .replace("&", "and")
                .replaceAll("[^a-z0-9 ]", " ")
                .trim()
                .replaceAll("\\s+", "");

        if (normalized.isBlank()) {
            return "example.com";
        }
        return normalized + ".com";
    }

    private String safeSlug(String input) {
        if (input == null || input.isBlank()) {
            return "corporate-real-estate";
        }
        return input.toLowerCase()
                .replace("&", "and")
                .replaceAll("[^a-z0-9 ]", " ")
                .trim()
                .replaceAll("\\s+", "-");
    }
}
