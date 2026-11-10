package com.vinnot.notification.application.service;

import com.vinnot.notification.application.port.in.RecordEmailFeedbackUseCase;
import com.vinnot.notification.application.port.out.EmailSuppressionPort;
import com.vinnot.notification.domain.model.EmailSuppressionReason;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.Objects;

@Service
public class EmailFeedbackService implements RecordEmailFeedbackUseCase {
    private static final Logger LOGGER = LoggerFactory.getLogger(EmailFeedbackService.class);
    private final EmailSuppressionPort suppressions;

    public EmailFeedbackService(EmailSuppressionPort suppressions) {
        this.suppressions = suppressions;
    }

    @Override
    @Transactional
    public void suppress(EmailSuppressionReason reason, Collection<String> addresses) {
        var valid = addresses.stream().filter(Objects::nonNull).filter(address -> !address.isBlank()).toList();
        valid.forEach(address -> suppressions.suppress(address, reason));
        // Counts only: the addresses never reach the logs.
        LOGGER.info("Suppressed {} address(es) after {}", valid.size(), reason);
    }
}
