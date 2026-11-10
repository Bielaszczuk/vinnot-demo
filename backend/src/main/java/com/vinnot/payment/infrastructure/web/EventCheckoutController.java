package com.vinnot.payment.infrastructure.web;

import com.vinnot.payment.application.port.in.StartEventCheckoutUseCase;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestBody;
import java.util.UUID;
import java.util.Objects;
import org.springframework.http.HttpStatus;

@RestController
@ConditionalOnProperty(name = {"app.payments.enabled", "app.payments.settlement-enabled", "app.payments.checkout-enabled"}, havingValue = "true")
public class EventCheckoutController {
    public record CheckoutRequest(boolean returnToApp) { }
    private final StartEventCheckoutUseCase checkout;
    public EventCheckoutController(StartEventCheckoutUseCase checkout) { this.checkout = checkout; }

    @PostMapping("/events/{eventId}/registrations/{registrationId}/checkout")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<StartEventCheckoutUseCase.Result> start(@PathVariable UUID eventId,
            @PathVariable UUID registrationId, @AuthenticationPrincipal String principal,
            @RequestBody(required = false) CheckoutRequest request) {
        var result = checkout.start(eventId, registrationId, UUID.fromString(principal),
                Objects.nonNull(request) && request.returnToApp());
        return ResponseEntity.status(Objects.isNull(result.checkoutUrl()) ? HttpStatus.ACCEPTED : HttpStatus.OK)
                .cacheControl(CacheControl.noStore()).body(result);
    }
}
