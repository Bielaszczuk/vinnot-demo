package com.vinnot.engagement.infrastructure.web;

import com.vinnot.engagement.application.model.EngagementMetrics;
import com.vinnot.engagement.application.port.in.ReadEngagementMetricsUseCase;
import com.vinnot.shared.infrastructure.web.dto.ApiResponseWrapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;

/** Engagement push results for administrators (#405). ADMIN only, like every {@code /admin/notifications} path. */
@RestController
@RequestMapping("/admin/notifications/push/engagement")
@Tag(name = "Admin notifications")
public class EngagementAdministrationController {
    private final ReadEngagementMetricsUseCase metrics;

    public EngagementAdministrationController(ReadEngagementMetricsUseCase metrics) {
        this.metrics = metrics;
    }

    @GetMapping
    @Operation(summary = "Engagement pushes per type for the last 1, 7 or 30 days: sent, opened, opted out, held out")
    public ResponseEntity<ApiResponseWrapper<MetricsResponse>> metrics(@RequestParam(defaultValue = "7") int days) {
        return ResponseEntity.ok(ApiResponseWrapper.of(MetricsResponse.from(metrics.metrics(days))));
    }

    public record MetricsResponse(int days, Instant since, List<TypeResponse> types) {
        static MetricsResponse from(EngagementMetrics metrics) {
            return new MetricsResponse(metrics.days(), metrics.since(), metrics.types().stream()
                    .map(type -> new TypeResponse(type.type().name(), type.type().category().name(), type.enabled(),
                            type.sent(), type.opened(), type.optedOut(), type.heldOut(), type.openRate(), type.optOutRate()))
                    .toList());
        }
    }

    public record TypeResponse(String type, String category, boolean enabled, long sent, long opened, long optedOut,
            long heldOut, double openRate, double optOutRate) {
    }
}
