package com.aman.ddas.server.model;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Entity
public class DownloadedFile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 2048)
    private String originalUrl;

    @Column(nullable = false)
    private String fileName;

    // This is the new field to store the computer name
    @Column
    private String desktopId;

    @Column
    private String localStoragePath;

    @Column
    private String etag;

    @Column
    private Long contentLength;

    @Column(unique = true)
    private String fileHash;

    @Column
    private String fileSignature;

    @Column
    private String downloaderId;

    @Column(nullable = false)
    private LocalDateTime downloadTimestamp;
}