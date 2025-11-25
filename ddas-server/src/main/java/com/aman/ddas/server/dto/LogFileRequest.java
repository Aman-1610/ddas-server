package com.aman.ddas.server.dto;

import lombok.Data;

/**
 * Data Transfer Object for logging a new file download.
 * This class defines the structure of the JSON request body
 * sent from the browser extension to the server's /log endpoint.
 */
@Data
public class LogFileRequest {
    private String originalUrl;
    private String fileName;
    private String fileHash;
    private String etag;
    private Long contentLength;
    private String localStoragePath;
    private String downloaderId;

    // The new field to receive the computer/desktop name from the extension
    private String desktopId;
}