package com.sharedloop.demo.model;

import lombok.*;
import javax.persistence.*;

@Entity
@Table(name = "listings")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Listing {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "host_id", nullable = false)
    private Host host;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "building_id", nullable = false)
    private Building building;

    /** Comma-separated days available: "MONDAY,WEDNESDAY,FRIDAY" */
    @Column(nullable = false)
    private String daysAvailable;

    /** Number of desks offered in this listing */
    @Column(nullable = false)
    private Integer desksAvailable;

    /** Price per desk per day in USD */
    @Column(nullable = false)
    private Double pricePerDeskPerDay;

    private Integer floorNumber;

    private Boolean active;

    private String description; // any notes about the space
}
