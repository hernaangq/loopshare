package com.sharedloop.demo.model;

import lombok.*;
import javax.persistence.*;

@Entity
@Table(name = "hosts")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Host {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String companyName;

    private String industry;

    private String contactName;

    private String contactEmail;

    private String contactPhone;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "building_id")
    private Building building;

    private Integer employeeCount;

    private String description; // brief about the corporation
}
