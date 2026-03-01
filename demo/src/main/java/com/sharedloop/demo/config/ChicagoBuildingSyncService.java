package com.sharedloop.demo.config;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sharedloop.demo.model.Building;
import com.sharedloop.demo.repository.BuildingRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.HashSet;
import java.util.Set;

@Component
public class ChicagoBuildingSyncService {

    private final BuildingRepository buildingRepository;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    @Value("${buildings.sync.enabled:true}")
    private boolean syncEnabled;

    @Value("${buildings.sync.base-url:https://data.cityofchicago.org/resource/xq83-jr8c.json}")
    private String sourceUrl;

    @Value("${buildings.sync.data-year:2023}")
    private String dataYear;

    @Value("${buildings.sync.limit:1000}")
    private int limit;

    public ChicagoBuildingSyncService(BuildingRepository buildingRepository, ObjectMapper objectMapper) {
        this.buildingRepository = buildingRepository;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    }

    @EventListener(ApplicationReadyEvent.class)
    public void syncBuildings() {
        if (!syncEnabled) {
            return;
        }

        try {
            String select = "property_name,address,community_area,latitude,longitude";
            String where = "data_year='" + dataYear + "' AND reporting_status='Submitted' AND property_name IS NOT NULL AND property_name!='-' AND address IS NOT NULL";

            String url = sourceUrl
                    + "?$select=" + URLEncoder.encode(select, StandardCharsets.UTF_8)
                    + "&$where=" + URLEncoder.encode(where, StandardCharsets.UTF_8)
                    + "&$limit=" + limit;

            HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                    .timeout(Duration.ofSeconds(25))
                    .header("Accept", "application/json")
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                return;
            }

            JsonNode rows = objectMapper.readTree(response.body());
            if (!rows.isArray()) {
                return;
            }

            int inserted = 0;
            Set<String> seenAddresses = new HashSet<>();

            for (JsonNode row : rows) {
                String name = safeText(row, "property_name");
                String address = normalizeAddress(safeText(row, "address"));
                String neighborhood = safeText(row, "community_area");
                Double latitude = safeDouble(row, "latitude");
                Double longitude = safeDouble(row, "longitude");

                if (name == null || address == null) {
                    continue;
                }

                String dedupeKey = address.toLowerCase();
                if (seenAddresses.contains(dedupeKey)) {
                    continue;
                }
                seenAddresses.add(dedupeKey);

                if (buildingRepository.existsByAddressIgnoreCase(address)
                        || buildingRepository.existsByNameIgnoreCaseAndAddressIgnoreCase(name, address)) {
                    continue;
                }

                Building building = Building.builder()
                        .name(name)
                        .address(address)
                        .neighborhood(neighborhood)
                        .floors(null)
                        .totalDesks(null)
                        .amenities(null)
                        .latitude(latitude)
                        .longitude(longitude)
                        .imageUrl(null)
                        .build();

                buildingRepository.save(building);
                inserted++;
            }

            System.out.println("[ChicagoBuildingSyncService] Imported real buildings: " + inserted);
        } catch (Exception exception) {
            System.out.println("[ChicagoBuildingSyncService] Sync skipped due to error: " + exception.getMessage());
        }
    }

    private String safeText(JsonNode row, String field) {
        String value = row.path(field).asText();
        if (value == null) {
            return null;
        }
        String normalized = value.replace('\n', ' ').replace('\r', ' ').trim().replaceAll("\\s+", " ");
        return normalized.isBlank() ? null : normalized;
    }

    private String normalizeAddress(String address) {
        if (address == null) {
            return null;
        }
        return address.replace(" .", ".").trim();
    }

    private Double safeDouble(JsonNode row, String field) {
        String value = row.path(field).asText();
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Double.parseDouble(value);
        } catch (Exception ignored) {
            return null;
        }
    }
}
