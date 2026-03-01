package com.sharedloop.demo.repository;

import com.sharedloop.demo.model.Building;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BuildingRepository extends JpaRepository<Building, Long> {

    List<Building> findByNeighborhood(String neighborhood);

    List<Building> findByNameContainingIgnoreCase(String name);
}
