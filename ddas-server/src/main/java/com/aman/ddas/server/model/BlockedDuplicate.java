package com.aman.ddas.server.model;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Entity
public class BlockedDuplicate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String fileName;

    @Column
    private Long fileSize;

    @Column
    private String downloaderId;

    @Column(nullable = false)
    private LocalDateTime blockedTimestamp;

    @Column
    private Long originalFileId;
}
