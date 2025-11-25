package com.aman.ddas.server.service;

import com.aman.ddas.server.model.DownloadedFile;
import com.aman.ddas.server.repository.DownloadedFileRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class CleanupService {

    private final DownloadedFileRepository repository;

    @Autowired
    public CleanupService(DownloadedFileRepository repository) {
        this.repository = repository;
    }

    // Run every day at 3 AM
    @Scheduled(cron = "0 0 3 * * ?")
    public void flagOldFiles() {
        System.out.println("CLEANUP: Starting daily cleanup check...");
        LocalDateTime oneYearAgo = LocalDateTime.now().minusYears(1);

        List<DownloadedFile> oldFiles = repository.findByDownloadTimestampBefore(oneYearAgo);

        if (oldFiles.isEmpty()) {
            System.out.println("CLEANUP: No files older than 1 year found.");
            return;
        }

        System.out.println("CLEANUP: Found " + oldFiles.size() + " files older than 1 year.");
        for (DownloadedFile file : oldFiles) {
            // In a real app, we might email the user or move the file to cold storage.
            // For now, we just log it.
            System.out.println(
                    "CLEANUP: Flagging file for review: " + file.getFileName() + " (ID: " + file.getId() + ")");
        }
    }
}
