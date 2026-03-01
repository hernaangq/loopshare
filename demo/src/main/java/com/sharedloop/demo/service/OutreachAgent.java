package com.sharedloop.demo.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Outreach Agent — generates a personalized outreach email and lease draft.
 *
 * No tool_use needed. Uses Claude to generate text from structured context.
 */
@Service
public class OutreachAgent {

    private final ClaudeClient claude;
    private final ObjectMapper objectMapper;

    public OutreachAgent(ClaudeClient claude, ObjectMapper objectMapper) {
        this.claude = claude;
        this.objectMapper = objectMapper;
    }

    /**
     * @param match    the matched listing map (from MatcherAgent)
     * @param analysis the building analysis map (from AnalystAgent)
     * @param profile  the startup profile
     * @return map with "email" and "lease_draft" keys
     */
    public Map<String, Object> generate(Map<String, Object> match,
                                         Map<String, Object> analysis,
                                         Map<String, Object> profile) {

        String systemPrompt =
                "You are a professional business development writer for SharedLoop, " +
                "a marketplace that connects Chicago Loop corporations with startups needing coworking space. " +
                "Generate a document based on the provided data.\n\n" +
                "Return ONLY a valid JSON object (no markdown) with exactly two fields:\n" +
                "1. \"email\": A professional but warm outreach email from SharedLoop to the corporation, " +
                "   explaining the startup's interest and the financial opportunity. " +
                "   Include real numbers: EUI score, estimated monthly revenue from the deal, " +
                "   estimated tax benefit under Illinois Enterprise Zone Act, CO2 reduction. " +
                "   Keep it under 300 words.\n";

        String userMessage;
        try {
            userMessage = "Building match data:\n" + objectMapper.writeValueAsString(match) +
                          "\n\nBuilding analysis:\n" + objectMapper.writeValueAsString(analysis) +
                          "\n\nStartup profile:\n" + objectMapper.writeValueAsString(profile);
        } catch (Exception e) {
            Map<String, Object> err = new LinkedHashMap<>();
            err.put("email", "Error preparing outreach data.");
            err.put("lease_draft", "Error preparing lease data.");
            return err;
        }

        String result = claude.generate(systemPrompt, userMessage);

        try {
            String cleaned = cleanJson(result);
            return objectMapper.readValue(cleaned, new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            Map<String, Object> fallback = new LinkedHashMap<>();
            fallback.put("email", extractSection(result, "email"));
            return fallback;
        }
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

    private String extractSection(String text, String key) {
        if (text == null) return "";
        int idx = text.toLowerCase().indexOf(key);
        if (idx < 0) return text;
        return text.substring(idx);
    }
}
