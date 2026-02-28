package com.sharedloop.demo.controller;

import com.sharedloop.demo.model.Listing;
import com.sharedloop.demo.repository.ListingRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/listings")
@CrossOrigin(origins = "*")
@Tag(name = "Listings", description = "Available desk space listings")
public class ListingController {

    private final ListingRepository repo;

    public ListingController(ListingRepository repo) {
        this.repo = repo;
    }

    @GetMapping
    @Operation(summary = "List all listings")
    public List<Listing> getAll() {
        return repo.findAll();
    }

    @GetMapping("/active")
    @Operation(summary = "List all active listings")
    public List<Listing> getActive() {
        return repo.findByActiveTrue();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get listing by ID")
    public ResponseEntity<Listing> getById(@PathVariable Long id) {
        return repo.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/host/{hostId}")
    @Operation(summary = "List listings by host")
    public List<Listing> getByHost(@PathVariable Long hostId) {
        return repo.findByHostId(hostId);
    }

    @GetMapping("/building/{buildingId}")
    @Operation(summary = "List listings by building")
    public List<Listing> getByBuilding(@PathVariable Long buildingId) {
        return repo.findByBuildingId(buildingId);
    }

    @GetMapping("/day/{day}")
    @Operation(summary = "Find active listings available on a specific day (MONDAY,TUESDAY,...)")
    public List<Listing> getByDay(@PathVariable String day) {
        return repo.findActiveByDay(day.toUpperCase());
    }

    @GetMapping("/desks/{minDesks}")
    @Operation(summary = "Find active listings with at least N desks available")
    public List<Listing> getByMinDesks(@PathVariable Integer minDesks) {
        return repo.findActiveByMinDesks(minDesks);
    }

    @PostMapping
    @Operation(summary = "Create a new listing")
    public Listing create(@RequestBody Listing listing) {
        if (listing.getActive() == null) {
            listing.setActive(true);
        }
        return repo.save(listing);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update a listing")
    public ResponseEntity<Listing> update(@PathVariable Long id, @RequestBody Listing listing) {
        return repo.findById(id).map(existing -> {
            listing.setId(id);
            return ResponseEntity.ok(repo.save(listing));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a listing")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (repo.existsById(id)) {
            repo.deleteById(id);
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }
}
