package com.sharedloop.demo.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

/**
 * AI client backed by local Ollama (http://localhost:11434).
 * Uses Ollama's chat API with llama3.2.
 *
 * Run Ollama locally: https://ollama.com
 * Then: ollama pull llama3.2
 *
 * Agents pass tool definitions in Anthropic format (input_schema).
 * This class converts them internally to OpenAI/Ollama function-calling format.
 */
@Service
public class ClaudeClient {

    private static final int MAX_ITER = 10;

    @Value("${ollama.base.url:http://localhost:11434}")
    private String ollamaBaseUrl;

    @Value("${ollama.model:llama3.2}")
    private String model;

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

        // Build initial message list (system + user)
        List<Map<String, Object>> messages = new ArrayList<>();
        if (systemPrompt != null && !systemPrompt.isBlank()) {
            messages.add(Map.of("role", "system", "content", systemPrompt));
        }
        messages.add(Map.of("role", "user", "content", userMessage));

        // Convert tools from Anthropic format → Ollama/OpenAI format once
        List<Map<String, Object>> ollamaTools = convertTools(tools);

        for (int i = 0; i < MAX_ITER; i++) {
            Map<String, Object> response;
            try {
                response = callOllama(messages, ollamaTools);
            } catch (Exception e) {
                return "{\"error\": \"Ollama API call failed: " + e.getMessage() + "\"}";
            }

            Map<String, Object> message = (Map<String, Object>) response.get("message");
            if (message == null) {
                return "{\"error\": \"No message in Ollama response\"}";
            }

            // Check for tool calls
            List<Map<String, Object>> toolCalls =
                    (List<Map<String, Object>>) message.getOrDefault("tool_calls", Collections.emptyList());

            if (toolCalls == null || toolCalls.isEmpty()) {
                // No tool calls — return text content
                return (String) message.getOrDefault("content", "");
            }

            // Add the assistant message (with tool_calls) to history
            messages.add(message);

            for (Map<String, Object> toolCall : toolCalls) {
                Map<String, Object> func = (Map<String, Object>) toolCall.get("function");
                String toolName = (String) func.get("name");
                Object argsRaw = func.getOrDefault("arguments", Collections.emptyMap());

                // Ollama returns arguments as an object; Groq returned a JSON string — handle both
                Map<String, Object> toolInput;
                if (argsRaw instanceof Map) {
                    toolInput = (Map<String, Object>) argsRaw;
                } else {
                    try {
                        toolInput = objectMapper.readValue(argsRaw.toString(),
                                new TypeReference<Map<String, Object>>() {});
                    } catch (Exception e) {
                        toolInput = Collections.emptyMap();
                    }
                }

                String result;
                try {
                    result = toolHandler.handle(toolName, toolInput);
                } catch (Exception e) {
                    result = "Tool error: " + e.getMessage();
                }

                // Tool result message for Ollama
                Map<String, Object> toolResultMsg = new LinkedHashMap<>();
                toolResultMsg.put("role", "tool");
                toolResultMsg.put("content", result);
                messages.add(toolResultMsg);
            }
        }
        return "{\"error\": \"Max iterations reached\"}";
    }

    /** Convenience overload for agents that don't use tools. */
    public String generate(String systemPrompt, String userMessage) {
        return runAgentLoop(systemPrompt, userMessage, Collections.emptyList(), (n, i) -> "");
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> callOllama(List<Map<String, Object>> messages,
                                            List<Map<String, Object>> tools) throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", model);
        body.put("messages", messages);
        body.put("stream", false);
        if (tools != null && !tools.isEmpty()) {
            body.put("tools", tools);
        }

        String requestJson = objectMapper.writeValueAsString(body);
        HttpEntity<String> entity = new HttpEntity<>(requestJson, headers);

        String apiUrl = ollamaBaseUrl + "/api/chat";
        ResponseEntity<String> resp = restTemplate.exchange(apiUrl, HttpMethod.POST, entity, String.class);
        return objectMapper.readValue(resp.getBody(), new TypeReference<Map<String, Object>>() {});
    }

    /**
     * Convert tool definitions from Anthropic format to OpenAI/Ollama function-calling format.
     *
     * Anthropic:  { name, description, input_schema: { type, properties, required } }
     * Ollama:     { type: "function", function: { name, description, parameters: { type, properties, required } } }
     */
    private List<Map<String, Object>> convertTools(List<Map<String, Object>> anthropicTools) {
        if (anthropicTools == null || anthropicTools.isEmpty()) return Collections.emptyList();
        List<Map<String, Object>> result = new ArrayList<>();
        for (Map<String, Object> t : anthropicTools) {
            Map<String, Object> func = new LinkedHashMap<>();
            func.put("name",        t.get("name"));
            func.put("description", t.get("description"));
            func.put("parameters",  t.getOrDefault("input_schema", Map.of("type", "object", "properties", Map.of())));

            Map<String, Object> ollamaTool = new LinkedHashMap<>();
            ollamaTool.put("type", "function");
            ollamaTool.put("function", func);
            result.add(ollamaTool);
        }
        return result;
    }
}
