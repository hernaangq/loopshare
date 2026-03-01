package com.sharedloop.demo.dealscout;

import lombok.Data;

import java.util.List;

@Data
public class DealScoutRunRequest {
    private Integer topN;
    private Boolean dryRun;
    private List<EnergyBenchmarkInput> benchmarks;
}
