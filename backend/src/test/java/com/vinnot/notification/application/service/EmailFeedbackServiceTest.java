package com.vinnot.notification.application.service;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.vinnot.notification.application.port.out.EmailSuppressionPort;
import com.vinnot.notification.domain.model.EmailSuppressionReason;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;

import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;

class EmailFeedbackServiceTest {
    private final EmailSuppressionPort suppressions = mock(EmailSuppressionPort.class);
    private final EmailFeedbackService service = new EmailFeedbackService(suppressions);

    @Test
    void suppressesEveryReportedAddressAndSkipsBlankOnes() {
        service.suppress(EmailSuppressionReason.HARD_BOUNCE, Arrays.asList("a@example.test", " ", null, "b@example.test"));
        verify(suppressions).suppress("a@example.test", EmailSuppressionReason.HARD_BOUNCE);
        verify(suppressions).suppress("b@example.test", EmailSuppressionReason.HARD_BOUNCE);
        verifyNoMoreInteractions(suppressions);
    }

    @Test
    void logsOnlyTheCountAndReasonNeverTheAddress() {
        Logger logger = (Logger) LoggerFactory.getLogger(EmailFeedbackService.class);
        var logs = new ListAppender<ILoggingEvent>();
        logs.start();
        logger.addAppender(logs);
        try {
            service.suppress(EmailSuppressionReason.COMPLAINT, List.of("private@example.test"));
        } finally {
            logger.detachAppender(logs);
        }
        assertThat(logs.list).singleElement().extracting(ILoggingEvent::getFormattedMessage)
                .isEqualTo("Suppressed 1 address(es) after COMPLAINT");
    }
}
