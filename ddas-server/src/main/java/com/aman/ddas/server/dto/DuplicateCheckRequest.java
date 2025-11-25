package com.aman.ddas.server.dto;

import lombok.Data;

@Data
public class DuplicateCheckRequest {
    private String originalUrl;
    private String etag;
    private Long contentLength;
    private String fileName;
    private String downloaderId;
}
