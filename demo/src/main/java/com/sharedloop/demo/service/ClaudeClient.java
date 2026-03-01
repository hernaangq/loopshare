package com.sharedloop.demo.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

/**
 * AI client backed by Groq (free tier, no credit card).
 * Uses Groq's OpenAI-compatible API with llama-3.3-70b-versatile.
 *
 * Get your free key at https://console.groq.com
 * Then: export GROQ_API_KEY=gsk_...
 *
 * Agents pass tool definitions in Anthropic format (input_schema).
 * This class converts them internally to OpenAI function-calling format.
 */
@Service
public class ClaudeClient {

    private static final String API_URL = "https://api.groq.com/openai/v1/chat/completions";
    private static final String MODEL   = "llama-3.3-70b-versatile";
    private static final int    MAX_ITER = 10;

    @Value("${groq.api.key:}")
    private String apiKey;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @FunctionalInterface
    public interface ToolHandler {
        String handle(String toolName, Map<String, Object> input);
    }

    public ClaudeClient(RestTemplate restTemplate, ObjectMapper objectMapper) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
    }

    /**
     * Run the agentic loop until the model stops calling tools.
     *
     * @param systemPrompt instruction context for the model
     * @param userMessage  initial user message
     * @param tools        tool definitions in Anthropic format (input_schema) — converted internally
     * @param toolHandler  callback that executes a tool call; returns result as string
     * @return final text response from the model
     */
    @SuppressWarnings("unchecked")
    public String runAgentLoop(String systemPrompt,
                               String userMessage,
                               List<Map<String, Object>> tools,
                               ToolHandler toolHandler) {

        if (apiKey == null || apiKey.isBlank()) {
            return "{\"error\": \"GROQ_API_KEY is not set. Get a free key at https://console.groq.com and run: export GROQ_API_KEY=gsk_...\"}";
        }

        // Build initial message list (system + user)
        List<Map<String, Object>> messages = new ArrayList<>();
        if (systemPrompt != null && !systemPrompt.isBlank()) {
            messages.add(Map.of("role", "system", "content", systemPrompt));
        }
        messages.add(Map.of("role", "user", "content", userMessage));

        // Convert tools from Anthropic format → OpenAI format once
        List<Map<String, Object>> openaiTools = convertTools(tools);

        for (int i = 0; i < MAX_ITER; i++) {
            Map<String, Object> response;
            try {
                response = callGroq(messages, openaiTools);
            } catch (Exception e) {
                return "{\"error\": \"Groq API call failed: " + e.getMessage() + "\"}";
            }

            List<Map<String, Object>> choices = (List<Map<String, Object>>) response.get("choices");
            if (choices == null || choices.isEmpty()) {
                return "{\"error\": \"No choices in Groq response\"}";
            }

            Map<String, Object> choice  = choices.get(0);
            String finishReason         = (String) choice.get("finish_reason");
            Map<String, Object> message = (Map<String, Object>) choice.get("message");

            if ("stop".equals(finishReason) || message == null) {
                return message != null ? (String) message.getOrDefault("content", "") : "";
            }

            if ("tool_calls".equals(finishReason)) {
                // Add the assistant message (with tool_calls) to history
                messages.add(message);

                List<Map<String, Object>> toolCalls =
                        (List<Map<String, Object>>) message.getOrDefault("tool_calls", Collections.emptyList());

                for (Map<String, Object> toolCall : toolCalls) {
                    String toolCallId = (String) toolCall.get("id");
                    Map<String, Object> func = (Map<String, Object>) toolCall.get("function");
                    String toolName  = (String) func.get("name");
                    String argsJson  = (String) func.getOrDefault("arguments", "{}");

                    Map<String, Object> toolInput;
                    try {
                        toolInput = objectMapper.readValue(argsJson, new TypeReference<Map<String, Object>>() {});
                    } catch (Exception e) {
                        toolInput = Collections.emptyMap();
                    }

                    String result;
                    try {
                        result = toolHandler.handle(toolName, toolInput);
                    } catch (Exception e) {
                        result = "Tool error: " + e.getMessage();
                    }

                    // Tool result message in OpenAI format
                    Map<String, Object> toolResultMsg = new LinkedHashMap<>();
                    toolResultMsg.put("role", "tool");
                    toolResultMsg.put("tool_call_id", toolCallId);
                    toolResultMsg.put("content", result);
                    messages.add(toolResultMsg);
                }
            } else {
                // Any other finish reason (length, etc.) — return what we have
                return (String) message.getOrDefault("content", "");
            }
        }
        return "{\"error\": \"Max iterations reached\"}";
    }

    /** Convenience overload for agents that don't use tools. */
    public String generate(String systemPrompt, String userMessage) {
        return runAgentLoop(systemPrompt, userMessage, Collections.emptyList(), (n, i) -> "");
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> callGroq(List<Map<String, Object>> messages,
                                          List<Map<String, Object>> tools) throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + apiKey);
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", MODEL);
        body.put("max_tokens", 4096);
        body.put("messages", messages);
        if (tools != null && !tools.isEmpty()) {
            body.put("tools", tools);
            body.put("tool_choice", "auto");
        }

        String requestJson = objectMapper.writeValueAsString(body);
        HttpEntity<String> entity = new HttpEntity<>(requestJson, headers);

        ResponseEntity<String> resp = restTemplate.exchange(API_URL, HttpMethod.POST, entity, String.class);
        return objectMapper.readValue(resp.getBody(), new TypeReference<Map<String, Object>>() {});
    }

    /**
     * Convert tool definitions from Anthropic format to OpenAI function-calling format.
     *
     * Anthropic:  { name, description, input_schema: { type, properties, required } }
     * OpenAI:     { type: "function", function: { name, description, parameters: { type, properties, required } } }
     */
    private List<Map<String, Object>> convertTools(List<Map<String, Object>> anthropicTools) {
        if (anthropicTools == null || anthropicTools.isEmpty()) return Collections.emptyList();
        List<Map<String, Object>> result = new ArrayList<>();
        for (Map<String, Object> t : anthropicTools) {
            Map<String, Object> func = new LinkedHashMap<>();
            func.put("name",        t.get("name"));
            func.put("description", t.get("description"));
            func.put("parameters",  t.getOrDefault("input_schema", Map.of("type", "object", "properties", Map.of())));

            Map<String, Object> openaiTool = new LinkedHashMap<>();
            openaiTool.put("type", "function");
            openaiTool.put("function", func);
            result.add(openaiTool);
        }
        return result;
    }
}
