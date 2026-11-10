package com.vinnot.marketing.infrastructure.web.controller;

import com.vinnot.marketing.application.model.ContentPillarResponse;
import com.vinnot.marketing.application.port.in.ManageContentPillarsUseCase;
import com.vinnot.marketing.infrastructure.web.dto.PillarSwitchRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** The content pillars' switches (#510), administrators only; the pillars are listed by {@link SocialPostAdminController}. */
@RestController
@RequestMapping("/admin/social-posts/pillars")
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin - Social posts", description = "Weekly social post planning and approval")
@RequiredArgsConstructor
public class SocialPillarAdminController {
    private final ManageContentPillarsUseCase pillars;

    @PutMapping("/{code}/auto-approve")
    @Operation(summary = "Turn the automatic approval of a content pillar's pending posts on or off (admin)")
    public ResponseEntity<ContentPillarResponse> autoApprove(@PathVariable String code, @Valid @RequestBody PillarSwitchRequest request) {
        return ResponseEntity.ok(pillars.setAutoApprove(code, request.enabled()));
    }

    @PutMapping("/{code}/active")
    @Operation(summary = "Switch a content pillar on or off for the planner (admin)")
    public ResponseEntity<ContentPillarResponse> active(@PathVariable String code, @Valid @RequestBody PillarSwitchRequest request) {
        return ResponseEntity.ok(pillars.setActive(code, request.enabled()));
    }
}
