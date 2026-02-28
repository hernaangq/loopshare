package com.sharedloop.demo.repository;

import com.sharedloop.demo.model.Booking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {

    List<Booking> findByStartupId(Long startupId);

    List<Booking> findByListingId(Long listingId);

    List<Booking> findByBookingDate(LocalDate date);

    List<Booking> findByStatus(String status);

    List<Booking> findByStartupIdAndStatus(Long startupId, String status);
}
