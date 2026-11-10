package com.vinnot.admin.infrastructure.web.controller;

import com.vinnot.admin.application.port.in.GetAdminStatsUseCase;
import com.vinnot.admin.application.query.model.GetAdminStatsQuery;
import com.vinnot.admin.application.query.response.AdminStatsResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/admin")
@PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
@Tag(name = "Admin", description = "Admin management endpoints")
@RequiredArgsConstructor
public class AdminDashboardController {

    private final GetAdminStatsUseCase getStatsUseCase;

    /**
     * Gets admin dashboard statistics.
     *
     * @return the statistics
     */
    @GetMapping("/stats")
    @Operation(summary = "Get admin dashboard statistics")
    public ResponseEntity<AdminStatsResponse> getStats() {
        AdminStatsResponse response = getStatsUseCase.execute(new GetAdminStatsQuery());
        return ResponseEntity.ok(response);
    }
}
