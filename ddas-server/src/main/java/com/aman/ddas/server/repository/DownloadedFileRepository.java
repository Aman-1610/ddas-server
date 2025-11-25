package com.aman.ddas.server.repository;

import com.aman.ddas.server.model.DownloadedFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DownloadedFileRepository extends JpaRepository<DownloadedFile, Long> {

    Optional<DownloadedFile> findByEtagAndContentLength(String etag, Long contentLength);

    Optional<DownloadedFile> findByOriginalUrl(String originalUrl);

    Optional<DownloadedFile> findByFileHash(String fileHash);

    /**
     * Finds a file record based on its filename.
     * This is the "weak" check we need to add back.
     */
    Optional<DownloadedFile> findFirstByFileName(String fileName);

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(DISTINCT d.downloaderId) FROM DownloadedFile d")
    long countDistinctDownloaderIds();

    java.util.List<DownloadedFile> findTop5ByOrderByDownloadTimestampDesc();

    // Search
    java.util.List<DownloadedFile> findByFileNameContainingIgnoreCaseOrDownloaderIdContainingIgnoreCase(String fileName,
            String downloaderId);

    // Quota: Sum content length for a user today
    @org.springframework.data.jpa.repository.Query("SELECT SUM(d.contentLength) FROM DownloadedFile d WHERE d.downloaderId = :downloaderId AND d.downloadTimestamp >= :startOfDay")
    Long sumContentLengthByDownloaderIdAndTimestampAfter(String downloaderId, java.time.LocalDateTime startOfDay);

    // Cleanup: Find files older than date
    java.util.List<DownloadedFile> findByDownloadTimestampBefore(java.time.LocalDateTime cutoffDate);

    @org.springframework.data.jpa.repository.Query("SELECT d FROM DownloadedFile d WHERE d.fileName = :exactName OR d.fileName LIKE :likePattern")
    java.util.List<DownloadedFile> findPotentialDuplicates(
            @org.springframework.data.repository.query.Param("exactName") String exactName,
            @org.springframework.data.repository.query.Param("likePattern") String likePattern);
}