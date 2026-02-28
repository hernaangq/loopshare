package com.sharedloop.demo.controller;

import com.sharedloop.demo.model.Booking;
import com.sharedloop.demo.repository.BookingRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/bookings")
@CrossOrigin(origins = "*")
@Tag(name = "Bookings", description = "Desk space reservations")
public class BookingController {

    private final BookingRepository repo;

    public BookingController(BookingRepository repo) {
        this.repo = repo;
    }

    @GetMapping
    @Operation(summary = "List all bookings")
    public List<Booking> getAll() {
        return repo.findAll();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get booking by ID")
    public ResponseEntity<Booking> getById(@PathVariable Long id) {
        return repo.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/startup/{startupId}")
    @Operation(summary = "List bookings by startup")
    public List<Booking> getByStartup(@PathVariable Long startupId) {
        return repo.findByStartupId(startupId);
    }

    @GetMapping("/listing/{listingId}")
    @Operation(summary = "List bookings by listing")
    public List<Booking> getByListing(@PathVariable Long listingId) {
        return repo.findByListingId(listingId);
    }

    @GetMapping("/status/{status}")
    @Operation(summary = "List bookings by status (PENDING, CONFIRMED, CANCELLED)")
    public List<Booking> getByStatus(@PathVariable String status) {
        return repo.findByStatus(status.toUpperCase());
    }

    @PostMapping
    @Operation(summary = "Create a new booking")
    public Booking create(@RequestBody Booking booking) {
        if (booking.getStatus() == null) {
            booking.setStatus("PENDING");
        }
        // Calculate total price if not provided
        if (booking.getTotalPrice() == null && booking.getListing() != null
                && booking.getListing().getPricePerDeskPerDay() != null) {
            booking.setTotalPrice(
                    booking.getDesksBooked() * booking.getListing().getPricePerDeskPerDay());
        }
        return repo.save(booking);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update a booking")
    public ResponseEntity<Booking> update(@PathVariable Long id, @RequestBody Booking booking) {
        return repo.findById(id).map(existing -> {
            booking.setId(id);
            return ResponseEntity.ok(repo.save(booking));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Update booking status (PENDING -> CONFIRMED or CANCELLED)")
    public ResponseEntity<Booking> updateStatus(@PathVariable Long id, @RequestParam String status) {
        return repo.findById(id).map(existing -> {
            existing.setStatus(status.toUpperCase());
            return ResponseEntity.ok(repo.save(existing));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a booking")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (repo.existsById(id)) {
            repo.deleteById(id);
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }
}
