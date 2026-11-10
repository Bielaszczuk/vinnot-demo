package com.vinnot.admin.infrastructure.web.controller;

import com.vinnot.admin.application.model.MinimumAppVersions;
import com.vinnot.admin.application.port.in.GetMinimumAppVersionsUseCase;
import com.vinnot.admin.domain.model.AppPlatform;
import com.vinnot.admin.domain.model.AppVersion;
import com.vinnot.shared.infrastructure.web.dto.ApiResponseWrapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * The public update policy the mobile app reads on launch and on returning to the foreground (#428). No session is
 * needed ({@code SecurityConfig}) and pending terms do not block it ({@code LegalAccessConfiguration}).
 */
@RestController
@RequestMapping("/app-versions")
@Tag(name = "App versions")
public class AppVersionPolicyController {
    private final GetMinimumAppVersionsUseCase policy;

    public AppVersionPolicyController(GetMinimumAppVersionsUseCase policy) {
        this.policy = policy;
    }

    @GetMapping("/minimum")
    @Operation(summary = "The minimum supported app version per platform; null means no build is blocked")
    public ResponseEntity<ApiResponseWrapper<MinimumVersionsResponse>> minimumVersions() {
        return ResponseEntity.ok(ApiResponseWrapper.of(MinimumVersionsResponse.from(policy.minimumVersions())));
    }

    public record MinimumVersionsResponse(String ios, String android) {
        static MinimumVersionsResponse from(MinimumAppVersions minimums) {
            return new MinimumVersionsResponse(text(minimums, AppPlatform.IOS), text(minimums, AppPlatform.ANDROID));
        }

        private static String text(MinimumAppVersions minimums, AppPlatform platform) {
            return minimums.of(platform).map(AppVersion::toString).orElse(null);
        }
    }
}
