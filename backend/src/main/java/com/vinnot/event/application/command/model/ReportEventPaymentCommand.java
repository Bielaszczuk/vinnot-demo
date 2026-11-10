package com.vinnot.event.application.command.model;

import com.vinnot.event.domain.valueobject.EventPaymentMethod;

import java.util.UUID;

public record ReportEventPaymentCommand(
        UUID registrationId,
        UUID userId,
        EventPaymentMethod paymentMethod
) {
}
