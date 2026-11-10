package com.vinnot.payment.infrastructure.web;

import com.vinnot.payment.application.port.in.GetPaymentReceiptUseCase;
import com.vinnot.payment.domain.model.PaymentReceiptStatus;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@ConditionalOnProperty(
        name = {"app.payments.enabled", "app.payments.settlement-enabled"},
        havingValue = "true")
public class PaymentReceiptController {
    private final GetPaymentReceiptUseCase receipts;

    public PaymentReceiptController(GetPaymentReceiptUseCase receipts) {
        this.receipts = receipts;
    }

    @GetMapping("/payments/receipt")
    public ResponseEntity<ReceiptResponse> get(@RequestParam String token) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .header("Referrer-Policy", "no-referrer")
                .body(new ReceiptResponse(receipts.get(token)));
    }

    public record ReceiptResponse(PaymentReceiptStatus status) { }
}
