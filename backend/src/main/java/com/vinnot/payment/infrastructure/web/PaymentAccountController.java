package com.vinnot.payment.infrastructure.web;

import com.vinnot.payment.application.port.in.ConnectPaymentAccountUseCase;
import com.vinnot.payment.application.port.in.GetCommissionPolicyUseCase;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.math.BigDecimal;
import java.net.URI;
import java.util.UUID;
import java.util.Objects;
import org.springframework.beans.factory.annotation.Value;

@RestController
@RequestMapping("/payments/mercadopago/account")
@PreAuthorize("hasAnyRole('PARTNER','ADMIN')")
@ConditionalOnProperty(name = "app.payments.enabled", havingValue = "true")
public class PaymentAccountController {
    private final ConnectPaymentAccountUseCase useCase;
    private final GetCommissionPolicyUseCase commission;
    @Value("${app.payments.environment:SANDBOX}")
    private String environment = "SANDBOX";

    public PaymentAccountController(ConnectPaymentAccountUseCase useCase, GetCommissionPolicyUseCase commission) {
        this.useCase = useCase;
        this.commission = commission;
    }

    @PostMapping("/connect")
    public ResponseEntity<ConnectionResponse> connect(@AuthenticationPrincipal String principal,
            @RequestBody(required = false) ConnectionRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(new ConnectionResponse(useCase.begin(UUID.fromString(principal), Objects.nonNull(request) && request.returnToApp())));
    }

    /** The callback UI must authenticate as the initiating organizer before exchanging its code. */
    @PostMapping("/complete")
    public ResponseEntity<Void> complete(@AuthenticationPrincipal String principal, @Valid @RequestBody CompleteRequest request) {
        useCase.complete(UUID.fromString(principal), request.state(), request.code());
        return ResponseEntity.noContent().cacheControl(CacheControl.noStore()).build();
    }

    @GetMapping
    public ResponseEntity<StatusResponse> status(@AuthenticationPrincipal String principal) {
        var policy = commission.current();
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(new StatusResponse(useCase.isConnected(UUID.fromString(principal)), environment,
                        policy.basisPoints(), policy.percent()));
    }

    public record ConnectionRequest(boolean returnToApp) { }
    public record ConnectionResponse(URI authorizationUrl) { }
    /** The commission is the one new ticket sales are charged; partners render it instead of a hard-coded rate. */
    public record StatusResponse(boolean connected, String environment, int commissionBasisPoints,
                                 BigDecimal commissionPercent) { }
    public record CompleteRequest(@Pattern(regexp = "[A-Za-z0-9_-]{43}") @NotBlank String state,
                                  @NotBlank @Size(max = 2048) String code) {
        @Override
        public String toString() {
            return "CompleteRequest[REDACTED]";
        }
    }
}
