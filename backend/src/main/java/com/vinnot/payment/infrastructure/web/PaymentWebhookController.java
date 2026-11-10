package com.vinnot.payment.infrastructure.web;

import com.vinnot.payment.application.port.in.RecordPaymentNotificationUseCase;
import com.vinnot.payment.infrastructure.security.MercadoPagoWebhookSignature;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.ResponseEntity;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import java.util.Objects;
import java.util.UUID;

@RestController
@ConditionalOnProperty(name = {"app.payments.enabled", "app.payments.settlement-enabled"}, havingValue = "true")
public class PaymentWebhookController {
    private final RecordPaymentNotificationUseCase notifications;
    private final MercadoPagoWebhookSignature signature;
    public PaymentWebhookController(RecordPaymentNotificationUseCase notifications, MercadoPagoWebhookSignature signature) {
        this.notifications = notifications;
        this.signature = signature;
    }

    @PostMapping("/payments/mercadopago/webhooks/{attemptId}")
    public ResponseEntity<Void> receive(@PathVariable UUID attemptId, @RequestParam MultiValueMap<String, String> query,
            @RequestHeader MultiValueMap<String, String> headers) {
        if (!signature.valid(single(headers, "x-signature"), single(headers, "x-request-id"), single(query, "data.id"))) {
            return ResponseEntity.status(401).build();
        }
        // Body, seller IDs and payment status are untrusted. Only wake a server-owned search by checkout reference.
        notifications.record(attemptId);
        return ResponseEntity.ok().build();
    }

    private static String single(MultiValueMap<String, String> values, String key) {
        var items = values.get(key);
        return Objects.nonNull(items) && items.size() == 1 ? items.getFirst() : null;
    }

    @PostMapping("/payments/mercadopago/webhooks")
    public ResponseEntity<Void> receiveApplicationNotification(@RequestParam MultiValueMap<String, String> query,
            @RequestHeader MultiValueMap<String, String> headers) {
        String paymentId = single(query, "data.id");
        if (!signature.valid(single(headers, "x-signature"), single(headers, "x-request-id"), paymentId)) {
            return ResponseEntity.status(401).build();
        }
        // Unknown/unrelated payments cannot choose a seller or create an inscription. New checkouts use
        // their per-attempt URL; scheduled reconciliation also recovers missing initial notifications.
        notifications.recordKnownPayment(paymentId);
        return ResponseEntity.ok().build();
    }
}
