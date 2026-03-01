package com.sharedloop.demo.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sharedloop.demo.model.Listing;
import com.sharedloop.demo.repository.ListingRepository;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Matcher Agent — matches a startup's needs to available Loop office listings.
 *
 * No tool_use: directly queries the local DB + Chicago Energy API,
 * then uses Claude to score and explain each match.
 */
@Service
public class MatcherAgent {

    private static final double AVG_LOOP_OFFICE_EUI = 85.0; // kBtu/sq ft baseline

    private final ClaudeClient claude;
    private final ChicagoApiClient chicago;
    private final ListingRepository listingRepository;
    private final ObjectMapper objectMapper;

    public MatcherAgent(ClaudeClient claude,
                        ChicagoApiClient chicago,
                        ListingRepository listingRepository,
                        ObjectMapper objectMapper) {
        this.claude = claude;
        this.chicago = chicago;
        this.listingRepository = listingRepository;
        this.objectMapper = objectMapper;
    }

    /**
     * @param profile map with: company, sector, days (List<String>), people, budget
     * @return list of top-3 match maps
     */
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> match(Map<String, Object> profile) {
        List<Listing> activeListings = listingRepository.findByActiveTrue();

        if (activeListings.isEmpty()) {
            return Collections.emptyList();
        }

        // Score each listing
        List<Map<String, Object>> scored = new ArrayList<>();
        for (Listing listing : activeListings) {
            int score = computeScore(listing, profile);
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("listing_id", listing.getId());
            entry.put("building_id", listing.getBuilding().getId());
            entry.put("building_name", listing.getBuilding().getName());
            entry.put("building_address", listing.getBuilding().getAddress());
            entry.put("neighborhood", listing.getBuilding().getNeighborhood());
            entry.put("latitude", listing.getBuilding().getLatitude());
            entry.put("longitude", listing.getBuilding().getLongitude());
            entry.put("host_company", listing.getHost().getCompanyName());
            entry.put("host_industry", listing.getHost().getIndustry());
            entry.put("days_available", listing.getDaysAvailable());
            entry.put("desks_available", listing.getDesksAvailable());
            entry.put("price_per_desk_per_day", listing.getPricePerDeskPerDay());
            entry.put("floor_number", listing.getFloorNumber());
            entry.put("description", listing.getDescription());

            // Estimated monthly cost
            @SuppressWarnings("unchecked")
            List<String> profileDays = (List<String>) profile.getOrDefault("days", Collections.emptyList());
            int daysPerMonth = profileDays.size() * 4;
            int people = toInt(profile.get("people"), 1);
            double monthlyCost = listing.getPricePerDeskPerDay() * people * daysPerMonth;
            entry.put("estimated_monthly_cost", Math.round(monthlyCost));

            // EUI enrichment from Chicago API (best effort)
            double eui = fetchEui(listing.getBuilding().getName());
            entry.put("eui_score", Math.round(eui * 10.0) / 10.0);
            entry.put("avg_eui", AVG_LOOP_OFFICE_EUI);
            double euiSaving = Math.max(0, AVG_LOOP_OFFICE_EUI - eui);
            // 5000 sqft proxy for shared space, 0.000053 metric tons CO2e per kBtu
            double co2 = euiSaving * 5000 * 0.000053;
            entry.put("co2_reduction_tons_year", Math.round(co2 * 10.0) / 10.0);

            // EUI bonus: +5 pts for efficient buildings
            if (eui < AVG_LOOP_OFFICE_EUI) score = Math.min(score + 5, 95);
            entry.put("match_score", score);

            scored.add(entry);
        }

        // Sort by match_score descending, take top 3
        scored.sort((a, b) -> Integer.compare((int) b.get("match_score"), (int) a.get("match_score")));
        List<Map<String, Object>> top3 = scored.stream().limit(3).collect(Collectors.toList());

        // Ask Claude to generate natural-language explanation for each match
        return enrichWithExplanations(top3, profile);
    }

    private int computeScore(Listing listing, Map<String, Object> profile) {
        int score = 0;

        // days_match (35 pts)
        @SuppressWarnings("unchecked")
        List<String> startupDays = (List<String>) profile.getOrDefault("days", Collections.emptyList());
        if (!startupDays.isEmpty()) {
            String avail = listing.getDaysAvailable() == null ? "" : listing.getDaysAvailable().toUpperCase();
            long overlap = startupDays.stream()
                    .filter(d -> avail.contains(d.toUpperCase().substring(0, 3)))
                    .count();
            score += (int) ((double) overlap / startupDays.size() * 35);
        }

        // budget_match (25 pts)
        int people = toInt(profile.get("people"), 1);
        int budget = toInt(profile.get("budget"), Integer.MAX_VALUE);
        @SuppressWarnings("unchecked")
        List<String> days = (List<String>) profile.getOrDefault("days", Collections.emptyList());
        int daysPerMonth = days.size() * 4;
        double monthlyCost = listing.getPricePerDeskPerDay() * people * daysPerMonth;
        if (monthlyCost <= budget) score += 25;
        else if (monthlyCost <= budget * 1.2) score += 10;

        // capacity (20 pts)
        if (listing.getDesksAvailable() != null && listing.getDesksAvailable() >= people) score += 20;

        // energy_bonus (5 pts) — applied in match() after EUI is fetched from Chicago API

        return Math.min(score, 95);
    }

