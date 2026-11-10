package com.vinnot.payment.infrastructure.web;

import com.vinnot.payment.application.port.in.GetOrganizerPaymentsUseCase;
import com.vinnot.payment.domain.model.OrganizerPayment;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.Objects;

@RestController
@ConditionalOnProperty(name = {"app.payments.enabled", "app.payments.settlement-enabled"}, havingValue = "true")
public class OrganizerPaymentsController {
    private final GetOrganizerPaymentsUseCase payments;
    public OrganizerPaymentsController(GetOrganizerPaymentsUseCase payments) { this.payments = payments; }
    @GetMapping("/payments/events/{eventId}/registrations")
    @PreAuthorize("hasAnyRole('PARTNER','ADMIN')")
    public ResponseEntity<List<PaymentResponse>> get(@PathVariable UUID eventId,
            @RequestParam List<UUID> registrationIds, @AuthenticationPrincipal String actorId) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(
                payments.get(UUID.fromString(actorId),eventId,registrationIds).stream().map(PaymentResponse::from).toList());
    }
    public record PaymentResponse(UUID registrationId, UUID attemptId, BigDecimal amount, String currency,
            String paymentStatus, String refundStatus, boolean canRefund) {
        static PaymentResponse from(OrganizerPayment p) {
            return new PaymentResponse(p.registrationId(),p.attemptId(),p.amount(),p.currency(),
                    Objects.isNull(p.paymentStatus()) ? "PENDING" : p.paymentStatus().name(),
                    Objects.isNull(p.refundStatus()) ? "NONE" : p.refundStatus().name(), p.canRefund());
        }
    }
}
