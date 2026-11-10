package com.vinnot.notification.infrastructure.web;

import com.vinnot.notification.application.model.PushMetrics;
import com.vinnot.notification.application.model.PushSettings;
import com.vinnot.notification.application.port.in.ManagePushTypesUseCase;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.notification.domain.model.PushOutcome;
import com.vinnot.shared.domain.exception.DomainException;
import com.vinnot.shared.infrastructure.web.dto.ApiResponseWrapper;
import com.vinnot.shared.domain.util.EnumNames;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Administrators' push controls (#310). ADMIN only ({@code SecurityConfig}); changing a switch also needs a recent
 * reauthentication ({@code AdminSensitiveActionInterceptor}).
 */
@RestController
@RequestMapping("/admin/notifications/push")
@Tag(name = "Admin notifications")
public class PushAdministrationController {
    private final ManagePushTypesUseCase push;

    public PushAdministrationController(ManagePushTypesUseCase push) {
        this.push = push;
    }

    @GetMapping
    @Operation(summary = "Push provider (read-only), each pushed type with its switch, and the latest switch changes")
    public ResponseEntity<ApiResponseWrapper<SettingsResponse>> settings() {
        return ResponseEntity.ok(ApiResponseWrapper.of(SettingsResponse.from(push.settings())));
    }

    @PutMapping("/types/{type}")
    @Operation(summary = "Turn one push type on or off; switched-off pushes are dropped, not deferred")
    public ResponseEntity<ApiResponseWrapper<SettingsResponse>> setEnabled(@AuthenticationPrincipal String principal,
            @PathVariable String type, @Valid @RequestBody SwitchRequest request) {
        return ResponseEntity.ok(ApiResponseWrapper.of(SettingsResponse.from(
                push.setEnabled(type(type), request.enabled(), UUID.fromString(principal)))));
    }

    @GetMapping("/metrics")
    @Operation(summary = "Push outcomes per type for the last 1, 7 or 30 days")
    public ResponseEntity<ApiResponseWrapper<MetricsResponse>> metrics(@RequestParam(defaultValue = "7") int days) {
        return ResponseEntity.ok(ApiResponseWrapper.of(MetricsResponse.from(push.metrics(days))));
    }

    private static NotificationType type(String name) {
        return EnumNames.find(NotificationType.class, name)
                .orElseThrow(() -> new DomainException("NOT_A_PUSH_TYPE", "This notification type is never pushed"));
    }

    public record SwitchRequest(@NotNull Boolean enabled) {
    }

    public record SettingsResponse(String provider, List<TypeResponse> types, List<ChangeResponse> recentChanges) {
        static SettingsResponse from(PushSettings settings) {
            return new SettingsResponse(settings.provider(),
                    settings.types().stream().map(type -> new TypeResponse(type.type().name(), type.category().name(),
                            type.transactional(), type.enabled())).toList(),
                    settings.recentChanges().stream().map(change -> new ChangeResponse(change.type().name(),
                            change.previousEnabled(), change.enabled(), change.changedBy(), change.changedAt())).toList());
        }
    }

    public record TypeResponse(String type, String category, boolean transactional, boolean enabled) {
    }

    public record ChangeResponse(String type, boolean previousEnabled, boolean enabled, String changedBy, Instant changedAt) {
    }

    public record MetricsResponse(int days, LocalDate from, List<TypeMetricsResponse> types) {
        static MetricsResponse from(PushMetrics metrics) {
            return new MetricsResponse(metrics.days(), metrics.from(), metrics.types().stream().map(type -> {
                Map<String, Long> counts = new LinkedHashMap<>();
                for (PushOutcome outcome : PushOutcome.values()) {
                    counts.put(outcome.name(), type.counts().getOrDefault(outcome, 0L));
                }
                return new TypeMetricsResponse(type.type().name(), counts);
            }).toList());
        }
    }

    public record TypeMetricsResponse(String type, Map<String, Long> counts) {
    }
}
