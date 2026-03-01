package com.sharedloop.demo.dealscout;

import lombok.Data;

@Data
public class EnergyBenchmarkInput {
    private Long buildingId;
    private Integer reportingYear;
    private Double euiCurrent;
    private Double euiPrior;
    private Double occupancyRatePct;
    private String source;
}
