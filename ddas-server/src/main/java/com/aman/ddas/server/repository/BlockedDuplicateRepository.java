package com.aman.ddas.server.repository;

import com.aman.ddas.server.model.BlockedDuplicate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface BlockedDuplicateRepository extends JpaRepository<BlockedDuplicate, Long> {

    @Query("SELECT SUM(b.fileSize) FROM BlockedDuplicate b")
    Long getTotalStorageSaved();
}
