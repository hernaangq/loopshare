package com.sharedloop.demo.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sharedloop.demo.service.*;
import com.sharedloop.demo.service.OrchestratorService.StreamLogger;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.*;
import java.util.concurrent.ExecutorService;

/**
 * REST controller exposing all AI agent endpoints.
 * All endpoints under /api/agents/
 */
@RestController
@RequestMapping("/api")
public class AgentController {

    private final AnalystAgent        analyst;
    private final MatcherAgent        matcher;
    private final RiskAgent           risk;
    private final OutreachAgent       outreach;
    private final OrchestratorService orchestrator;
    private final ExecutorService     executor;
    private final ObjectMapper        objectMapper;

    public AgentController(AnalystAgent analyst,
                            MatcherAgent matcher,
                            RiskAgent risk,
                            OutreachAgent outreach,
                            OrchestratorService orchestrator,
                            ExecutorService executor,
                            ObjectMapper objectMapper) {
        this.analyst      = analyst;
        this.matcher      = matcher;
        this.risk         = risk;
        this.outreach     = outreach;
        this.orchestrator = orchestrator;
        this.executor     = executor;
        this.objectMapper = objectMapper;
    }

    /**
     * POST /api/agents/analyze
     * Body: { "propertyName": "Willis Tower", "address": "233 S Wacker Dr" }
     */
    @PostMapping("/agents/analyze")
    public ResponseEntity<Map<String, Object>> analyze(@RequestBody Map<String, Object> body) {
        String name    = (String) body.getOrDefault("propertyName", "");
        String address = (String) body.getOrDefault("address", "");
        return ResponseEntity.ok(analyst.analyze(name, address));
    }

    /**
     * POST /api/agents/match
     * Body: { "company":"...", "sector":"...", "days":[], "people":8, "budget":2000, "zone":"North Loop" }
     */
    @PostMapping("/agents/match")
    public ResponseEntity<Object> match(@RequestBody Map<String, Object> profile) {
        return ResponseEntity.ok(matcher.match(profile));
    }

    /**
     * POST /api/agents/risk
     * Body: { "corporateName":"...", "address":"...", "startupName":"..." }
     */
    @PostMapping("/agents/risk")
    public ResponseEntity<Map<String, Object>> riskAssess(@RequestBody Map<String, Object> body) {
        String corp    = (String) body.getOrDefault("corporateName", "");
        String address = (String) body.getOrDefault("address", "");
        String startup = (String) body.getOrDefault("startupName", "");
        return ResponseEntity.ok(risk.assess(corp, address, startup));
    }

    /**
     * POST /api/agents/outreach
     * Body: { "match":{...}, "analysis":{...}, "startup":{...} }
     */
    @PostMapping("/agents/outreach")
    @SuppressWarnings("unchecked")
    public ResponseEntity<Map<String, Object>> generateOutreach(@RequestBody Map<String, Object> body) {
        Map<String, Object> match    = (Map<String, Object>) body.getOrDefault("match", Map.of());
        Map<String, Object> analysis = (Map<String, Object>) body.getOrDefault("analysis", Map.of());
        Map<String, Object> profile  = (Map<String, Object>) body.getOrDefault("startup", Map.of());
        return ResponseEntity.ok(outreach.generate(match, analysis, profile));
    }

    /**
     * POST /api/agents/orchestrate
     * Body: startup profile (same as /match)
     * Runs full pipeline: Matcher → Analyst → Risk → Outreach
     */
    @PostMapping("/agents/orchestrate")
    public ResponseEntity<Map<String, Object>> orchestrate(@RequestBody Map<String, Object> profile) {
        return ResponseEntity.ok(orchestrator.run(profile));
    }

    /**
     * GET /api/demo
     * Runs the full orchestrator with the TechStart Chicago sample profile.
     * No form submission required — great for live demos.
     */
    @GetMapping("/demo")
    public ResponseEntity<Map<String, Object>> demo() {
        return ResponseEntity.ok(orchestrator.run(OrchestratorService.demoProfile()));
    }
}
