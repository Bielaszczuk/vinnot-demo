package com.vinnot.event.infrastructure.web.controller;

import com.vinnot.event.application.port.in.ManageEventAreaUseCase;
import com.vinnot.event.domain.valueobject.EventArea;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Objects;
import java.util.UUID;

/** The current user's "events near you" area. The response never includes a location, rounded or not. */
@RestController
@RequestMapping("/users/me/event-area")
@Tag(name = "Events near you")
public class EventAreaController {
    private final ManageEventAreaUseCase areas;

    public EventAreaController(ManageEventAreaUseCase areas) {
        this.areas = areas;
    }

    @GetMapping
    @Operation(summary = "The area the current user hears about new events in (204 when none)")
    public ResponseEntity<AreaResponse> find(@AuthenticationPrincipal String principal) {
        return areas.find(UUID.fromString(principal))
                .map(area -> ResponseEntity.ok(new AreaResponse(area.kind().name(), area.regionId(), area.regionName())))
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @PutMapping
    @Operation(summary = "Hear about new events in a catalogue region or near an approximate location (rounded to about 11 km)")
    public ResponseEntity<Void> set(@AuthenticationPrincipal String principal, @Valid @RequestBody AreaRequest request) {
        areas.set(UUID.fromString(principal), request.toArea());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping
    @Operation(summary = "Stop hearing about new events nearby")
    public ResponseEntity<Void> clear(@AuthenticationPrincipal String principal) {
        areas.clear(UUID.fromString(principal));
        return ResponseEntity.noContent().build();
    }

    /** Either {@code regionId}, or both {@code latitude} and {@code longitude}. */
    public record AreaRequest(UUID regionId,
            @DecimalMin("-90") @DecimalMax("90") Double latitude,
            @DecimalMin("-180") @DecimalMax("180") Double longitude) {
        EventArea toArea() {
            boolean location = Objects.nonNull(latitude) && Objects.nonNull(longitude);
            boolean partial = Objects.nonNull(latitude) != Objects.nonNull(longitude);
            if (partial || Objects.nonNull(regionId) == location) {
                throw new IllegalArgumentException("Send a regionId, or a latitude and a longitude");
            }
            return location ? EventArea.approximate(latitude, longitude) : EventArea.region(regionId);
        }
    }

    public record AreaResponse(String kind, UUID regionId, String regionName) {
    }
}
