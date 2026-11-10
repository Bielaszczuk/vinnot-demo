package com.vinnot.gamification.infrastructure.web.controller;

import com.vinnot.gamification.application.command.model.CelebratePointsCommand;
import com.vinnot.gamification.application.port.in.CelebratePointsUseCase;
import com.vinnot.gamification.application.port.in.GetMyPointsUseCase;
import com.vinnot.gamification.application.query.response.PointsSummaryResponse;
import com.vinnot.gamification.domain.model.Tier;
import com.vinnot.gamification.infrastructure.web.request.CelebratePointsRequest;
import com.vinnot.shared.infrastructure.web.dto.ApiResponseWrapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Objects;
import java.util.UUID;

/** The member's own points and wax seal (#455), next to the other {@code /users/me} endpoints. */
@RestController
@RequestMapping("/users/me/points")
@Tag(name = "Points", description = "Points and wax-seal emblems of the current user")
@RequiredArgsConstructor
public class PointsController {
    private final GetMyPointsUseCase getMyPoints;
    private final CelebratePointsUseCase celebrate;

    @GetMapping
    @Operation(summary = "Get the current user's points, seal and recent movements")
    public ResponseEntity<ApiResponseWrapper<PointsSummaryResponse>> getMyPoints(@AuthenticationPrincipal String principal) {
        return ResponseEntity.ok(ApiResponseWrapper.of(getMyPoints.execute(UUID.fromString(principal))));
    }

    @PostMapping("/celebrations")
    @Operation(summary = "Mark a tier as celebrated or dismiss the welcome card")
    public ResponseEntity<Void> celebrate(@AuthenticationPrincipal String principal,
            @Valid @RequestBody CelebratePointsRequest request) {
        celebrate.execute(new CelebratePointsCommand(UUID.fromString(principal),
                Objects.isNull(request.tier()) ? null : Tier.valueOf(request.tier()),
                Boolean.TRUE.equals(request.welcome())));
        return ResponseEntity.noContent().build();
    }
}
