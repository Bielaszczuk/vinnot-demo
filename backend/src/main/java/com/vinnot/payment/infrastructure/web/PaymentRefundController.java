package com.vinnot.payment.infrastructure.web;
import com.vinnot.payment.application.port.in.RequestPaymentRefundUseCase;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.UUID;

@RestController
@ConditionalOnProperty(name = {"app.payments.enabled", "app.payments.settlement-enabled"}, havingValue = "true")
public class PaymentRefundController {
    private final RequestPaymentRefundUseCase refunds;
    public PaymentRefundController(RequestPaymentRefundUseCase refunds) { this.refunds = refunds; }
    @PostMapping("/payments/checkouts/{attemptId}/refund")
    @PreAuthorize("hasAnyRole('PARTNER','ADMIN')")
    public ResponseEntity<Void> request(@PathVariable UUID attemptId, @AuthenticationPrincipal String principal) {
        refunds.request(attemptId, UUID.fromString(principal));
        return ResponseEntity.accepted().cacheControl(CacheControl.noStore()).build();
    }
}
