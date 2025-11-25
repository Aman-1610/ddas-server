package com.aman.ddas.server.controller;

import com.aman.ddas.server.dto.DashboardStatsResponse;
import com.aman.ddas.server.model.DownloadedFile;
import com.aman.ddas.server.repository.DownloadedFileRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/dashboard")
@CrossOrigin(origins = "*")
public class DashboardController {

    private final DownloadedFileRepository repository;

    @Autowired
    public DashboardController(DownloadedFileRepository repository) {
        this.repository = repository;
    }

    @GetMapping("/stats")
    public DashboardStatsResponse getStats() {
        DashboardStatsResponse response = new DashboardStatsResponse();

        // 1. Total Downloads
        long totalDownloads = repository.count();
        response.setTotalDownloads(totalDownloads);

        // 2. Active Users
        long activeUsers = repository.countDistinctDownloaderIds();
        response.setActiveUsers(activeUsers);

        // 3. Duplicates Blocked (Mock logic for now)
        response.setDuplicatesBlocked((long) (totalDownloads * 0.25));

        // 4. Storage Saved (Mock logic)
        long savedBytes = response.getDuplicatesBlocked() * 5 * 1024 * 1024;
        response.setStorageSaved(formatSize(savedBytes));

        // 5. Recent Activity
        List<DownloadedFile> recentFiles = repository.findTop5ByOrderByDownloadTimestampDesc();
        List<DashboardStatsResponse.RecentActivityDto> activityList = recentFiles.stream().map(this::mapToDto)
                .collect(Collectors.toList());

        response.setRecentActivity(activityList);

        return response;
    }

    @GetMapping("/search")
    public List<DashboardStatsResponse.RecentActivityDto> searchFiles(
            @org.springframework.web.bind.annotation.RequestParam String query) {
        List<DownloadedFile> results = repository
                .findByFileNameContainingIgnoreCaseOrDownloaderIdContainingIgnoreCase(query, query);
        return results.stream().map(this::mapToDto).collect(Collectors.toList());
    }

    @GetMapping("/history")
    public List<DashboardStatsResponse.RecentActivityDto> getHistory() {
        // In a real app, add pagination here
        List<DownloadedFile> allFiles = repository.findAll(org.springframework.data.domain.Sort
                .by(org.springframework.data.domain.Sort.Direction.DESC, "downloadTimestamp"));
        return allFiles.stream().map(this::mapToDto).collect(Collectors.toList());
    }

    private DashboardStatsResponse.RecentActivityDto mapToDto(DownloadedFile file) {
        DashboardStatsResponse.RecentActivityDto dto = new DashboardStatsResponse.RecentActivityDto();
        dto.setId(file.getId());
        dto.setName(file.getFileName());
        dto.setSize(formatSize(file.getContentLength() != null ? file.getContentLength() : 0));
        dto.setUser(file.getDownloaderId());
        dto.setStatus("Saved");
        dto.setDate(file.getDownloadTimestamp().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")));
        return dto;
    }

    private String formatSize(long bytes) {
        if (bytes < 1024)
            return bytes + " B";
        int exp = (int) (Math.log(bytes) / Math.log(1024));
        String pre = "KMGTPE".charAt(exp - 1) + "";
        return String.format("%.1f %sB", bytes / Math.pow(1024, exp), pre);
    }
}
