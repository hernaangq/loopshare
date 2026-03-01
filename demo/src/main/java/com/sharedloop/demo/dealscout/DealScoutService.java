package com.sharedloop.demo.dealscout;

import com.sharedloop.demo.model.Building;
import com.sharedloop.demo.model.Host;
import com.sharedloop.demo.model.Listing;
import com.sharedloop.demo.repository.BuildingRepository;
import com.sharedloop.demo.repository.HostRepository;
import com.sharedloop.demo.repository.ListingRepository;
import com.sharedloop.demo.service.ChicagoApiClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
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
    private final ChicagoApiClient chicagoApiClient;

    private final Map<String, DealScoutRunResponse> runHistory = new ConcurrentHashMap<>();

    public DealScoutService(BuildingRepository buildingRepository,
                            HostRepository hostRepository,
                            ListingRepository listingRepository,
                            DealScoutLlmService llmService,
                            EnrichmentService enrichmentService,
                            ChicagoApiClient chicagoApiClient) {
        this.buildingRepository = buildingRepository;
        this.hostRepository = hostRepository;
        this.listingRepository = listingRepository;
        this.llmService = llmService;
        this.enrichmentService = enrichmentService;
        this.chicagoApiClient = chicagoApiClient;
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

    public List<Map<String, Object>> getLicenseCompanies(String buildingName,
                                                         String buildingAddress,
                                                         Double latitude,
                                                         Double longitude,
                                                         String dataset,
                                                         Boolean includeLocal,
                                                         Integer limit) {
        int cappedLimit = limit == null ? 8 : Math.max(1, Math.min(limit, 20));
        String activeDataset = "uupf-x98q";
        List<String> queryVariants = buildLicenseQueryVariants(buildingName, buildingAddress);

        List<Map<String, Object>> selectedRows = withDatasetTag(
                chicagoApiClient.getLicensesByDatasetAndAddressVariants(activeDataset, queryVariants, 120),
                activeDataset
        );

        String normalizedTarget = normalizeAddressForMatch(buildingAddress);
        String targetStreetKey = extractStreetKey(normalizedTarget);
        String normalizedBuildingName = normalizeText(buildingName);

        Building localBuilding = Boolean.TRUE.equals(includeLocal)
            ? findBestLocalBuilding(buildingName, buildingAddress, latitude, longitude)
            : null;

        LinkedHashSet<String> seen = new LinkedHashSet<>();
        Set<String> seenLicenseRows = new LinkedHashSet<>();
        List<Map<String, Object>> companies = new ArrayList<>();

        if (localBuilding != null) {
            for (Host host : hostRepository.findByBuildingId(localBuilding.getId())) {
                if (host.getCompanyName() == null || host.getCompanyName().isBlank()) {
                    continue;
                }
                String normalized = host.getCompanyName().toLowerCase(Locale.ROOT).trim();
                if (normalized.isBlank() || seen.contains(normalized)) {
                    continue;
                }
                seen.add(normalized);

                Map<String, Object> company = new LinkedHashMap<>();
                company.put("companyName", host.getCompanyName());
                company.put("licenseStatus", "LOCAL_HOST");
                company.put("licenseNumber", null);
                company.put("address", localBuilding.getAddress());
                company.put("latitude", localBuilding.getLatitude());
                company.put("longitude", localBuilding.getLongitude());
                company.put("sourceDataset", "local-data-sql");
                companies.add(company);

                if (companies.size() >= cappedLimit) {
                    return companies;
                }
            }
        }

        for (Map<String, Object> row : selectedRows) {
            String rowId = firstNonBlank(row.get("id"), row.get("license_id"), row.get("license_number"));
            if (rowId != null && !seenLicenseRows.add(rowId)) {
                continue;
            }

            if (!rowMatchesBuilding(row, latitude, longitude, normalizedTarget, targetStreetKey, normalizedBuildingName)) {
            continue;
            }

            String companyName = firstNonBlank(
                    row.get("doing_business_as_name"),
                    row.get("legal_name"),
                    row.get("dba_name"),
                    row.get("business_name")
            );
            if (companyName == null) {
                continue;
            }

            String normalized = companyName.toLowerCase(Locale.ROOT).trim();
            if (normalized.isBlank() || seen.contains(normalized)) {
                continue;
            }
            seen.add(normalized);

            Map<String, Object> company = new LinkedHashMap<>();
            company.put("companyName", companyName);
            company.put("licenseStatus", firstNonBlank(row.get("license_status"), row.get("status")));
            company.put("licenseNumber", firstNonBlank(row.get("license_number"), row.get("account_number")));
            company.put("address", firstNonBlank(row.get("address"), row.get("street_address"), row.get("site_address")));
            company.put("latitude", firstNonBlank(row.get("latitude"), row.get("lat")));
            company.put("longitude", firstNonBlank(row.get("longitude"), row.get("lon"), row.get("lng")));
            company.put("sourceDataset", firstNonBlank(row.get("_sourceDataset"), activeDataset));
            companies.add(company);

            if (companies.size() >= cappedLimit) {
                break;
            }
        }

        return companies;
    }

    private Building findBestLocalBuilding(String buildingName,
                                           String buildingAddress,
                                           Double latitude,
                                           Double longitude) {
        List<Building> candidates = buildingRepository.findAll();
        if (candidates.isEmpty()) {
            return null;
        }

        Building best = null;
        double bestScore = -1.0;
        String normalizedAddress = normalizeAddressForMatch(buildingAddress);
        String normalizedName = normalizeText(buildingName);

        for (Building candidate : candidates) {
            double score = 0.0;

            if (latitude != null && longitude != null && candidate.getLatitude() != null && candidate.getLongitude() != null) {
                double distance = haversineMeters(latitude, longitude, candidate.getLatitude(), candidate.getLongitude());
                if (distance <= 150.0) {
                    score += 4.0;
                } else if (distance <= 300.0) {
                    score += 2.0;
                }
            }

            String candidateAddress = normalizeAddressForMatch(candidate.getAddress());
            if (!normalizedAddress.isBlank() && !candidateAddress.isBlank() && isLooseAddressMatch(normalizedAddress, candidateAddress)) {
                score += 3.0;
            }

            String candidateName = normalizeText(candidate.getName());
            if (!normalizedName.isBlank() && !candidateName.isBlank()) {
                if (candidateName.contains(normalizedName) || normalizedName.contains(candidateName)) {
                    score += 2.0;
                }
            }

            if (score > bestScore) {
                bestScore = score;
                best = candidate;
            }
        }

        return bestScore >= 2.0 ? best : null;
    }

    public Map<String, Object> generateCompanyProposal(String buildingName,
                                                       String buildingAddress,
                                                       String companyName) {
        String safeBuildingName = (buildingName == null || buildingName.isBlank()) ? "Chicago Loop Building" : buildingName;
        String safeAddress = (buildingAddress == null || buildingAddress.isBlank()) ? "Chicago Loop" : buildingAddress;
        String safeCompanyName = (companyName == null || companyName.isBlank()) ? (safeBuildingName + " Tenant") : companyName;

        int seed = Math.abs((safeBuildingName + "|" + safeCompanyName).hashCode());
        double euiDropPct = 6.0 + (seed % 12);
        double estimatedSavings = 65000.0 + (seed % 180000);

        DealScoutLlmService.DraftResult draft = llmService.draftEmail(
                new DealScoutLlmService.EmailContext(
                        safeBuildingName,
                        safeAddress,
                        "Corporate Real Estate Lead",
                        safeCompanyName,
                        round(euiDropPct),
                        round(estimatedSavings)
                )
        );

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("to", "realestate@" + safeDomain(safeCompanyName));
        result.put("subject", draft.subject);
        result.put("body", draft.body);
        result.put("companyName", safeCompanyName);
        result.put("buildingName", safeBuildingName);
        return result;
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

    private List<String> buildLicenseQueryVariants(String buildingName, String buildingAddress) {
        LinkedHashSet<String> variants = new LinkedHashSet<>();
        String rawAddress = buildingAddress == null ? "" : buildingAddress.trim();
        String rawName = buildingName == null ? "" : buildingName.trim();

        if (!rawAddress.isBlank()) {
            String upperAddress = rawAddress.toUpperCase(Locale.ROOT);
            String abbreviated = abbreviateAddress(upperAddress);
            String expanded = expandAddress(upperAddress);

            variants.add(rawAddress);
            variants.add(upperAddress);
            variants.add(abbreviated);
            variants.add(expanded);

            String abbreviatedStreetKey = extractStreetKey(normalizeAddressForMatch(abbreviated));
            if (!abbreviatedStreetKey.isBlank()) {
                variants.add(abbreviatedStreetKey);
            }

            String looseCore = coreAddress(normalizeAddressForMatch(rawAddress));
            if (!looseCore.isBlank()) {
                variants.add(looseCore);
            }

            String rootKey = addressRootKey(rawAddress);
            if (!rootKey.isBlank()) {
                variants.add(rootKey);
            }
        }

        if (!rawName.isBlank()) {
            variants.add(rawName);
            variants.add(rawName.toUpperCase(Locale.ROOT));
        }

        return new ArrayList<>(variants);
    }

    private boolean hasLicenseRows(List<Map<String, Object>> rows) {
        if (rows == null || rows.isEmpty()) {
            return false;
        }
        if (rows.size() == 1 && rows.get(0).containsKey("error")) {
            return false;
        }
        return true;
    }

    private boolean rowMatchesBuilding(Map<String, Object> row,
                                       Double targetLatitude,
                                       Double targetLongitude,
                                       String normalizedTargetAddress,
                                       String targetStreetKey,
                                       String normalizedBuildingName) {
        String rowAddress = firstNonBlank(
                row.get("address"),
                row.get("street_address"),
                row.get("site_address"),
                row.get("business_address")
        );

        String normalizedRowAddress = normalizeAddressForMatch(rowAddress);
        if (!normalizedTargetAddress.isBlank() && !normalizedRowAddress.isBlank()) {
            if (isLooseAddressMatch(normalizedTargetAddress, normalizedRowAddress)) {
                return true;
            }

            String leftRoot = addressRootKey(normalizedTargetAddress);
            String rightRoot = addressRootKey(normalizedRowAddress);
            if (!leftRoot.isBlank() && !rightRoot.isBlank() && (leftRoot.contains(rightRoot) || rightRoot.contains(leftRoot))) {
                return true;
            }

            String rowStreetKey = extractStreetKey(normalizedRowAddress);
            if (!targetStreetKey.isBlank() && !rowStreetKey.isBlank() && isLooseAddressMatch(targetStreetKey, rowStreetKey)) {
                return true;
            }
        }

        Double rowLatitude = parseDouble(firstNonBlank(row.get("latitude"), row.get("lat")));
        Double rowLongitude = parseDouble(firstNonBlank(row.get("longitude"), row.get("lon"), row.get("lng")));

        if (targetLatitude != null && targetLongitude != null && rowLatitude != null && rowLongitude != null) {
            double distanceMeters = haversineMeters(targetLatitude, targetLongitude, rowLatitude, rowLongitude);
            if (distanceMeters <= 220.0) {
                return true;
            }
        }

        if (!normalizedBuildingName.isBlank()) {
            String companyName = normalizeText(firstNonBlank(
                    row.get("doing_business_as_name"),
                    row.get("legal_name"),
                    row.get("dba_name"),
                    row.get("business_name")
            ));
            if (!companyName.isBlank() && companyName.contains(normalizedBuildingName)) {
                return true;
            }
        }

        return normalizedTargetAddress.isBlank() && normalizedBuildingName.isBlank();
    }

    private List<Map<String, Object>> withDatasetTag(List<Map<String, Object>> rows, String datasetId) {
        List<Map<String, Object>> tagged = new ArrayList<>();
        if (!hasLicenseRows(rows)) {
            return tagged;
        }

        for (Map<String, Object> row : rows) {
            Map<String, Object> copy = new LinkedHashMap<>(row);
            copy.put("_sourceDataset", datasetId);
            tagged.add(copy);
        }
        return tagged;
    }

    private Double parseDouble(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Double.parseDouble(value.trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private double haversineMeters(double lat1, double lon1, double lat2, double lon2) {
        double r = 6371000.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return r * c;
    }

    private String normalizeAddressForMatch(String address) {
        if (address == null || address.isBlank()) {
            return "";
        }

        String upper = address.toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9 ]", " ").replaceAll("\\s+", " ").trim();
        upper = upper
                .replace(" CHICAGO ", " ")
                .replace(" ILLINOIS ", " IL ")
                .replaceAll("\\bIL\\b", " ")
                .replaceAll("\\bUSA\\b", " ")
                .replaceAll("\\bUNIT\\b", " ")
                .replaceAll("\\bSUITE\\b", " STE ")
                .replaceAll("\\bFLOOR\\b", " FL ")
                .replaceAll("\\bROOM\\b", " RM ")
                .replaceAll("\\b\\d{5}(?:-\\d{4})?\\b", " ")
                .replaceAll("\\s+", " ")
                .trim();
        String abbreviated = abbreviateAddress(upper);
        return abbreviated.replaceAll("\\s+", " ").trim();
    }

    private boolean isLooseAddressMatch(String left, String right) {
        if (left == null || right == null || left.isBlank() || right.isBlank()) {
            return false;
        }

        if (left.contains(right) || right.contains(left)) {
            return true;
        }

        String leftCore = coreAddress(left);
        String rightCore = coreAddress(right);
        if (!leftCore.isBlank() && !rightCore.isBlank()) {
            if (leftCore.equals(rightCore) || leftCore.contains(rightCore) || rightCore.contains(leftCore)) {
                return true;
            }
        }

        String leftRoot = addressRootKey(leftCore);
        String rightRoot = addressRootKey(rightCore);
        if (!leftRoot.isBlank() && !rightRoot.isBlank()) {
            if (leftRoot.equals(rightRoot) || leftRoot.contains(rightRoot) || rightRoot.contains(leftRoot)) {
                return true;
            }
        }

        List<String> leftTokens = tokenizedAddress(leftCore);
        List<String> rightTokens = tokenizedAddress(rightCore);
        if (leftTokens.isEmpty() || rightTokens.isEmpty()) {
            return false;
        }

        String leftNumber = leftTokens.get(0).matches("\\d+") ? leftTokens.get(0) : "";
        String rightNumber = rightTokens.get(0).matches("\\d+") ? rightTokens.get(0) : "";
        if (!leftNumber.isBlank() && !rightNumber.isBlank() && !Objects.equals(leftNumber, rightNumber)) {
            return false;
        }

        int overlap = 0;
        for (String token : leftTokens) {
            if (rightTokens.contains(token)) {
                overlap++;
            }
        }
        return overlap >= 2;
    }

    private String coreAddress(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }

        String normalized = value.replaceAll("\\b(?:STE|SUITE|FL|FLOOR|RM|ROOM)\\b.*$", " ")
                .replaceAll("\\s+", " ")
                .trim();

        List<String> tokens = tokenizedAddress(normalized);
        if (tokens.size() >= 4) {
            return String.join(" ", tokens.subList(0, 4));
        }
        return String.join(" ", tokens);
    }

    private List<String> tokenizedAddress(String value) {
        if (value == null || value.isBlank()) {
            return List.of();
        }
        return Arrays.stream(value.split(" "))
                .filter(token -> token != null && !token.isBlank())
                .collect(Collectors.toList());
    }

    private String addressRootKey(String value) {
        String normalized = normalizeAddressForMatch(value);
        if (normalized.isBlank()) {
            return "";
        }

        List<String> tokens = tokenizedAddress(normalized);
        if (tokens.isEmpty()) {
            return "";
        }

        List<String> ignored = List.of("N", "S", "E", "W", "DR", "ST", "AVE", "BLVD", "PL", "RD", "CT", "PLZ", "PKWY", "STE", "FL", "RM");
        List<String> kept = new ArrayList<>();
        for (String token : tokens) {
            if (ignored.contains(token)) {
                continue;
            }
            if (token.matches("\\d{5}")) {
                continue;
            }
            kept.add(token);
        }

        if (kept.isEmpty()) {
            return "";
        }

        if (kept.size() >= 3) {
            return String.join(" ", kept.subList(0, 3));
        }
        return String.join(" ", kept);
    }

    private String abbreviateAddress(String text) {
        String normalized = " " + text + " ";
        normalized = normalized.replace(" NORTH ", " N ")
                .replace(" SOUTH ", " S ")
                .replace(" EAST ", " E ")
                .replace(" WEST ", " W ")
                .replace(" DRIVE ", " DR ")
                .replace(" STREET ", " ST ")
                .replace(" AVENUE ", " AVE ")
                .replace(" BOULEVARD ", " BLVD ")
                .replace(" PLACE ", " PL ")
                .replace(" ROAD ", " RD ")
                .replace(" COURT ", " CT ")
                .replace(" PLAZA ", " PLZ ")
                .replace(" PARKWAY ", " PKWY ")
                .replace(" SUITE ", " STE ");
        return normalized.trim();
    }

    private String expandAddress(String text) {
        String normalized = " " + text + " ";
        normalized = normalized.replace(" N ", " NORTH ")
                .replace(" S ", " SOUTH ")
                .replace(" E ", " EAST ")
                .replace(" W ", " WEST ")
                .replace(" DR ", " DRIVE ")
                .replace(" ST ", " STREET ")
                .replace(" AVE ", " AVENUE ")
                .replace(" BLVD ", " BOULEVARD ")
                .replace(" PL ", " PLACE ")
                .replace(" RD ", " ROAD ")
                .replace(" CT ", " COURT ")
                .replace(" PLZ ", " PLAZA ")
                .replace(" PKWY ", " PARKWAY ")
                .replace(" STE ", " SUITE ");
        return normalized.trim();
    }

    private String extractStreetKey(String normalizedAddress) {
        if (normalizedAddress == null || normalizedAddress.isBlank()) {
            return "";
        }

        List<String> tokens = new ArrayList<>(Arrays.asList(normalizedAddress.split(" ")));
        if (tokens.isEmpty()) {
            return "";
        }

        if (!tokens.isEmpty() && tokens.get(tokens.size() - 1).matches("[A-Z]{2,4}")) {
            tokens.remove(tokens.size() - 1);
        }

        if (tokens.size() >= 3) {
            return String.join(" ", tokens.subList(0, 3));
        }
        return String.join(" ", tokens);
    }

    private String normalizeText(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        return value.toUpperCase(Locale.ROOT)
                .replaceAll("[^A-Z0-9 ]", " ")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private String firstNonBlank(Object... values) {
        for (Object value : values) {
            if (value == null) {
                continue;
            }
            String str = String.valueOf(value).trim();
            if (!str.isBlank()) {
                return str;
            }
        }
        return null;
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
