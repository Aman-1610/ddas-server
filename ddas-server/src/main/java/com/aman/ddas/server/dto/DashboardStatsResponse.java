package com.aman.ddas.server.dto;

import lombok.Data;
import java.util.List;

@Data
public class DashboardStatsResponse {
    private long totalDownloads;
    private long duplicatesBlocked; // We might need to track this separately or estimate it
    private String storageSaved;
    private long activeUsers;
    private List<RecentActivityDto> recentActivity;

    @Data
    public static class RecentActivityDto {
        private Long id;
        private String name;
        private String size;
        private String date;
        private String status;
        private String user;
    }
}
