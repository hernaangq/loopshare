package com.sharedloop.demo.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Risk Agent — scores the risk for both the corporation and the startup.
 *
 * Tools: get_business_licenses, get_violations
 * Output: JSON with corporate_risk (0-100), startup_risk (0-100), explanation
 */
@Service
public class RiskAgent {

    private static final String SYSTEM_PROMPT =
            "You are a risk assessment specialist for SharedLoop, a desk-sharing marketplace " +
            "in Chicago's Loop district. Assess the risk of a deal between a corporation " +
            "(the host) and a startup (the tenant).\n\n" +
            "Use the available tools to check business licenses and building violations. " +
            "Return ONLY a valid JSON object (no markdown) with:\n" +
            "- corporate_risk: integer 0-100 (higher = riskier; consider violations, license status)\n" +
            "- startup_risk: integer 0-100 (higher = riskier; consider if startup has valid license)\n" +
            "- corporate_risk_factors: array of strings listing specific risk factors found\n" +
            "- startup_risk_factors: array of strings listing specific risk factors found\n" +
            "- explanation: string (2-3 sentences summarizing overall deal risk)";

    private final ClaudeClient claude;
    private final ChicagoApiClient chicago;
    private final ObjectMapper objectMapper;

    public RiskAgent(ClaudeClient claude, ChicagoApiClient chicago, ObjectMapper objectMapper) {
        this.claude = claude;
        this.chicago = chicago;
        this.objectMapper = objectMapper;
    }

    public Map<String, Object> assess(String corporateName, String corporateAddress, String startupName) {
        List<Map<String, Object>> tools = buildTools();

        String userMessage = String.format(
                "Assess the risk of a desk-sharing deal between:\n" +
                "Corporation (Host): %s at %s\n" +
                "Startup (Tenant): %s\n\n" +
                "Use the tools to check business licenses and building violations for both parties, " +
                "then return the JSON risk report.",
                corporateName, corporateAddress, startupName);

        String result = claude.runAgentLoop(SYSTEM_PROMPT, userMessage, tools, this::handleTool);

        try {
            String cleaned = cleanJson(result);
            return objectMapper.readValue(cleaned, new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            Map<String, Object> fallback = new LinkedHashMap<>();
            fallback.put("corporate_risk", 25);
            fallback.put("startup_risk", 40);
            fallback.put("explanation", "Risk assessment completed with limited data. " + result);
            return fallback;
        }
    }

    private String handleTool(String toolName, Map<String, Object> input) {
        try {
            switch (toolName) {
                case "get_business_licenses": {
                    String name = (String) input.getOrDefault("company_name", "");
                    List<Map<String, Object>> data = chicago.getBusinessLicenses(name);
                    return objectMapper.writeValueAsString(data);
                }
                case "get_violations": {
                    String addr = (String) input.getOrDefault("address", "");
                    List<Map<String, Object>> data = chicago.getViolations(addr);
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

        Map<String, Object> licTool = new LinkedHashMap<>();
        licTool.put("name", "get_business_licenses");
        licTool.put("description", "Search Chicago business licenses by company name.");
        Map<String, Object> licInput = new LinkedHashMap<>();
        licInput.put("type", "object");
        licInput.put("properties", Map.of(
                "company_name", Map.of("type", "string", "description", "Name of the company to look up")
        ));
        licInput.put("required", List.of("company_name"));
        licTool.put("input_schema", licInput);
        tools.add(licTool);

        Map<String, Object> violTool = new LinkedHashMap<>();
        violTool.put("name", "get_violations");
        violTool.put("description", "Get building code violations for an address.");
        Map<String, Object> violInput = new LinkedHashMap<>();
        violInput.put("type", "object");
        violInput.put("properties", Map.of(
                "address", Map.of("type", "string", "description", "Street address to check")
        ));
        violInput.put("required", List.of("address"));
        violTool.put("input_schema", violInput);
        tools.add(violTool);

        return tools;
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
