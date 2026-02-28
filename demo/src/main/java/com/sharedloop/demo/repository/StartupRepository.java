package com.sharedloop.demo.repository;

import com.sharedloop.demo.model.Startup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StartupRepository extends JpaRepository<Startup, Long> {

    List<Startup> findByCompanyNameContainingIgnoreCase(String companyName);
}
