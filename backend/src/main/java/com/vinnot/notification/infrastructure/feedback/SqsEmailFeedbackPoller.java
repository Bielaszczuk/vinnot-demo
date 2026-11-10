package com.vinnot.notification.infrastructure.feedback;

import com.vinnot.notification.application.port.in.RecordEmailFeedbackUseCase;
import com.vinnot.shared.infrastructure.logging.SafeFailureDetails;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.model.DeleteMessageRequest;
import software.amazon.awssdk.services.sqs.model.Message;
import software.amazon.awssdk.services.sqs.model.ReceiveMessageRequest;

import java.util.List;

/**
 * Drains the bounce and complaint queue. A message is deleted only after its feedback is recorded, so a
 * failure leaves it in the queue to be received again and, after the queue's receive limit, moved to the
 * dead-letter queue. Nothing about a recipient is logged.
 */
public class SqsEmailFeedbackPoller {
    /** Long-poll wait; kept under the shared AWS client's attempt budget. */
    static final int WAIT_SECONDS = 5;
    static final int MAX_BATCHES = 5;
    private static final Logger LOGGER = LoggerFactory.getLogger(SqsEmailFeedbackPoller.class);
    private final SqsClient client;
    private final String queueUrl;
    private final SesFeedbackEvents events;
    private final RecordEmailFeedbackUseCase feedback;

    public SqsEmailFeedbackPoller(SqsClient client, String queueUrl, SesFeedbackEvents events,
            RecordEmailFeedbackUseCase feedback) {
        this.client = client;
        this.queueUrl = queueUrl;
        this.events = events;
        this.feedback = feedback;
    }

    @Scheduled(scheduler = "emailFeedbackTaskScheduler",
            initialDelayString = "${app.notifications.feedback.poll-ms:60000}",
            fixedDelayString = "${app.notifications.feedback.poll-ms:60000}")
    public void poll() {
        for (int batch = 0; batch < MAX_BATCHES; batch++) {
            List<Message> messages;
            try {
                messages = client.receiveMessage(ReceiveMessageRequest.builder().queueUrl(queueUrl)
                        .maxNumberOfMessages(10).waitTimeSeconds(batch == 0 ? WAIT_SECONDS : 0).build()).messages();
            } catch (RuntimeException failure) {
                LOGGER.warn("Email feedback queue unavailable: {}", SafeFailureDetails.describe(failure));
                return;
            }
            if (messages.isEmpty()) {
                return;
            }
            messages.forEach(this::handle);
        }
    }

    private void handle(Message message) {
        try {
            events.parse(message.body()).ifPresent(event -> feedback.suppress(event.reason(), event.addresses()));
        } catch (SesFeedbackEvents.UnreadableFeedbackException unreadable) {
            LOGGER.warn("Email feedback message left for the dead-letter queue: {}", unreadable.getMessage());
            return;
        } catch (RuntimeException failure) {
            LOGGER.error("Email feedback not recorded; it will be received again: {}", SafeFailureDetails.describe(failure));
            return;
        }
        try {
            client.deleteMessage(DeleteMessageRequest.builder().queueUrl(queueUrl)
                    .receiptHandle(message.receiptHandle()).build());
        } catch (RuntimeException failure) {
            // Recording is idempotent, so a message received again after a failed delete is harmless.
            LOGGER.warn("Email feedback recorded but not deleted: {}", SafeFailureDetails.describe(failure));
        }
    }
}
