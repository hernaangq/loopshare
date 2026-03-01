package com.sharedloop.demo.dealscout;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

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

    @GetMapping("/licenses/companies")
    @Operation(summary = "Get tenant/license companies for a building from Chicago licenses datasets")
    public List<Map<String, Object>> getLicenseCompanies(@RequestParam(required = false) String buildingName,
                                                         @RequestParam(required = false) String buildingAddress,
                                                         @RequestParam(required = false) Double latitude,
                                                         @RequestParam(required = false) Double longitude,
                                                         @RequestParam(defaultValue = "active") String dataset,
                                                         @RequestParam(defaultValue = "false") Boolean includeLocal,
                                                         @RequestParam(defaultValue = "8") Integer limit) {
        return dealScoutService.getLicenseCompanies(buildingName, buildingAddress, latitude, longitude, dataset, includeLocal, limit);
    }

    @PostMapping("/company-proposal")
    @Operation(summary = "Generate AI email proposal tailored to one company in a building")
    public Map<String, Object> generateCompanyProposal(@RequestBody Map<String, Object> request) {
        String buildingName = request.get("buildingName") == null ? null : String.valueOf(request.get("buildingName"));
        String buildingAddress = request.get("buildingAddress") == null ? null : String.valueOf(request.get("buildingAddress"));
        String companyName = request.get("companyName") == null ? null : String.valueOf(request.get("companyName"));

        Map<String, Object> proposal = dealScoutService.generateCompanyProposal(buildingName, buildingAddress, companyName);
        Map<String, Object> response = new LinkedHashMap<>();
        response.putAll(proposal);
        return response;
    }
}