    private double fetchEui(String buildingName) {
        try {
            List<Map<String, Object>> data = chicago.getEnergyData(buildingName);
            for (Map<String, Object> row : data) {
                Object eui = row.get("site_eui__kbtu_sq_ft_");
                if (eui != null) return Double.parseDouble(eui.toString());
            }
        } catch (Exception ignored) {}
        // Return a plausible Loop office EUI based on name hash for demo consistency
        return 60 + (Math.abs(buildingName.hashCode()) % 50);
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> enrichWithExplanations(List<Map<String, Object>> matches,
                                                              Map<String, Object> profile) {
        String systemPrompt =
                "You are a sharp matching agent for SharedLoop. " +
                "Given a startup's profile and a list of office building matches, " +
                "write a concise 2-3 sentence explanation for why each match is good (or has caveats). " +
                "Be specific — mention the days, cost, EUI score, and neighborhood. " +
                "Return ONLY a JSON array (no markdown) of objects with fields: " +
                "listing_id (integer) and match_explanation (string).";

        String userMessage;
        try {
            userMessage = "Startup profile:\n" + objectMapper.writeValueAsString(profile) +
                          "\n\nTop matches:\n" + objectMapper.writeValueAsString(matches);
        } catch (Exception e) {
            return matches;
        }

        String result = claude.generate(systemPrompt, userMessage);

        try {
            String cleaned = cleanJson(result);
            List<Map<String, Object>> explanations =
                    objectMapper.readValue(cleaned, new TypeReference<List<Map<String, Object>>>() {});

            // Merge explanations back into matches
            Map<Object, String> explMap = new HashMap<>();
            for (Map<String, Object> ex : explanations) {
                explMap.put(ex.get("listing_id"), (String) ex.getOrDefault("match_explanation", ""));
            }
            for (Map<String, Object> m : matches) {
                Object id = m.get("listing_id");
                m.put("match_explanation", explMap.getOrDefault(id, "Great match for your team's needs."));
            }
        } catch (Exception ignored) {
            matches.forEach(m -> m.putIfAbsent("match_explanation", buildFallbackExplanation(m)));
        }

        return matches;
    }

    private String buildFallbackExplanation(Map<String, Object> m) {
        String name         = String.valueOf(m.getOrDefault("building_name", "This building"));
        String neighborhood = String.valueOf(m.getOrDefault("neighborhood", "the Loop"));
        int    score        = toInt(m.get("match_score"), 0);
        String days         = String.valueOf(m.getOrDefault("days_available", "")).replace(",", ", ");
        Object costObj      = m.get("estimated_monthly_cost");
        Object euiObj       = m.get("eui_score");

        String costStr = (costObj != null)
                ? String.format("$%,d/month", ((Number) costObj).longValue())
                : "within budget";
        String euiStr  = (euiObj != null)
                ? String.format("%.1f kBtu/sqft (Loop avg %.0f)", ((Number) euiObj).doubleValue(), AVG_LOOP_OFFICE_EUI)
                : null;

        StringBuilder sb = new StringBuilder();
        sb.append(name).append(" in ").append(neighborhood)
          .append(" scores ").append(score).append("/95 for your requirements.");
        if (!days.isBlank()) sb.append(" Available on ").append(days).append(".");
        sb.append(" Estimated cost: ").append(costStr).append(".");
        if (euiStr != null) sb.append(" Site EUI: ").append(euiStr).append(".");
        return sb.toString();
    }

    private int toInt(Object val, int defaultVal) {
        if (val == null) return defaultVal;
        try { return Integer.parseInt(val.toString()); }
        catch (NumberFormatException e) { return defaultVal; }
    }

    private String cleanJson(String text) {
        if (text == null) return "[]";
        text = text.trim();
        if (text.startsWith("```")) {
            int start = text.indexOf('\n') + 1;
            int end = text.lastIndexOf("```");
            if (end > start) text = text.substring(start, end).trim();
        }
        return text;
    }
}
