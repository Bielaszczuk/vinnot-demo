package com.vinnot.notification.infrastructure.web;

import com.vinnot.notification.application.port.in.UnsubscribeUseCase;
import com.vinnot.shared.infrastructure.web.dto.ApiResponseWrapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Public one-click unsubscribe. Mail providers POST here with {@code List-Unsubscribe=One-Click} (RFC 8058) and
 * the web confirmation page POSTs the same token; a GET never changes anything, so link scanners cannot unsubscribe.
 */
@RestController
@RequestMapping("/notifications/unsubscribe")
@Tag(name = "Notification preferences")
public class UnsubscribeController {
    private final UnsubscribeUseCase unsubscribe;

    public UnsubscribeController(UnsubscribeUseCase unsubscribe) {
        this.unsubscribe = unsubscribe;
    }

    @PostMapping
    @Operation(summary = "Turn off email for the category in a signed unsubscribe link")
    public ResponseEntity<ApiResponseWrapper<UnsubscribeResponse>> unsubscribe(@RequestParam("token") String token) {
        return ResponseEntity.ok(ApiResponseWrapper.of(new UnsubscribeResponse(unsubscribe.unsubscribe(token).name())));
    }

    public record UnsubscribeResponse(String category) {
    }
}
