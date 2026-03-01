package com.sharedloop.demo.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Analyst Agent — analyzes a building to produce a multi-dimension opportunity report.
 *
 * Tools: get_energy_data, get_violations, get_cta_ridership
 *
 * Output includes the 5-dimension scoring system:
 *   energy_score (0-20), compliance_score (0-20), accessibility_score (0-20),
 *   space_potential_score (0-20), financial_score (0-20)
 *   → opportunity_score (0-100) = sum, tier = label
 */
@Service
public class AnalystAgent {

    private static final String SYSTEM_PROMPT =
            "You are an expert building analyst for Chicago's Loop district. " +
            "Your job is to analyze office buildings to determine if they are underutilized " +
            "and suitable for desk-sharing arrangements under the SharedLoop marketplace.\n\n" +
            "Use the available tools to gather real data from Chicago's Open Data Portal. " +
            "After gathering data, return ONLY a valid JSON object (no markdown, no explanation) with these fields:\n" +
            "- eui_score: number (Energy Use Intensity in kBtu/sq ft)\n" +
            "- avg_eui_for_type: number (average EUI for Loop offices, typically 85)\n" +
            "- violation_count: integer (building code violations found)\n" +
            "- underutilization_score: integer 0-100 (higher = more likely underutilized)\n" +
            "- occupancy_proxy: string ('Low', 'Medium', or 'High')\n" +
            "- estimated_monthly_savings: number (estimated $ savings per month for a startup)\n" +
            "- co2_reduction_tons_year: number (metric tons CO2e/year if 5000 sqft shared)\n" +
            "- energy_score: integer 0-20  (((avg_eui - eui_score) / avg_eui) * 20, clamped 0-20)\n" +
            "- compliance_score: integer 0-20  (20=0 violations, 14=1-2, 8=3-5, 0=6+)\n" +
            "- accessibility_score: integer 0-20  (higher CTA ridership near building = higher score)\n" +
            "- space_potential_score: integer 0-20  (larger gross floor area = higher score)\n" +
            "- financial_score: integer 0-20  (>2000 savings=20, 1000-2000=14, 500-1000=8, <500=4)\n" +
            "- opportunity_score: integer 0-100  (sum of all 5 dimension scores)\n" +
            "- tier: string  ('Prime Target' 90-100, 'Strong Match' 70-89, 'Potential' 50-69, 'Review Needed' <50)\n" +
            "- recommendation: string (1-2 sentences on suitability for desk sharing)";

    private final ClaudeClient claude;
    private final ChicagoApiClient chicago;
    private final ObjectMapper objectMapper;

