package com.vinnot.event.infrastructure.web.request;

import jakarta.validation.constraints.NotBlank;

public record ReportEventPaymentRequest(
        @NotBlank String paymentMethod
) {
}
