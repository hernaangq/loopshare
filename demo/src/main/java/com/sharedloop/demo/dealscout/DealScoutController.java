package com.sharedloop.demo.dealscout;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/deal-scout")
@CrossOrigin(origins = "*")
@Tag(name = "Deal Scout", description = "Agentic pipeline for identifying underutilized buildings and drafting outreach")
public class DealScoutController {

    private final DealScoutService dealScoutService;

    public DealScoutController(DealScoutService dealScoutService) {
        this.dealScoutService = dealScoutService;
    }

    @PostMapping("/runs")
    @Operation(summary = "Run Deal Scout pipeline over benchmark inputs")
    public DealScoutRunResponse run(@RequestBody(required = false) DealScoutRunRequest request) {
        return dealScoutService.runPipeline(request);
    }

    @GetMapping("/runs")
    @Operation(summary = "List historical Deal Scout runs")
    public List<DealScoutRunResponse> listRuns() {
        return dealScoutService.listRuns();
    }

    @GetMapping("/runs/{runId}")
    @Operation(summary = "Get one Deal Scout run by ID")
    public ResponseEntity<DealScoutRunResponse> getRun(@PathVariable String runId) {
        DealScoutRunResponse run = dealScoutService.getRun(runId);
        if (run == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(run);
    }

    @PatchMapping("/runs/{runId}/opportunities/{buildingId}/status")
    @Operation(summary = "Update queue status for one drafted opportunity")
    public ResponseEntity<DealOpportunityDraft> updateStatus(@PathVariable String runId,
                                                             @PathVariable Long buildingId,
                                                             @RequestParam String status) {
        DealOpportunityDraft updated = dealScoutService.updateOpportunityStatus(runId, buildingId, status);
        if (updated == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(updated);
    }
}
