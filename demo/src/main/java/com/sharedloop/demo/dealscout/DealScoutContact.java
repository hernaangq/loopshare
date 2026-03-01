package com.sharedloop.demo.dealscout;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class DealScoutContact {
    private String companyName;
    private String contactName;
    private String title;
    private String email;
    private String linkedinUrl;
    private String website;
    private String sourceNotes;
    private Double confidence;
}
