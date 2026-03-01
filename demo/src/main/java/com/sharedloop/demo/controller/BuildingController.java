package com.sharedloop.demo.controller;
import com.sharedloop.demo.model.Building;
import com.sharedloop.demo.repository.BuildingRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/buildings")
@CrossOrigin(origins = "*")
@Tag(name = "Buildings", description = "Chicago Loop office buildings")
public class BuildingController {

    private final BuildingRepository repo;

    public BuildingController(BuildingRepository repo) {
        this.repo = repo;
    }

    @GetMapping
    @Operation(summary = "List all buildings")
    public List<Building> getAll() {
        return repo.findAll();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get building by ID")
    public ResponseEntity<Building> getById(@PathVariable Long id) {
        return repo.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/search")
    @Operation(summary = "Search buildings by name")
    public List<Building> searchByName(@RequestParam String name) {
        return repo.findByNameContainingIgnoreCase(name);
    }

    @GetMapping("/neighborhood/{neighborhood}")
    @Operation(summary = "List buildings by neighborhood")
    public List<Building> getByNeighborhood(@PathVariable String neighborhood) {
        return repo.findByNeighborhood(neighborhood);
    }

    @PostMapping
    @Operation(summary = "Create a new building")
    public Building create(@RequestBody Building building) {
        return repo.save(building);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update a building")
    public ResponseEntity<Building> update(@PathVariable Long id, @RequestBody Building building) {
        return repo.findById(id).map(existing -> {
            building.setId(id);
            return ResponseEntity.ok(repo.save(building));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a building")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (repo.existsById(id)) {
            repo.deleteById(id);
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }
}
