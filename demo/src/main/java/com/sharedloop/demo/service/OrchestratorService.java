package com.sharedloop.demo.service;

import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Orchestrator — runs the full agent pipeline sequentially:
 *   Matcher → Analyst → Risk → Outreach
 *
 * Returns the complete package for human review before any action.
 */
@Service
public class OrchestratorService {

    private final MatcherAgent  matcher;
    private final AnalystAgent  analyst;
    private final RiskAgent     risk;
    private final OutreachAgent outreach;

    public OrchestratorService(MatcherAgent matcher,
                                AnalystAgent analyst,
                                RiskAgent risk,
                                OutreachAgent outreach) {
        this.matcher  = matcher;
        this.analyst  = analyst;
        this.risk     = risk;
        this.outreach = outreach;
    }

    /**
     * Full orchestration flow.
     *
     * @param profile map with: company, sector, days[], people, budget, zone
     * @return result map with startup profile + enriched matches
     */
    public Map<String, Object> run(Map<String, Object> profile) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("startup", profile);
        result.put("status", "processing");

        // Step 1 — Matcher: find top 3 listings
        List<Map<String, Object>> matches = matcher.match(profile);

        // Step 2 — Enrich each match with Analyst + Risk + Outreach
        List<Map<String, Object>> enrichedMatches = new ArrayList<>();
        for (Map<String, Object> match : matches) {
            String buildingName = (String) match.getOrDefault("building_name", "");
            String address      = (String) match.getOrDefault("building_address", "");
            String hostCompany  = (String) match.getOrDefault("host_company", "");
            String startup      = (String) profile.getOrDefault("company", "");

            // Analyst
            Map<String, Object> analysis = analyst.analyze(buildingName, address);
            match.put("analysis", analysis);

            // Risk
            Map<String, Object> riskReport = risk.assess(hostCompany, address, startup);
            match.put("risk_report", riskReport);

            // Outreach
            Map<String, Object> outreachContent = outreach.generate(match, analysis, profile);
            match.put("outreach", outreachContent);

            enrichedMatches.add(match);
        }

        result.put("matches", enrichedMatches);
        result.put("status", "complete");
        result.put("total_matches", enrichedMatches.size());
        result.put("disclaimer", "Review all AI-generated content before sending. This is a demo — no emails will be sent.");

        return result;
    }

    /** Demo profile for /api/demo endpoint */
    public static Map<String, Object> demoProfile() {
        Map<String, Object> profile = new LinkedHashMap<>();
        profile.put("company", "TechStart Chicago");
        profile.put("sector", "Software");
        profile.put("days", List.of("Monday", "Wednesday"));
        profile.put("people", 8);
        profile.put("budget", 2000);
        profile.put("zone", "North Loop");
        return profile;
    }
}
