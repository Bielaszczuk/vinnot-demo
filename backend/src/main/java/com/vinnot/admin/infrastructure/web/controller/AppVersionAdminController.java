package com.vinnot.admin.infrastructure.web.controller;

import com.vinnot.admin.application.model.AppVersionSettings;
import com.vinnot.admin.application.port.in.ManageAppVersionsUseCase;
import com.vinnot.admin.domain.model.AppPlatform;
import com.vinnot.admin.domain.model.AppVersion;
import com.vinnot.shared.infrastructure.web.dto.ApiResponseWrapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

/**
 * The minimum supported mobile app version per platform (#428). ADMIN only ({@code SecurityConfig}); changing one also
 * needs a recent reauthentication ({@code AdminSensitiveActionInterceptor}).
 */
@RestController
@RequestMapping("/admin/app-versions")
@Tag(name = "Admin app versions")
public class AppVersionAdminController {
    private final ManageAppVersionsUseCase appVersions;

    public AppVersionAdminController(ManageAppVersionsUseCase appVersions) {
        this.appVersions = appVersions;
    }

    @GetMapping
    @Operation(summary = "The minimum supported app version of each platform, who set it, and the latest changes")
    public ResponseEntity<ApiResponseWrapper<SettingsResponse>> settings() {
        return ResponseEntity.ok(ApiResponseWrapper.of(SettingsResponse.from(appVersions.settings())));
    }

    @PutMapping("/{platform}")
    @Operation(summary = "Set or clear (null) the minimum app version of IOS or ANDROID; older builds must update")
    public ResponseEntity<ApiResponseWrapper<SettingsResponse>> setMinimumVersion(@AuthenticationPrincipal String principal,
            @PathVariable String platform, @RequestBody MinimumVersionRequest request) {
        return ResponseEntity.ok(ApiResponseWrapper.of(SettingsResponse.from(appVersions.setMinimumVersion(
                AppPlatform.named(platform), request.minimumVersion(), UUID.fromString(principal)))));
    }

    /** {@code minimumVersion} is {@code major.minor.patch}, or {@code null} for no minimum. */
    public record MinimumVersionRequest(String minimumVersion) {
    }

    public record SettingsResponse(List<PlatformResponse> platforms, List<ChangeResponse> recentChanges) {
        static SettingsResponse from(AppVersionSettings settings) {
            return new SettingsResponse(
                    settings.platforms().stream().map(setting -> new PlatformResponse(setting.platform().name(),
                            text(setting.minimumVersion()), setting.updatedAt(), setting.updatedBy())).toList(),
                    settings.recentChanges().stream().map(change -> new ChangeResponse(change.platform().name(),
                            text(change.previousMinimumVersion()), text(change.minimumVersion()), change.changedBy(),
                            change.changedAt())).toList());
        }
    }

    public record PlatformResponse(String platform, String minimumVersion, Instant updatedAt, String updatedBy) {
    }

    public record ChangeResponse(String platform, String previousMinimumVersion, String minimumVersion, String changedBy,
            Instant changedAt) {
    }

    static String text(AppVersion version) {
        return Objects.isNull(version) ? null : version.toString();
    }
}
