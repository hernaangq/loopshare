package com.sharedloop.demo.model;

import lombok.*;
import javax.persistence.*;

@Entity
@Table(name = "startups")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Startup {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String companyName;

    private String industry;

    private String contactName;

    private String contactEmail;

    private String contactPhone;

    private Integer teamSize;

    /** Comma-separated days they need space: "MONDAY,TUESDAY,WEDNESDAY" */
    @Column(nullable = false)
    private String daysNeeded;

    private Integer desksNeeded;

    private String description; // brief about the startup
}
