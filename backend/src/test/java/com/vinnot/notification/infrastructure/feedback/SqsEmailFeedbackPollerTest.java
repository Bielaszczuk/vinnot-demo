package com.vinnot.notification.infrastructure.feedback;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.vinnot.notification.application.port.in.RecordEmailFeedbackUseCase;
import com.vinnot.notification.domain.model.EmailSuppressionReason;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.slf4j.LoggerFactory;
import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.model.DeleteMessageRequest;
import software.amazon.awssdk.services.sqs.model.Message;
import software.amazon.awssdk.services.sqs.model.ReceiveMessageRequest;
import software.amazon.awssdk.services.sqs.model.ReceiveMessageResponse;
import tools.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.function.Consumer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class SqsEmailFeedbackPollerTest {
    private static final String QUEUE = "https://sqs.us-east-1.amazonaws.com/1/vinnot-dev-email-feedback";
    private static final String BOUNCE = "{\"eventType\":\"Bounce\",\"bounce\":{\"bounceType\":\"Permanent\","
            + "\"bouncedRecipients\":[{\"emailAddress\":\"private@example.test\"}]}}";
    private final SqsClient client = mock(SqsClient.class);
    private final RecordEmailFeedbackUseCase feedback = mock(RecordEmailFeedbackUseCase.class);
    private final SqsEmailFeedbackPoller poller =
            new SqsEmailFeedbackPoller(client, QUEUE, new SesFeedbackEvents(new ObjectMapper()), feedback);

    @Test
    void recordsTheFeedbackThenDeletesTheMessageAndStopsAtAnEmptyBatch() {
        receive(List.of(message("r-1", BOUNCE)), List.of());

        poller.poll();

        verify(feedback).suppress(EmailSuppressionReason.HARD_BOUNCE, List.of("private@example.test"));
        var delete = ArgumentCaptor.forClass(DeleteMessageRequest.class);
        verify(client).deleteMessage(delete.capture());
        assertThat(delete.getValue().queueUrl()).isEqualTo(QUEUE);
        assertThat(delete.getValue().receiptHandle()).isEqualTo("r-1");
        var receive = ArgumentCaptor.forClass(ReceiveMessageRequest.class);
        verify(client, times(2)).receiveMessage(receive.capture());
        assertThat(receive.getAllValues().getFirst().waitTimeSeconds()).isEqualTo(SqsEmailFeedbackPoller.WAIT_SECONDS);
        assertThat(receive.getAllValues().getFirst().maxNumberOfMessages()).isEqualTo(10);
        assertThat(receive.getAllValues().get(1).waitTimeSeconds()).as("later batches do not wait").isZero();
    }

    @Test
    void acknowledgesEventsThatSuppressNothing() {
        receive(List.of(message("r-2", "{\"eventType\":\"Delivery\"}")), List.of());

        poller.poll();

        verifyNoInteractions(feedback);
        verify(client).deleteMessage(any(DeleteMessageRequest.class));
    }

    @Test
    void leavesUnreadableAndUnrecordedMessagesInTheQueueWithoutLoggingTheAddress() {
        receive(List.of(message("r-3", "garbage"), message("r-4", BOUNCE)), List.of());
        doThrow(new IllegalStateException("database down for private@example.test")).when(feedback).suppress(any(), any());

        withLogs(logs -> {
            poller.poll();
            assertThat(logs.list).hasSize(2);
            assertThat(logs.list).extracting(ILoggingEvent::getFormattedMessage)
                    .noneMatch(line -> line.contains("private@example.test"));
        });
        verify(client, never()).deleteMessage(any(DeleteMessageRequest.class));
    }

    @Test
    void aQueueOutageEndsThePollQuietly() {
        when(client.receiveMessage(any(ReceiveMessageRequest.class))).thenThrow(new IllegalStateException("offline"));

        poller.poll();

        verifyNoInteractions(feedback);
        verify(client, times(1)).receiveMessage(any(ReceiveMessageRequest.class));
    }

    @Test
    void drainsAtMostABoundedNumberOfBatchesPerPoll() {
        when(client.receiveMessage(any(ReceiveMessageRequest.class)))
                .thenReturn(ReceiveMessageResponse.builder().messages(message("r", "{\"eventType\":\"Delivery\"}")).build());

        poller.poll();

        verify(client, times(SqsEmailFeedbackPoller.MAX_BATCHES)).receiveMessage(any(ReceiveMessageRequest.class));
    }

    @SafeVarargs
    private void receive(List<Message>... batches) {
        var stub = when(client.receiveMessage(any(ReceiveMessageRequest.class)));
        for (List<Message> batch : batches) {
            stub = stub.thenReturn(ReceiveMessageResponse.builder().messages(batch).build());
        }
    }

    private static Message message(String receipt, String body) {
        return Message.builder().receiptHandle(receipt).body(body).build();
    }

    private static void withLogs(Consumer<ListAppender<ILoggingEvent>> assertions) {
        Logger logger = (Logger) LoggerFactory.getLogger(SqsEmailFeedbackPoller.class);
        var logs = new ListAppender<ILoggingEvent>();
        logs.start();
        logger.addAppender(logs);
        try {
            assertions.accept(logs);
        } finally {
            logger.detachAppender(logs);
            logs.stop();
        }
    }
}
