package com.sharedloop.demo.controller;

import com.sharedloop.demo.model.Host;
import com.sharedloop.demo.repository.HostRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/hosts")
@CrossOrigin(origins = "*")
@Tag(name = "Hosts", description = "Corporations offering desk space")
public class HostController {

    private final HostRepository repo;

    public HostController(HostRepository repo) {
        this.repo = repo;
    }

    @GetMapping
    @Operation(summary = "List all hosts")
    public List<Host> getAll() {
        return repo.findAll();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get host by ID")
    public ResponseEntity<Host> getById(@PathVariable Long id) {
        return repo.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/search")
    @Operation(summary = "Search hosts by company name")
    public List<Host> searchByName(@RequestParam String name) {
        return repo.findByCompanyNameContainingIgnoreCase(name);
    }

    @GetMapping("/building/{buildingId}")
    @Operation(summary = "List hosts in a given building")
    public List<Host> getByBuilding(@PathVariable Long buildingId) {
        return repo.findByBuildingId(buildingId);
    }

    @PostMapping
    @Operation(summary = "Register a new host corporation")
    public Host create(@RequestBody Host host) {
        return repo.save(host);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update a host")
    public ResponseEntity<Host> update(@PathVariable Long id, @RequestBody Host host) {
        return repo.findById(id).map(existing -> {
            host.setId(id);
            return ResponseEntity.ok(repo.save(host));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a host")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (repo.existsById(id)) {
            repo.deleteById(id);
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }
}
