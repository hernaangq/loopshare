package com.sharedloop.demo.dealscout;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class DealOpportunityDraft {
    private Long buildingId;
    private String buildingName;
    private String buildingAddress;
    private Double underutilizationScore;
    private Double euiDropPct;
    private Double occupancyRatePct;
    private Double estimatedAnnualTaxSavingsUsd;
    private DealScoutContact contact;
    private String emailSubject;
    private String emailBody;
    private String queueStatus;
}
