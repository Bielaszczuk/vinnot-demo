package com.vinnot.shared.infrastructure.web.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

@RestController
@Tag(name = "Health", description = "Health check endpoints")
public class HealthController {

    @Value("${app.version:0.0.1}")
    private String appVersion;

    @Value("${spring.application.name:vinnot-backend}")
    private String appName;

    @Value("${APP_REVISION:unknown}")
    private String revision;

    /**
     * Health check endpoint.
     *
     * @return health status
     */
    @GetMapping("/health")
    @Operation(summary = "Health check")
    public ResponseEntity<Map<String, Object>> health() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "timestamp", Instant.now(),
                "service", appName,
                "version", appVersion
        ));
    }

    /**
     * Version endpoint.
     *
     * @return version info
     */
    @GetMapping("/version")
    @Operation(summary = "Get version info")
    public ResponseEntity<Map<String, Object>> version() {
        return ResponseEntity.ok(Map.of(
                "version", appVersion,
                "name", appName,
                "java", System.getProperty("java.version"),
                "revision", revision,
                "timestamp", Instant.now()
        ));
    }
}

