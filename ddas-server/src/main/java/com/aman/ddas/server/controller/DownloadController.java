package com.aman.ddas.server.controller;

import com.aman.ddas.server.dto.DuplicateCheckRequest;
import com.aman.ddas.server.dto.DuplicateCheckResponse;
import com.aman.ddas.server.dto.LogFileRequest;
import com.aman.ddas.server.model.DownloadedFile;
import com.aman.ddas.server.service.DownloadCheckService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/downloads")
@CrossOrigin(origins = "*")
public class DownloadController {

    private final DownloadCheckService service;

    @Autowired
    public DownloadController(DownloadCheckService service) {
        this.service = service;
    }

    @PostMapping("/check")
    public DuplicateCheckResponse checkDuplicate(@RequestBody DuplicateCheckRequest request) {
        return service.checkForDuplicate(request);
    }

    @PostMapping("/log")
    public ResponseEntity<DownloadedFile> logNewFile(@RequestBody LogFileRequest request) {
        DownloadedFile savedFile = service.logNewFile(request);
        // This ensures we always return a valid response that can be parsed as JSON
        if (savedFile != null) {
            return ResponseEntity.ok(savedFile);
        } else {
            // This case might happen if the file was already logged by another process.
            // A "No Content" response is valid and won't cause a JSON error.
            return ResponseEntity.noContent().build();
        }
    }
}