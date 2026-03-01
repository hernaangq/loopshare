package com.sharedloop.demo.dealscout;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.List;

@Data
@Builder
public class DealScoutRunResponse {
    private String runId;
    private Instant generatedAt;
    private Integer topN;
    private Integer totalAnalyzed;
    private Boolean dryRun;
    private List<DealOpportunityDraft> opportunities;
}
