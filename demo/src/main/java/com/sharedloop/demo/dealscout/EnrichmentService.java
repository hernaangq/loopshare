package com.sharedloop.demo.dealscout;

import com.sharedloop.demo.model.Building;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.naming.directory.Attributes;
import javax.naming.directory.DirContext;
import javax.naming.directory.InitialDirContext;
import java.util.Hashtable;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;

@Service
public class EnrichmentService {

    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$");

    @Value("${dealscout.enrichment.min-confidence:0.8}")
    private double minConfidence;

    @Value("${dealscout.enrichment.enabled:true}")
    private boolean enrichmentEnabled;

    @Value("${dealscout.enrichment.require-verified-email:true}")
    private boolean requireVerifiedEmail;

    private final CookCountyScraper cookCountyScraper;
    private final LinkedInScraper linkedInScraper;
    private final CompanyWebsiteScraper companyWebsiteScraper;

    private final Map<String, DealScoutContact> enrichmentCache = new ConcurrentHashMap<>();

    public EnrichmentService(CookCountyScraper cookCountyScraper,
                             LinkedInScraper linkedInScraper,
                             CompanyWebsiteScraper companyWebsiteScraper) {
        this.cookCountyScraper = cookCountyScraper;
        this.linkedInScraper = linkedInScraper;
        this.companyWebsiteScraper = companyWebsiteScraper;
    }

    public DealScoutContact enrichContact(DealScoutContact initialContact, Building building) {
        if (!enrichmentEnabled) {
            return finalizeVerification(initialContact);
        }

        String cacheKey = building.getId() + "-" + initialContact.getCompanyName();
        if (enrichmentCache.containsKey(cacheKey)) {
            return enrichmentCache.get(cacheKey);
        }

        DealScoutContact enriched = initialContact;

        // Attempt Cook County Assessor enrichment (for property ownership)
        try {
            DealScoutContact cookCountyData = cookCountyScraper.scrape(building.getAddress());
            if (cookCountyData != null) {
                enriched = mergeContacts(enriched, cookCountyData, "Cook County Assessor");
            }
        } catch (Exception e) {
            // Log and continue
        }

        // Attempt LinkedIn enrichment (for contacts)
        try {
            DealScoutContact linkedInData = linkedInScraper.scrape(initialContact.getCompanyName());
            if (linkedInData != null) {
                enriched = mergeContacts(enriched, linkedInData, "LinkedIn");
            }
        } catch (Exception e) {
            // Log and continue
        }

        // Attempt company website enrichment
        try {
            DealScoutContact websiteData = companyWebsiteScraper.scrape(initialContact.getWebsite());
            if (websiteData != null) {
                enriched = mergeContacts(enriched, websiteData, "Company Website");
            }
        } catch (Exception e) {
            // Log and continue
        }

        DealScoutContact verified = finalizeVerification(enriched);
        enrichmentCache.put(cacheKey, verified);
        return verified;
    }

    private DealScoutContact mergeContacts(DealScoutContact base, DealScoutContact update, String source) {
        String mergedCompany = preferNonBlank(base.getCompanyName(), update.getCompanyName());
        String mergedContact = preferNonBlank(base.getContactName(), update.getContactName());
        String mergedTitle = preferNonBlank(base.getTitle(), update.getTitle());
        String mergedEmail = preferTrustedEmail(base.getEmail(), update.getEmail());
        String mergedLinkedIn = preferNonBlank(base.getLinkedinUrl(), update.getLinkedinUrl());
        String mergedWebsite = preferNonBlank(base.getWebsite(), update.getWebsite());
        double mergedConfidence = Math.max(safeConfidence(base.getConfidence()), safeConfidence(update.getConfidence()));
        int sourceCount = safeSourceCount(base.getSourceCount()) + 1;

        return DealScoutContact.builder()
                .companyName(mergedCompany)
                .contactName(mergedContact)
                .title(mergedTitle)
                .email(mergedEmail)
                .linkedinUrl(mergedLinkedIn)
                .website(mergedWebsite)
                .sourceNotes((base.getSourceNotes() != null ? base.getSourceNotes() + "; " : "") + "Enriched from " + source)
                .confidence(mergedConfidence)
                .sourceCount(sourceCount)
                .build();
    }

    private DealScoutContact finalizeVerification(DealScoutContact contact) {
        String email = contact.getEmail();
        boolean emailValid = isRealisticEmail(email);
        boolean emailVerified = emailValid && hasMxRecord(getDomain(email));

        double confidence = safeConfidence(contact.getConfidence());
        int sourceCount = Math.max(1, safeSourceCount(contact.getSourceCount()));
        boolean confidencePass = confidence >= minConfidence;
        boolean contactPass = isNonBlank(contact.getCompanyName()) && isNonBlank(contact.getContactName());
        boolean emailPass = !requireVerifiedEmail || emailVerified;

        boolean contactVerified = confidencePass && contactPass && emailPass && sourceCount >= 2;

        String notes = "confidence=" + confidence +
                ", sourceCount=" + sourceCount +
                ", emailValid=" + emailValid +
                ", emailVerified=" + emailVerified +
                ", requireVerifiedEmail=" + requireVerifiedEmail;

        return DealScoutContact.builder()
                .companyName(contact.getCompanyName())
                .contactName(contact.getContactName())
                .title(contact.getTitle())
                .email(contact.getEmail())
                .linkedinUrl(contact.getLinkedinUrl())
                .website(contact.getWebsite())
                .sourceNotes(contact.getSourceNotes())
                .confidence(confidence)
                .emailVerified(emailVerified)
                .contactVerified(contactVerified)
                .sourceCount(sourceCount)
                .verificationNotes(notes)
                .build();
    }

    private String preferTrustedEmail(String baseEmail, String updateEmail) {
        if (isRealisticEmail(updateEmail)) {
            return updateEmail;
        }
        return isRealisticEmail(baseEmail) ? baseEmail : null;
    }

    private String preferNonBlank(String baseValue, String updateValue) {
        if (isNonBlank(updateValue)) {
            return updateValue;
        }
        return baseValue;
    }

    private boolean isNonBlank(String value) {
        return value != null && !value.isBlank();
    }

    private double safeConfidence(Double confidence) {
        return confidence == null ? 0.0 : confidence;
    }

    private int safeSourceCount(Integer sourceCount) {
        return sourceCount == null ? 1 : sourceCount;
    }

    private boolean isRealisticEmail(String email) {
        if (email == null || email.isBlank()) {
            return false;
        }
        if (!EMAIL_PATTERN.matcher(email).matches()) {
            return false;
        }
        String lower = email.toLowerCase();
        return !lower.endsWith("@example.com") && !lower.contains(".example.");
    }

    private String getDomain(String email) {
        if (!isRealisticEmail(email)) {
            return null;
        }
        int atIndex = email.indexOf('@');
        if (atIndex < 0 || atIndex == email.length() - 1) {
            return null;
        }
        return email.substring(atIndex + 1).toLowerCase();
    }

    private boolean hasMxRecord(String domain) {
        if (domain == null || domain.isBlank()) {
            return false;
        }

        try {
            Hashtable<String, String> env = new Hashtable<>();
            env.put("java.naming.factory.initial", "com.sun.jndi.dns.DnsContextFactory");
            DirContext context = new InitialDirContext(env);
            Attributes attributes = context.getAttributes(domain, new String[]{"MX"});
            return attributes != null && attributes.get("MX") != null && attributes.get("MX").size() > 0;
        } catch (Exception ignored) {
            return false;
        }
    }
}
