package com.sharedloop.demo.model;

import lombok.*;
import javax.persistence.*;

@Entity
@Table(name = "buildings")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Building {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String address;

    private String neighborhood; // e.g. "West Loop", "The Loop", "South Loop"

    private Integer floors;

    private Integer totalDesks;

    private String amenities; // comma-separated: "WiFi,Coffee,Parking,Conference Rooms"

    private Double latitude;

    private Double longitude;

    private String imageUrl;
}
