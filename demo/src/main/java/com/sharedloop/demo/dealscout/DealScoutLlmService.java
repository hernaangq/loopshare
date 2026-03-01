package com.sharedloop.demo.dealscout;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

@Service
public class DealScoutLlmService {

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    @Value("${dealscout.llm.provider:mock}")
    private String provider;

    @Value("${dealscout.llm.base-url:http://localhost:11434}")
    private String baseUrl;

    @Value("${dealscout.llm.model:gpt-4o-mini}")
    private String model;

    @Value("${dealscout.llm.ollama-model:llama3}")
    private String ollamaModel;

    @Value("${dealscout.llm.api-key:}")
    private String apiKey;

    public DealScoutLlmService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    }

    public DraftResult draftEmail(EmailContext context) {
        if ("ollama".equalsIgnoreCase(provider)) {
            try {
                return draftWithOllama(context);
            } catch (Exception ignored) {
                return draftTemplate(context);
            }
        }

        boolean shouldUseOpenAi = "openai".equalsIgnoreCase(provider) && apiKey != null && !apiKey.isBlank();
        if (shouldUseOpenAi) {
            try {
                return draftWithOpenAi(context);
            } catch (Exception ignored) {
                return draftTemplate(context);
            }
        }

        return draftTemplate(context);
    }

    private DraftResult draftWithOpenAi(EmailContext context) throws IOException, InterruptedException {
        String prompt = "You are an enterprise B2B sales assistant for LoopShare. " +
                "Draft one concise personalized cold email (120-180 words). " +
                "Include: specific building name, EUI improvement percent, and estimated annual tax savings in USD. " +
                "Tone: professional, warm, concrete CTA for 15-minute call. " +
                "Return JSON with keys: subject, body.\n\n" +
                "Context:\n" +
                "Building: " + context.buildingName + "\n" +
                "Address: " + context.buildingAddress + "\n" +
                "Contact: " + context.contactName + "\n" +
                "Company: " + context.companyName + "\n" +
                "EUI drop %: " + context.euiDropPct + "\n" +
                "Estimated annual tax savings USD: " + context.estimatedSavingsUsd + "\n";

        Map<String, Object> body = new HashMap<>();
        body.put("model", model);
        body.put("temperature", 0.3);
        body.put("response_format", Map.of("type", "json_object"));
        body.put("messages", new Object[]{
                Map.of("role", "system", "content", "You write high-conversion enterprise outreach emails."),
                Map.of("role", "user", "content", prompt)
        });

        String requestJson = objectMapper.writeValueAsString(body);
        String endpoint = baseUrl.endsWith("/") ? baseUrl + "v1/chat/completions" : baseUrl + "/v1/chat/completions";

        HttpRequest request = HttpRequest.newBuilder(URI.create(endpoint))
                .timeout(Duration.ofSeconds(30))
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(requestJson, StandardCharsets.UTF_8))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new IOException("LLM request failed with status " + response.statusCode());
        }

        JsonNode root = objectMapper.readTree(response.body());
        String content = root.path("choices").path(0).path("message").path("content").asText();
        if (content == null || content.isBlank()) {
            throw new IOException("LLM response content is empty");
        }

        JsonNode generated = objectMapper.readTree(content);
        String subject = generated.path("subject").asText();
        String emailBody = generated.path("body").asText();
        if (subject == null || subject.isBlank() || emailBody == null || emailBody.isBlank()) {
            throw new IOException("LLM JSON output missing subject/body");
        }

        return new DraftResult(subject, emailBody);
    }

    private DraftResult draftWithOllama(EmailContext context) throws IOException, InterruptedException {
        String prompt = "You are an enterprise B2B sales assistant for LoopShare. " +
                "Draft one concise personalized cold email (120-180 words). " +
                "Include: specific building name, EUI improvement percent, and estimated annual tax savings in USD. " +
                "Tone: professional, warm, concrete CTA for 15-minute call. " +
                "Return JSON with keys: subject, body.\n\n" +
                "Context:\n" +
                "Building: " + context.buildingName + "\n" +
                "Address: " + context.buildingAddress + "\n" +
                "Contact: " + context.contactName + "\n" +
                "Company: " + context.companyName + "\n" +
                "EUI drop %: " + context.euiDropPct + "\n" +
                "Estimated annual tax savings USD: " + context.estimatedSavingsUsd + "\n";

        Map<String, Object> body = new HashMap<>();
        body.put("model", ollamaModel);
        body.put("prompt", prompt);
        body.put("temperature", 0.3);
        body.put("top_p", 0.95);
        body.put("max_tokens", 400);

        String requestJson = objectMapper.writeValueAsString(body);
        String endpoint = baseUrl.endsWith("/") ? baseUrl + "api/generate" : baseUrl + "/api/generate";

        HttpRequest request = HttpRequest.newBuilder(URI.create(endpoint))
                .timeout(Duration.ofSeconds(20))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(requestJson, StandardCharsets.UTF_8))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new IOException("LLM request failed with status " + response.statusCode());
        }

        JsonNode root = objectMapper.readTree(response.body());
        JsonNode contentNode = root.path("choices").path(0).path("content");
        String content;
        if (contentNode.isTextual()) {
            content = contentNode.asText();
        } else if (contentNode.has("text")) {
            content = contentNode.path("text").asText();
        } else {
            content = contentNode.toString();
        }

        if (content == null || content.isBlank()) {
            throw new IOException("LLM response content is empty");
        }

        JsonNode generated = objectMapper.readTree(content);
        String subject = generated.path("subject").asText();
        String emailBody = generated.path("body").asText();
        if (subject == null || subject.isBlank() || emailBody == null || emailBody.isBlank()) {
            throw new IOException("LLM JSON output missing subject/body");
        }

        return new DraftResult(subject, emailBody);
    }

    private DraftResult draftTemplate(EmailContext context) {
        String roundedDrop = String.format("%.1f", context.euiDropPct);
        String roundedSavings = String.format("%,.0f", context.estimatedSavingsUsd);

        String subject = "Idea for " + context.buildingName + ": monetize unused desks + potential $" + roundedSavings + " tax impact";

        String body = "Hi " + context.contactName + ",\n\n" +
                "I’m reaching out from LoopShare because " + context.buildingName + " appears to be a strong fit for our desk-sharing program. " +
                "Based on recent benchmarking signals, we estimate about a " + roundedDrop + "% EUI improvement trend, which often aligns with hybrid occupancy patterns and underused office capacity.\n\n" +
                "For teams in your position, we help convert unused desks into flexible inventory for vetted startups while preserving control over days, floors, and approval rules. " +
                "Using conservative assumptions, we estimate up to about $" + roundedSavings + " in annual tax savings potential tied to this model.\n\n" +
                "Would you be open to a 15-minute call next week to review a building-specific scenario for " + context.buildingAddress + "?\n\n" +
                "Best,\n" +
                "LoopShare Partnerships";

        return new DraftResult(subject, body);
    }

    public static class EmailContext {
        public final String buildingName;
        public final String buildingAddress;
        public final String contactName;
        public final String companyName;
        public final double euiDropPct;
        public final double estimatedSavingsUsd;

        public EmailContext(String buildingName,
                            String buildingAddress,
                            String contactName,
                            String companyName,
                            double euiDropPct,
                            double estimatedSavingsUsd) {
            this.buildingName = buildingName;
            this.buildingAddress = buildingAddress;
            this.contactName = contactName;
            this.companyName = companyName;
            this.euiDropPct = euiDropPct;
            this.estimatedSavingsUsd = estimatedSavingsUsd;
        }
    }

    public static class DraftResult {
        public final String subject;
        public final String body;

        public DraftResult(String subject, String body) {
            this.subject = subject;
            this.body = body;
        }
    }
}
