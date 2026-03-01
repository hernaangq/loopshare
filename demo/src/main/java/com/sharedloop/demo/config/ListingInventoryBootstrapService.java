package com.sharedloop.demo.config;

import com.sharedloop.demo.model.Building;
import com.sharedloop.demo.model.Host;
import com.sharedloop.demo.model.Listing;
import com.sharedloop.demo.repository.BuildingRepository;
import com.sharedloop.demo.repository.HostRepository;
import com.sharedloop.demo.repository.ListingRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class ListingInventoryBootstrapService {

    private final BuildingRepository buildingRepository;
    private final HostRepository hostRepository;
    private final ListingRepository listingRepository;

    @Value("${listings.autogenerate.enabled:true}")
    private boolean autoGenerateEnabled;

    @Value("${listings.autogenerate.max-buildings:2000}")
    private int maxBuildings;

    public ListingInventoryBootstrapService(BuildingRepository buildingRepository,
                                            HostRepository hostRepository,
                                            ListingRepository listingRepository) {
        this.buildingRepository = buildingRepository;
        this.hostRepository = hostRepository;
        this.listingRepository = listingRepository;
    }

    @EventListener(ApplicationReadyEvent.class)
    @Order(Ordered.LOWEST_PRECEDENCE)
    public void ensureListingsForBuildings() {
        if (!autoGenerateEnabled) {
            return;
        }

        List<Building> buildings = buildingRepository.findAll();
        int processed = 0;
        int createdListings = 0;
        int createdHosts = 0;

        for (Building building : buildings) {
            if (processed >= maxBuildings) {
                break;
            }
            processed++;

            List<Listing> existingListings = listingRepository.findByBuildingId(building.getId());
            if (!existingListings.isEmpty()) {
                continue;
            }

            Host host = ensureHostForBuilding(building);
            if (host.getId() != null) {
                createdHosts++;
            }

            Listing listing = Listing.builder()
                    .host(host)
                    .building(building)
                    .daysAvailable("MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY")
                    .desksAvailable(defaultDesks(building))
                    .pricePerDeskPerDay(estimatedPrice(building))
                    .floorNumber(defaultFloor(building))
                    .active(true)
                    .description("Auto-generated listing from Chicago building inventory. Please verify details with building management.")
                    .build();

            listingRepository.save(listing);
            createdListings++;
        }

        System.out.println("[ListingInventoryBootstrapService] Auto-generated listings: " + createdListings + " (processed buildings=" + processed + ")");
    }

    private Host ensureHostForBuilding(Building building) {
        List<Host> hosts = hostRepository.findByBuildingId(building.getId());
        if (!hosts.isEmpty()) {
            return hosts.get(0);
        }

        Host newHost = Host.builder()
                .companyName((building.getName() == null ? "Building" : building.getName()) + " Management")
                .industry("Real Estate")
                .contactName("Facilities Team")
                .contactEmail(null)
                .contactPhone(null)
                .building(building)
                .employeeCount(null)
                .description("Auto-generated host profile for imported building inventory.")
                .build();

        return hostRepository.save(newHost);
    }

    private int defaultDesks(Building building) {
        Integer total = building.getTotalDesks();
        if (total == null || total <= 0) {
            return 20;
        }
        int computed = (int) Math.max(8, Math.round(total * 0.15));
        return Math.min(computed, 120);
    }

    private double estimatedPrice(Building building) {
        String neighborhood = building.getNeighborhood() == null ? "" : building.getNeighborhood().toLowerCase();
        if (neighborhood.contains("loop")) {
            return 55.0;
        }
        if (neighborhood.contains("river")) {
            return 50.0;
        }
        return 45.0;
    }

    private Integer defaultFloor(Building building) {
        if (building.getFloors() == null || building.getFloors() <= 0) {
            return null;
        }
        return Math.max(1, Math.min(10, building.getFloors() / 4));
    }
}
