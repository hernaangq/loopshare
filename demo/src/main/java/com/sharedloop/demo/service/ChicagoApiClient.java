package com.sharedloop.demo.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * Helper for Chicago Data Portal (Socrata) API calls.
 */
@Service
public class ChicagoApiClient {

    private static final String ENERGY_URL     = "https://data.cityofchicago.org/resource/xq83-jr8c.json";
    private static final String VIOLATIONS_URL = "https://data.cityofchicago.org/resource/22u3-xenr.json";
    private static final String CTA_URL        = "https://data.cityofchicago.org/resource/r69b-3mnj.json";
    private static final String LICENSES_URL   = "https://data.cityofchicago.org/resource/uupf-x98q.json";

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public ChicagoApiClient(RestTemplate restTemplate, ObjectMapper objectMapper) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
    }

    public List<Map<String, Object>> getEnergyData(String propertyName) {
        String url = ENERGY_URL + "?community_area=LOOP&$limit=5&$q=" + encode(propertyName);
        return fetchList(url);
    }

    public List<Map<String, Object>> getEnergyDataForLoop(int limit) {
        String url = ENERGY_URL + "?community_area=LOOP&$limit=" + limit;
        return fetchList(url);
    }

    public List<Map<String, Object>> getViolations(String address) {
        String url = VIOLATIONS_URL + "?$where=address+like+'%" + encode(address.toUpperCase()) + "%'&$limit=10";
        return fetchList(url);
    }

    public List<Map<String, Object>> getCtaRidership() {
        String url = CTA_URL + "?$limit=5";
        return fetchList(url);
    }

    public List<Map<String, Object>> getBusinessLicenses(String name) {
        String url = LICENSES_URL + "?$where=doing_business_as_name+like+'%" + encode(name.toUpperCase()) + "%'&$limit=5";
        return fetchList(url);
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> fetchList(String url) {
        try {
            String json = restTemplate.getForObject(url, String.class);
            if (json == null || json.isBlank()) return Collections.emptyList();
            return objectMapper.readValue(json, new TypeReference<List<Map<String, Object>>>() {});
        } catch (Exception e) {
            return Collections.singletonList(Map.of("error", "API call failed: " + e.getMessage()));
        }
    }

    private String encode(String s) {
        return s == null ? "" : s.replace(" ", "%20").replace("'", "''");
    }
}
