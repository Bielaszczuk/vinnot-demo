package com.vinnot.notification.infrastructure.web;

import com.vinnot.notification.application.port.in.ManagePushDevicesUseCase;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.PushPlatform;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/users/me/push-devices")
@Tag(name = "Push devices")
public class PushDevicesController {
    private final ManagePushDevicesUseCase devices;

    public PushDevicesController(ManagePushDevicesUseCase devices) {
        this.devices = devices;
    }

    @PutMapping
    @Operation(summary = "Register or refresh this device's Expo push token for the current user",
            description = "Called on every cold start, which keeps the device from being purged after 120 days without one."
                    + " Optional channels=true says the app created the per-category Android notification channels.")
    public ResponseEntity<Void> register(@AuthenticationPrincipal String principal, @Valid @RequestBody RegisterRequest request) {
        devices.register(UUID.fromString(principal), request.token(), PushPlatform.valueOf(request.platform()),
                NotificationLocale.fromLanguage(request.locale()), Boolean.TRUE.equals(request.channels()));
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping
    @Operation(summary = "Stop sending pushes to this device for the current user")
    public ResponseEntity<Void> unregister(@AuthenticationPrincipal String principal, @Valid @RequestBody UnregisterRequest request) {
        devices.unregister(UUID.fromString(principal), request.token());
        return ResponseEntity.noContent().build();
    }

    public record RegisterRequest(@NotBlank @Size(max = 255) String token,
            @NotBlank @Pattern(regexp = "IOS|ANDROID") String platform,
            @NotBlank @Pattern(regexp = "es|en") String locale,
            Boolean channels) {
    }

    public record UnregisterRequest(@NotBlank @Size(max = 255) String token) {
    }
}
