package com.vinnot.notification.application.port.in;

import com.vinnot.notification.domain.model.EmailSuppressionReason;

import java.util.Collection;

/** Feedback reported by the mail provider after a send: hard bounces and complaints. */
public interface RecordEmailFeedbackUseCase {
    void suppress(EmailSuppressionReason reason, Collection<String> addresses);
}
