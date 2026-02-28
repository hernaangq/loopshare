package com.sharedloop.demo.model;

import lombok.*;
import javax.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "bookings")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "listing_id", nullable = false)
    private Listing listing;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "startup_id", nullable = false)
    private Startup startup;

    @Column(nullable = false)
    private LocalDate bookingDate;

    @Column(nullable = false)
    private Integer desksBooked;

    @Column(nullable = false)
    private Double totalPrice;

    /** PENDING, CONFIRMED, CANCELLED */
    @Column(nullable = false)
    private String status;
}
