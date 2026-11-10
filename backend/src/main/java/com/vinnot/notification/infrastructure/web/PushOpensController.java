package com.vinnot.notification.infrastructure.web;

import com.vinnot.notification.application.port.in.PushOpenUseCase;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.shared.domain.exception.DomainException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.UUID;

@RestController
@RequestMapping("/users/me/push-opens")
@Tag(name = "Push devices")
public class PushOpensController {
    private final PushOpenUseCase opens;

    public PushOpensController(PushOpenUseCase opens) {
        this.opens = opens;
    }

    @PostMapping
    @Operation(summary = "Record that the current user opened a push, once per push ref; it also counts as an app open")
    public ResponseEntity<Void> open(@AuthenticationPrincipal String principal, @Valid @RequestBody OpenRequest request) {
        NotificationType type = Arrays.stream(NotificationType.values())
                .filter(candidate -> candidate.name().equals(request.type())).findFirst()
                .orElseThrow(() -> new DomainException("UNKNOWN_NOTIFICATION_TYPE", "Unknown notification type"));
        opens.record(UUID.fromString(principal), request.ref(), type);
        return ResponseEntity.noContent().build();
    }

    public record OpenRequest(@NotBlank @Size(max = 180) String ref,
            @NotBlank @Pattern(regexp = "[A-Z][A-Z_]{0,59}") String type) {
    }
}
