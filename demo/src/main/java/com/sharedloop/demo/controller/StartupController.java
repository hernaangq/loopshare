package com.sharedloop.demo.controller;

import com.sharedloop.demo.model.Startup;
import com.sharedloop.demo.repository.StartupRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/startups")
@CrossOrigin(origins = "*")
@Tag(name = "Startups", description = "Startups seeking desk space")
public class StartupController {

    private final StartupRepository repo;

    public StartupController(StartupRepository repo) {
        this.repo = repo;
    }

    @GetMapping
    @Operation(summary = "List all startups")
    public List<Startup> getAll() {
        return repo.findAll();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get startup by ID")
    public ResponseEntity<Startup> getById(@PathVariable Long id) {
        return repo.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/search")
    @Operation(summary = "Search startups by company name")
    public List<Startup> searchByName(@RequestParam String name) {
        return repo.findByCompanyNameContainingIgnoreCase(name);
    }

    @PostMapping
    @Operation(summary = "Register a new startup")
    public Startup create(@RequestBody Startup startup) {
        return repo.save(startup);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update a startup")
    public ResponseEntity<Startup> update(@PathVariable Long id, @RequestBody Startup startup) {
        return repo.findById(id).map(existing -> {
            startup.setId(id);
            return ResponseEntity.ok(repo.save(startup));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a startup")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (repo.existsById(id)) {
            repo.deleteById(id);
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }
}
