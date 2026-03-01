package com.sharedloop.demo.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Analyst Agent — analyzes a building to produce an underutilization report.
 *
 * Tools: get_energy_data, get_violations, get_cta_ridership
 * Output: JSON with eui_score, violation_count, underutilization_score (0-100),
 *         occupancy_proxy, recommendation
 */
@Service
public class AnalystAgent {

    private static final String SYSTEM_PROMPT =
            "You are an expert building analyst for Chicago's Loop district. " +
            "Your job is to analyze office buildings to determine if they are underutilized " +
            "and suitable for desk-sharing arrangements under the SharedLoop marketplace.\n\n" +
            "Use the available tools to gather real data from Chicago's Open Data Portal. " +
            "After gathering data, return ONLY a valid JSON object (no markdown, no explanation) with these fields:\n" +
            "- eui_score: number (Energy Use Intensity in kBtu/sq ft, null if unavailable)\n" +
            "- avg_eui_for_type: number (average EUI for this building type in the Loop)\n" +
            "- violation_count: integer (building code violations in the last 3 years)\n" +
            "- underutilization_score: integer 0-100 (higher = more likely underutilized)\n" +
            "- occupancy_proxy: string (e.g. 'Low', 'Medium', 'High')\n" +
            "- estimated_monthly_savings: number (estimated $ savings a startup could get per month)\n" +
            "- co2_reduction_tons_year: number (metric tons CO2e/year if 5000 sqft shared)\n" +
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
            // Claude might wrap JSON in markdown — strip it
            String cleaned = cleanJson(result);
            return objectMapper.readValue(cleaned, new com.fasterxml.jackson.core.type.TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            Map<String, Object> fallback = new LinkedHashMap<>();
            fallback.put("raw", result);
            fallback.put("error", "Could not parse agent response: " + e.getMessage());
            return fallback;
        }
    }

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

    private List<Map<String, Object>> buildTools() {
        List<Map<String, Object>> tools = new ArrayList<>();

        // Tool 1: Energy data
        Map<String, Object> energyTool = new LinkedHashMap<>();
        energyTool.put("name", "get_energy_data");
        energyTool.put("description", "Get energy benchmarking data from Chicago's Open Data Portal for a Loop building. Returns EUI (Energy Use Intensity), ENERGY STAR score, and GHG emissions.");
        Map<String, Object> energyInput = new LinkedHashMap<>();
        energyInput.put("type", "object");
        energyInput.put("properties", Map.of(
                "property_name", Map.of("type", "string", "description", "Name of the property to search for")
        ));
        energyInput.put("required", List.of("property_name"));
        energyTool.put("input_schema", energyInput);
        tools.add(energyTool);

        // Tool 2: Violations
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

        // Tool 3: CTA ridership
        Map<String, Object> ctaTool = new LinkedHashMap<>();
        ctaTool.put("name", "get_cta_ridership");
        ctaTool.put("description", "Get CTA transit ridership data for context on Loop activity levels.");
        Map<String, Object> ctaInput = new LinkedHashMap<>();
        ctaInput.put("type", "object");
        ctaInput.put("properties", Collections.emptyMap());
        ctaInput.put("required", Collections.emptyList());
        ctaTool.put("input_schema", ctaInput);
        tools.add(ctaTool);

        return tools;
    }

    private String cleanJson(String text) {
        if (text == null) return "{}";
        text = text.trim();
        // Strip markdown code fences
        if (text.startsWith("```")) {
            int start = text.indexOf('\n') + 1;
            int end = text.lastIndexOf("```");
            if (end > start) text = text.substring(start, end).trim();
        }
        return text;
    }
}
