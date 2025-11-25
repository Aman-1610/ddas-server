package com.aman.ddas.server.service;

import com.aman.ddas.server.repository.DownloadedFileRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class QuotaService {

    private static final long DAILY_LIMIT_BYTES = 1024 * 1024 * 1024; // 1 GB

    private final DownloadedFileRepository repository;

    @Autowired
    public QuotaService(DownloadedFileRepository repository) {
        this.repository = repository;
    }

    public boolean isQuotaExceeded(String downloaderId, long newFileSize) {
        LocalDateTime startOfDay = LocalDateTime.now().withHour(0).withMinute(0).withSecond(0).withNano(0);
        Long currentUsage = repository.sumContentLengthByDownloaderIdAndTimestampAfter(downloaderId, startOfDay);

        if (currentUsage == null) {
            currentUsage = 0L;
        }

        return (currentUsage + newFileSize) > DAILY_LIMIT_BYTES;
    }

    public long getRemainingQuota(String downloaderId) {
        LocalDateTime startOfDay = LocalDateTime.now().withHour(0).withMinute(0).withSecond(0).withNano(0);
        Long currentUsage = repository.sumContentLengthByDownloaderIdAndTimestampAfter(downloaderId, startOfDay);

        if (currentUsage == null) {
            currentUsage = 0L;
        }

        return Math.max(0, DAILY_LIMIT_BYTES - currentUsage);
    }
}
