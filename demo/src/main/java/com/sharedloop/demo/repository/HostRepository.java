package com.sharedloop.demo.repository;

import com.sharedloop.demo.model.Host;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface HostRepository extends JpaRepository<Host, Long> {

    List<Host> findByBuildingId(Long buildingId);

    List<Host> findByCompanyNameContainingIgnoreCase(String companyName);
}
