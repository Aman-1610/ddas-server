package com.aman.ddas.server.service;

import com.aman.ddas.server.dto.DuplicateCheckRequest;
import com.aman.ddas.server.dto.DuplicateCheckResponse;
import com.aman.ddas.server.dto.LogFileRequest;
import com.aman.ddas.server.model.BlockedDuplicate;
import com.aman.ddas.server.model.DownloadedFile;
import com.aman.ddas.server.repository.BlockedDuplicateRepository;
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
    private final BlockedDuplicateRepository blockedRepository;
    private final QuotaService quotaService;

    @Autowired
    public DownloadCheckService(DownloadedFileRepository repository, BlockedDuplicateRepository blockedRepository,
            QuotaService quotaService) {
        this.repository = repository;
        this.blockedRepository = blockedRepository;
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
            String requestedName = request.getFileName();

            // 1. Exact Match
            Optional<DownloadedFile> existingFile = repository.findFirstByFileName(requestedName);
            if (existingFile.isPresent()) {
                System.out.println("CHECK: Duplicate found by Filename (Exact)");
                return existingFile;
            }

            // 2. Smart Match (Strip " (N)" suffix)
            // Regex to match " (1)", " (2)", " (1) (1)", etc. at the end of the name
            // (before extension)
            // Example: "report (1).docx" -> "report.docx"
            // Example: "image (2).png" -> "image.png"
            String cleanName = requestedName.replaceAll(" \\(\\d+\\)(?=\\.[^.]+$|$)", "");

            if (!cleanName.equals(requestedName)) {
                System.out.println("CHECK: Checking for clean filename: " + cleanName);
                Optional<DownloadedFile> cleanMatch = repository.findFirstByFileName(cleanName);
                if (cleanMatch.isPresent()) {
                    System.out.println("CHECK: Duplicate found by Filename (Smart Match)");
                    return cleanMatch;
                }
            }
        }

        return Optional.empty();
    }

    public DuplicateCheckResponse checkForDuplicate(DuplicateCheckRequest request) {
        Optional<DownloadedFile> duplicate = findDuplicate(request);
        if (duplicate.isPresent()) {
            // Log the blocked duplicate
            try {
                BlockedDuplicate blocked = new BlockedDuplicate();
                blocked.setFileName(
                        request.getFileName() != null ? request.getFileName() : duplicate.get().getFileName());
                // Use the size of the EXISTING file, as the request might not have the length
                // yet
                blocked.setFileSize(
                        duplicate.get().getContentLength() != null ? duplicate.get().getContentLength() : 0L);
                blocked.setDownloaderId(request.getDownloaderId() != null ? request.getDownloaderId() : "Unknown");
                blocked.setBlockedTimestamp(LocalDateTime.now());
                blocked.setOriginalFileId(duplicate.get().getId());
                blockedRepository.save(blocked);
                System.out.println("LOG: Blocked duplicate logged for file: " + blocked.getFileName());
            } catch (Exception e) {
                System.err.println("LOG: Failed to log blocked duplicate: " + e.getMessage());
            }

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
        // Try to calculate hash and signature if file is accessible locally
        String calculatedHash = request.getFileHash();
        String fileSignature = null;

        if (request.getLocalStoragePath() != null) {
            try {
                File file = new File(request.getLocalStoragePath());
                if (file.exists() && file.canRead()) {
                    // 1. Calculate SHA-256 (Content-based Identity)
                    // If not provided by client, calculate it here
                    if (calculatedHash == null) {
                        calculatedHash = calculateFileHash(file);
                        System.out.println("LOG: Calculated SHA-256 hash: " + calculatedHash);
                    }

                    // 2. File Signature Analysis (Magic Numbers)
                    // Read header hex code to verify true file type
                    fileSignature = determineFileSignature(file);
                    System.out.println("LOG: Block Structure Analysis / Magic Number: " + fileSignature);
                }
            } catch (Exception e) {
                System.err.println("LOG: Failed to analyze file: " + e.getMessage());
            }
        }
        newFile.setFileHash(calculatedHash);
        newFile.setFileSignature(fileSignature);

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

    /**
     * Reads the first 8 bytes of the file to determine its Magic Number
     * (Signature).
     * This allows us to verify the file type regardless of extension.
     */
    private String determineFileSignature(File file) throws IOException {
        try (InputStream fis = new FileInputStream(file)) {
            byte[] header = new byte[8];
            int bytesRead = fis.read(header);
            if (bytesRead == -1)
                return null;

            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < bytesRead; i++) {
                sb.append(String.format("%02X", header[i]));
            }
            return sb.toString();
        }
    }

}
