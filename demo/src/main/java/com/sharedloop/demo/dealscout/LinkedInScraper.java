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
public class LinkedInScraper {

    private final HttpClient httpClient;

    public LinkedInScraper() {
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .followRedirects(HttpClient.Redirect.NORMAL)
                .build();
    }

    public DealScoutContact scrape(String companyName) throws IOException, InterruptedException {
        // WARNING: LinkedIn scraping may violate terms of service. Use official APIs if available.
        // This is for demonstration only - implement with care and legal review.

        String searchUrl = "https://www.linkedin.com/search/results/companies/?keywords=" +
                java.net.URLEncoder.encode(companyName, StandardCharsets.UTF_8);

        HttpRequest request = HttpRequest.newBuilder(URI.create(searchUrl))
                .timeout(Duration.ofSeconds(15))
                .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
                .GET()
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            return null;
        }

        Document doc = Jsoup.parse(response.body());

        // Extract company LinkedIn URL and basic info (simplified)
        String linkedinUrl = extractCompanyUrl(doc);
        String description = extractDescription(doc);

        if (linkedinUrl != null) {
            return DealScoutContact.builder()
                    .linkedinUrl(linkedinUrl)
                    .sourceNotes("Scraped from LinkedIn company search")
                    .confidence(0.6)
                    .build();
        }

        return null;
    }

    private String extractCompanyUrl(Document doc) {
        // Look for company profile links
        return doc.select("a[href*='/company/']").attr("href");
    }

    private String extractDescription(Document doc) {
        // Basic description extraction
        return doc.select("p").first() != null ? doc.select("p").first().text() : null;
    }
}