    public AnalystAgent(ClaudeClient claude, ChicagoApiClient chicago, ObjectMapper objectMapper) {
        this.claude = claude;
        this.chicago = chicago;
        this.objectMapper = objectMapper;
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> analyze(String propertyName, String address) {
        List<Map<String, Object>> tools = buildTools();

        String userMessage = String.format(
                "Analyze this Chicago Loop office building for desk-sharing potential:\n" +
                "Property Name: %s\nAddress: %s\n\n" +
                "Call the available tools to get energy data, violations, and CTA ridership context, " +
                "then return the JSON report.",
                propertyName, address);

        String result = claude.runAgentLoop(SYSTEM_PROMPT, userMessage, tools, this::handleTool);

        try {
            String cleaned = cleanJson(result);
            Map<String, Object> parsed = objectMapper.readValue(cleaned,
                    new com.fasterxml.jackson.core.type.TypeReference<Map<String, Object>>() {});
            // If the LLM returned an error payload instead of analysis data, fall back
            if (parsed.containsKey("error") && !parsed.containsKey("eui_score")) {
                return computeDeterministicAnalysis(propertyName, address);
            }
            // Ensure 5-dimension scores are present (compute if LLM omitted them)
            if (!parsed.containsKey("opportunity_score")) {
                double parsedEui      = toDoubleVal(parsed.get("eui_score"), 75.0);
                int    parsedViol     = (int) toLongVal(parsed.get("violation_count"), 0L);
                long   parsedSavings  = toLongVal(parsed.get("estimated_monthly_savings"), 0L);
                addDimensionScores(parsed, parsedEui, 85.0, parsedViol, 0L, 0L, parsedSavings);
            }
            return parsed;
        } catch (Exception e) {
            return computeDeterministicAnalysis(propertyName, address);
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Deterministic fallback — no LLM required
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Calls Chicago Open Data APIs directly and computes all analysis fields
     * (including the 5-dimension scores) without the LLM.
     */
    private Map<String, Object> computeDeterministicAnalysis(String propertyName, String address) {
        Map<String, Object> result = new LinkedHashMap<>();

        // ── Energy data from Chicago Benchmarking API ──
        double eui = 60 + (Math.abs(propertyName.hashCode()) % 50); // hash-based default
        long grossFloorArea = 0;
        try {
            List<Map<String, Object>> energyData = chicago.getEnergyData(propertyName);
            for (Map<String, Object> row : energyData) {
                Object euiVal = row.get("site_eui__kbtu_sq_ft_");
                Object gfaVal = row.get("gross_floor_area__sq_ft_");
                if (euiVal != null) eui = Double.parseDouble(euiVal.toString());
                if (gfaVal != null) {
                    try {
                        grossFloorArea = (long) Double.parseDouble(
                                gfaVal.toString().replace(",", ""));
                    } catch (Exception ignored2) {}
                }
                if (euiVal != null) break;
            }
        } catch (Exception ignored) {}

        double avgEui = 85.0;
        result.put("eui_score", Math.round(eui * 10.0) / 10.0);
        result.put("avg_eui_for_type", avgEui);

        // ── Violations ──
        int violationCount = 0;
        try {
            List<Map<String, Object>> violations = chicago.getViolations(address);
            violationCount = violations.size();
        } catch (Exception ignored) {}
        result.put("violation_count", violationCount);

        // ── CTA ridership ──
        long ctaTotalRides = 0;
        try {
            List<Map<String, Object>> ctaData = chicago.getCtaRidership();
            if (!ctaData.isEmpty()) {
                Object rides = ctaData.get(0).get("total_rides");
                if (rides != null) ctaTotalRides = (long) Double.parseDouble(rides.toString());
            }
        } catch (Exception ignored) {}

        // ── Derived legacy metrics (kept for backward compat) ──
        int underutilizationScore = (int) Math.min(100, Math.max(0, 50 + (avgEui - eui) * 0.5));
        result.put("underutilization_score", underutilizationScore);
        result.put("occupancy_proxy",
                underutilizationScore > 60 ? "Low" : underutilizationScore > 40 ? "Medium" : "High");

        double euiSaving = Math.max(0, avgEui - eui);
        double co2 = euiSaving * 5000 * 0.000053;
        result.put("co2_reduction_tons_year", Math.round(co2 * 10.0) / 10.0);
        long estimatedMonthlySavings = Math.round(euiSaving * 50);
        result.put("estimated_monthly_savings", estimatedMonthlySavings);

        String suitability = underutilizationScore > 50
                ? "Suitable candidate for desk-sharing."
                : "Review compliance records before proceeding.";
        result.put("recommendation", String.format(
                "%s has a site EUI of %.1f kBtu/sqft vs Loop avg %.0f. %d violation(s) on record. %s",
                propertyName, eui, avgEui, violationCount, suitability));

        // ── 5-dimension opportunity scoring ──
        addDimensionScores(result, eui, avgEui, violationCount,
                grossFloorArea, ctaTotalRides, estimatedMonthlySavings);

        return result;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 5-dimension scoring
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Computes the 5-dimension opportunity score and writes all dimension
     * fields plus opportunity_score and tier into the result map.
     */
    private void addDimensionScores(Map<String, Object> result,
                                     double eui, double avgEui,
                                     int violationCount,
                                     long grossFloorArea,
                                     long ctaTotalRides,
                                     long estimatedMonthlySavings) {

        // 1. energy_score (0-20): efficiency vs Loop average
        int energyScore = (int) Math.max(0, Math.min(20,
                ((avgEui - eui) / avgEui) * 20));

        // 2. compliance_score (0-20): building violations
        int complianceScore;
        if      (violationCount == 0) complianceScore = 20;
        else if (violationCount <= 2) complianceScore = 14;
        else if (violationCount <= 5) complianceScore = 8;
        else                          complianceScore = 0;

        // 3. accessibility_score (0-20): CTA daily boardings proxy
        int accessibilityScore;
        if      (ctaTotalRides > 800_000) accessibilityScore = 20;
        else if (ctaTotalRides > 600_000) accessibilityScore = 16;
        else if (ctaTotalRides > 400_000) accessibilityScore = 12;
        else if (ctaTotalRides > 0)       accessibilityScore = 8;
        else                              accessibilityScore = 14; // Loop default

        // 4. space_potential_score (0-20): gross floor area
        int spacePotentialScore;
        if      (grossFloorArea > 500_000) spacePotentialScore = 20;
        else if (grossFloorArea > 200_000) spacePotentialScore = 15;
        else if (grossFloorArea > 100_000) spacePotentialScore = 10;
        else if (grossFloorArea > 50_000)  spacePotentialScore = 6;
        else if (grossFloorArea > 0)       spacePotentialScore = 3;
        else                               spacePotentialScore = 10; // default

        // 5. financial_score (0-20): estimated monthly savings
        int financialScore;
        if      (estimatedMonthlySavings > 2000) financialScore = 20;
        else if (estimatedMonthlySavings >= 1000) financialScore = 14;
        else if (estimatedMonthlySavings >= 500)  financialScore = 8;
        else                                      financialScore = 4;

        int opportunityScore = energyScore + complianceScore + accessibilityScore
                             + spacePotentialScore + financialScore;

        String tier;
        if      (opportunityScore >= 90) tier = "Prime Target";
        else if (opportunityScore >= 70) tier = "Strong Match";
        else if (opportunityScore >= 50) tier = "Potential";
        else                             tier = "Review Needed";

        result.put("energy_score",          energyScore);
        result.put("compliance_score",      complianceScore);
        result.put("accessibility_score",   accessibilityScore);
        result.put("space_potential_score", spacePotentialScore);
        result.put("financial_score",       financialScore);
        result.put("opportunity_score",     opportunityScore);
        result.put("tier",                  tier);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Tool handler
    // ──────────────────────────────────────────────────────────────────────────

    private String handleTool(String toolName, Map<String, Object> input) {
        try {
            switch (toolName) {
                case "get_energy_data": {
                    String name = (String) input.getOrDefault("property_name", "");
                    List<Map<String, Object>> data = chicago.getEnergyData(name);
                    return objectMapper.writeValueAsString(data);
                }
                case "get_violations": {
                    String addr = (String) input.getOrDefault("address", "");
                    List<Map<String, Object>> data = chicago.getViolations(addr);
                    return objectMapper.writeValueAsString(data);
                }
                case "get_cta_ridership": {
                    List<Map<String, Object>> data = chicago.getCtaRidership();
                    return objectMapper.writeValueAsString(data);
                }
                default:
                    return "{\"error\": \"Unknown tool: " + toolName + "\"}";
            }
        } catch (Exception e) {
            return "{\"error\": \"" + e.getMessage() + "\"}";
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Tool definitions
    // ──────────────────────────────────────────────────────────────────────────

    private List<Map<String, Object>> buildTools() {
        List<Map<String, Object>> tools = new ArrayList<>();

        Map<String, Object> energyTool = new LinkedHashMap<>();
        energyTool.put("name", "get_energy_data");
        energyTool.put("description", "Get energy benchmarking data from Chicago's Open Data Portal. Returns EUI, gross floor area, ENERGY STAR score, GHG emissions.");
        Map<String, Object> energyInput = new LinkedHashMap<>();
        energyInput.put("type", "object");
        energyInput.put("properties", Map.of(
                "property_name", Map.of("type", "string", "description", "Name of the property to search for")
        ));
        energyInput.put("required", List.of("property_name"));
        energyTool.put("input_schema", energyInput);
        tools.add(energyTool);

        Map<String, Object> violationsTool = new LinkedHashMap<>();
        violationsTool.put("name", "get_violations");
        violationsTool.put("description", "Get building code violations from Chicago's Open Data Portal for an address.");
        Map<String, Object> violationsInput = new LinkedHashMap<>();
        violationsInput.put("type", "object");
        violationsInput.put("properties", Map.of(
                "address", Map.of("type", "string", "description", "Street address of the building")
        ));
        violationsInput.put("required", List.of("address"));
        violationsTool.put("input_schema", violationsInput);
        tools.add(violationsTool);

        Map<String, Object> ctaTool = new LinkedHashMap<>();
        ctaTool.put("name", "get_cta_ridership");
        ctaTool.put("description", "Get CTA transit ridership data for context on Loop accessibility levels.");
        Map<String, Object> ctaInput = new LinkedHashMap<>();
        ctaInput.put("type", "object");
        ctaInput.put("properties", Collections.emptyMap());
        ctaInput.put("required", Collections.emptyList());
        ctaTool.put("input_schema", ctaInput);
        tools.add(ctaTool);

        return tools;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Helpers
    // ──────────────────────────────────────────────────────────────────────────

    private double toDoubleVal(Object val, double defaultVal) {
        if (val == null) return defaultVal;
        try { return Double.parseDouble(val.toString()); } catch (Exception e) { return defaultVal; }
    }

    private long toLongVal(Object val, long defaultVal) {
        if (val == null) return defaultVal;
        try { return (long) Double.parseDouble(val.toString()); } catch (Exception e) { return defaultVal; }
    }

    private String cleanJson(String text) {
        if (text == null) return "{}";
        text = text.trim();
        if (text.startsWith("```")) {
            int start = text.indexOf('\n') + 1;
            int end = text.lastIndexOf("```");
            if (end > start) text = text.substring(start, end).trim();
        }
        return text;
    }
}
