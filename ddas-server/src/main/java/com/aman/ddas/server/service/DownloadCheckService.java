package com.aman.ddas.server.service;

import com.aman.ddas.server.dto.DuplicateCheckRequest;
import com.aman.ddas.server.dto.DuplicateCheckResponse;
import com.aman.ddas.server.dto.LogFileRequest;
import com.aman.ddas.server.model.DownloadedFile;
import com.aman.ddas.server.repository.DownloadedFileRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class DownloadCheckService {

    private final DownloadedFileRepository repository;
    private final QuotaService quotaService;

    @Autowired
    public DownloadCheckService(DownloadedFileRepository repository, QuotaService quotaService) {
        this.repository = repository;
        this.quotaService = quotaService;
    }

    /**
     * Finds the first available duplicate record based on the available metadata.
     */
    private Optional<DownloadedFile> findDuplicate(DuplicateCheckRequest request) {
        // Primary check: ETag and Content-Length (most reliable)
        if (request.getEtag() != null && request.getContentLength() != null) {
            Optional<DownloadedFile> existingFile = repository.findByEtagAndContentLength(
                    request.getEtag(), request.getContentLength());
            if (existingFile.isPresent()) {
                System.out.println("CHECK: Duplicate found by ETag/Length");
                return existingFile;
            }
        }

        // Secondary check: Original URL (reliable)
        if (request.getOriginalUrl() != null) {
            Optional<DownloadedFile> existingFile = repository.findByOriginalUrl(request.getOriginalUrl());
            if (existingFile.isPresent()) {
                System.out.println("CHECK: Duplicate found by URL");
                return existingFile;
            }
        }

        // Final fallback: Filename + Fuzzy Matching
        if (request.getFileName() != null) {
            // 1. Exact Match
            Optional<DownloadedFile> existingFile = repository.findFirstByFileName(request.getFileName());
            if (existingFile.isPresent()) {
                System.out.println("CHECK: Duplicate found by Filename (Exact)");
                return existingFile;
            }
        }

        return Optional.empty();
    }

    public DuplicateCheckResponse checkForDuplicate(DuplicateCheckRequest request) {
        Optional<DownloadedFile> duplicate = findDuplicate(request);
        if (duplicate.isPresent()) {
            return DuplicateCheckResponse.duplicate(duplicate.get());
        } else {
            System.out.println("CHECK: No duplicate found.");
            return DuplicateCheckResponse.notADuplicate();
        }
    }

    public DownloadedFile logNewFile(LogFileRequest request) {
        // Check Quota First
        if (request.getContentLength() != null
                && quotaService.isQuotaExceeded(request.getDownloaderId(), request.getContentLength())) {
            System.out.println("LOG: Quota exceeded for user " + request.getDownloaderId());
            // In a real app, we might throw an exception or return a special status.
            // For now, we log it but still allow the save (or we could block it).
            // Let's just log a warning.
        }

        // We run the *exact same* check before logging.
        DuplicateCheckRequest checkRequest = new DuplicateCheckRequest();
        checkRequest.setEtag(request.getEtag());
        checkRequest.setContentLength(request.getContentLength());
        checkRequest.setOriginalUrl(request.getOriginalUrl());
        checkRequest.setFileName(request.getFileName());

        Optional<DownloadedFile> duplicate = findDuplicate(checkRequest);

        if (duplicate.isPresent()) {
            System.out.println("LOG: File is a duplicate. Not logging again.");
            return duplicate.get();
        }

        // If no duplicates are found, create and save the new file record
        System.out.println("LOG: No duplicate found. Inserting new file record.");
        DownloadedFile newFile = new DownloadedFile();
        newFile.setOriginalUrl(request.getOriginalUrl());
        newFile.setFileName(request.getFileName());
        newFile.setEtag(request.getEtag());
        newFile.setContentLength(request.getContentLength());

        // Try to calculate hash if file is accessible locally
        String calculatedHash = request.getFileHash();
        if (calculatedHash == null && request.getLocalStoragePath() != null) {
            try {
                File file = new File(request.getLocalStoragePath());
                if (file.exists() && file.canRead()) {
                    calculatedHash = calculateFileHash(file);
                    System.out.println("LOG: Calculated SHA-256 hash: " + calculatedHash);
                }
            } catch (Exception e) {
                System.err.println("LOG: Failed to calculate hash: " + e.getMessage());
            }
        }
        newFile.setFileHash(calculatedHash);

        // Check for duplicate by Hash (The ultimate check)
        if (calculatedHash != null) {
            Optional<DownloadedFile> hashMatch = repository.findByFileHash(calculatedHash);
            if (hashMatch.isPresent()) {
                System.out.println("LOG: Duplicate found by File Hash. Not logging again.");
                return hashMatch.get();
            }
        }

        newFile.setDownloaderId(request.getDownloaderId());
        newFile.setLocalStoragePath(request.getLocalStoragePath());
        newFile.setDesktopId(request.getDesktopId());
        newFile.setDownloadTimestamp(LocalDateTime.now());

        try {
            return repository.save(newFile);
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            System.err.println("LOG: Data integrity violation (likely duplicate hash): " + e.getMessage());
            // Try to recover by finding the duplicate that caused this
            if (calculatedHash != null) {
                return repository.findByFileHash(calculatedHash).orElse(null);
            }
            return null;
        }
    }

    private String calculateFileHash(File file) throws IOException, NoSuchAlgorithmException {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        try (InputStream fis = new FileInputStream(file)) {
            byte[] byteArray = new byte[1024];
            int bytesCount = 0;
            while ((bytesCount = fis.read(byteArray)) != -1) {
                digest.update(byteArray, 0, bytesCount);
            }
        }
        byte[] bytes = digest.digest();
        StringBuilder sb = new StringBuilder();
        for (byte aByte : bytes) {
            sb.append(Integer.toString((aByte & 0xff) + 0x100, 16).substring(1));
        }
        return sb.toString();
    }

}
