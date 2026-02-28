package com.sharedloop.demo.repository;

import com.sharedloop.demo.model.Listing;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ListingRepository extends JpaRepository<Listing, Long> {

    List<Listing> findByHostId(Long hostId);

    List<Listing> findByBuildingId(Long buildingId);

    List<Listing> findByActiveTrue();

    /** Find active listings that include a specific day of the week */
    @Query("SELECT l FROM Listing l WHERE l.active = true AND l.daysAvailable LIKE %:day%")
    List<Listing> findActiveByDay(@Param("day") String day);

    /** Find active listings with enough desks */
    @Query("SELECT l FROM Listing l WHERE l.active = true AND l.desksAvailable >= :minDesks")
    List<Listing> findActiveByMinDesks(@Param("minDesks") Integer minDesks);
}
