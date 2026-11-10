package com.vinnot.payment.infrastructure.web;

import com.vinnot.payment.application.port.in.ConnectPaymentAccountUseCase;
import jakarta.validation.Valid;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/** Public OAuth completion: the owner comes exclusively from the server-side, single-use state. */
@RestController
@ConditionalOnProperty(name = "app.payments.enabled", havingValue = "true")
public class PaymentConnectionCallbackController {
    private final ConnectPaymentAccountUseCase useCase;

    public PaymentConnectionCallbackController(ConnectPaymentAccountUseCase useCase) {
        this.useCase = useCase;
    }

    @PostMapping("/payments/mercadopago/connection/callback")
    public ResponseEntity<CallbackResponse> complete(@Valid @RequestBody PaymentAccountController.CompleteRequest request) {
        boolean returnToApp = useCase.completeCallback(request.state(), request.code());
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(new CallbackResponse(returnToApp));
    }

    public record CallbackResponse(boolean returnToApp) { }
}
