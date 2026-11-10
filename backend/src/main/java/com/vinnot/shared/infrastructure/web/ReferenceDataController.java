package com.vinnot.shared.infrastructure.web;

import com.vinnot.shared.application.dto.ReferenceDataResponse;
import com.vinnot.shared.application.port.ReferenceDataQueryPort;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import lombok.RequiredArgsConstructor;

/**
 * Serves DB-backed reference data (wine types, event types, event statuses).
 * These replace hardcoded frontend enums and enable admin-managed catalogs.
 */
@RestController
@RequestMapping("/reference")
@Tag(name = "Reference Data", description = "DB-backed catalog of types and statuses")
@RequiredArgsConstructor
public class ReferenceDataController {

    private final ReferenceDataQueryPort referenceDataQueryPort;

    @GetMapping("/wine-types")
    @Operation(summary = "Get all active wine types")
    public ResponseEntity<List<ReferenceDataResponse>> getWineTypes() {
        return ResponseEntity.ok(referenceDataQueryPort.getWineTypes());
    }

    @GetMapping("/event-types")
    @Operation(summary = "Get all active event types")
    public ResponseEntity<List<ReferenceDataResponse>> getEventTypes() {
        return ResponseEntity.ok(referenceDataQueryPort.getEventTypes());
    }

    @GetMapping("/event-statuses")
    @Operation(summary = "Get all active event statuses")
    public ResponseEntity<List<ReferenceDataResponse>> getEventStatuses() {
        return ResponseEntity.ok(referenceDataQueryPort.getEventStatuses());
    }
}

