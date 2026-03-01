package com.sharedloop.demo.dealscout;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class CookCountyScraper {

    private final HttpClient httpClient;

    public CookCountyScraper() {
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .followRedirects(HttpClient.Redirect.NORMAL)
                .build();
    }

    public DealScoutContact scrape(String address) throws IOException, InterruptedException {
        // Note: This is a simplified example. Real Cook County Assessor site may require API keys, CAPTCHAs, or different endpoints.
        // Always check terms of service and legal compliance before scraping.

        String searchUrl = "https://www.cookcountyassessor.com/Property-Search";
        String payload = "Address=" + java.net.URLEncoder.encode(address, StandardCharsets.UTF_8);

        HttpRequest request = HttpRequest.newBuilder(URI.create(searchUrl))
                .timeout(Duration.ofSeconds(15))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
                .POST(HttpRequest.BodyPublishers.ofString(payload, StandardCharsets.UTF_8))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            return null;
        }

        Document doc = Jsoup.parse(response.body());

        // Extract owner name (simplified regex - real implementation would need more robust parsing)
        String ownerName = extractOwnerName(doc.text());

        if (ownerName != null && !ownerName.isBlank()) {
            return DealScoutContact.builder()
                    .companyName(ownerName)
                    .sourceNotes("Scraped from Cook County Assessor")
                    .confidence(0.7)
                    .build();
        }

        return null;
    }

    private String extractOwnerName(String text) {
        // Very basic extraction - in reality, parse specific HTML elements
        Pattern pattern = Pattern.compile("Owner:\\s*([^\\n]+)", Pattern.CASE_INSENSITIVE);
        Matcher matcher = pattern.matcher(text);
        if (matcher.find()) {
            return matcher.group(1).trim();
        }
        return null;
    }
}
