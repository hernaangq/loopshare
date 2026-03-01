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
public class CompanyWebsiteScraper {

    private final HttpClient httpClient;

    public CompanyWebsiteScraper() {
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .followRedirects(HttpClient.Redirect.NORMAL)
                .build();
    }

    public DealScoutContact scrape(String websiteUrl) throws IOException, InterruptedException {
        if (websiteUrl == null || websiteUrl.isBlank()) {
            return null;
        }

        HttpRequest request = HttpRequest.newBuilder(URI.create(websiteUrl))
                .timeout(Duration.ofSeconds(15))
                .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
                .GET()
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            return null;
        }

        Document doc = Jsoup.parse(response.body());

        // Extract contact info from website (simplified - look for email patterns, contact pages)
        String email = extractEmail(doc.text());
        String contactName = extractContactName(doc);

        if (email != null || contactName != null) {
            return DealScoutContact.builder()
                    .email(email)
                    .contactName(contactName)
                    .sourceNotes("Scraped from company website")
                    .confidence(0.8)
                    .build();
        }

        return null;
    }

    private String extractEmail(String text) {
        Pattern emailPattern = Pattern.compile("[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}");
        Matcher matcher = emailPattern.matcher(text);
        if (matcher.find()) {
            return matcher.group();
        }
        return null;
    }

    private String extractContactName(Document doc) {
        // Look for contact sections
        return doc.select("h1, h2, h3").stream()
                .filter(e -> e.text().toLowerCase().contains("contact"))
                .findFirst()
                .map(e -> e.text())
                .orElse(null);
    }
}
