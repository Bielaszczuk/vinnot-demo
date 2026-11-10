package com.vinnot.notification.infrastructure.feedback;

import com.vinnot.notification.domain.model.EmailSuppressionReason;
import com.vinnot.notification.infrastructure.feedback.SesFeedbackEvents.Feedback;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SesFeedbackEventsTest {
    private final SesFeedbackEvents events = new SesFeedbackEvents(new ObjectMapper());

    @Test
    void aPermanentBounceSuppressesEveryBouncedRecipient() {
        var body = """
                {"eventType":"Bounce","bounce":{"bounceType":"Permanent","bounceSubType":"General",
                 "bouncedRecipients":[{"emailAddress":"a@example.test"},{"emailAddress":"b@example.test"}]},
                 "mail":{"messageId":"m-1"}}
                """;
        assertThat(events.parse(body)).contains(
                new Feedback(EmailSuppressionReason.HARD_BOUNCE, List.of("a@example.test", "b@example.test")));
    }

    @Test
    void transientAndUndeterminedBouncesSuppressNothing() {
        for (String type : new String[] {"Transient", "Undetermined"}) {
            var body = "{\"eventType\":\"Bounce\",\"bounce\":{\"bounceType\":\"" + type
                    + "\",\"bouncedRecipients\":[{\"emailAddress\":\"a@example.test\"}]}}";
            assertThat(events.parse(body)).as(type).isEmpty();
        }
    }

    @Test
    void aComplaintSuppressesTheComplainingRecipient() {
        var body = """
                {"eventType":"Complaint","complaint":{"complainedRecipients":[{"emailAddress":"c@example.test"}],
                 "complaintFeedbackType":"abuse"}}
                """;
        assertThat(events.parse(body)).contains(new Feedback(EmailSuppressionReason.COMPLAINT, List.of("c@example.test")));
    }

    @Test
    void readsTheEventInsideAnSnsEnvelopeAndIdentityNotifications() {
        var inner = "{\\\"notificationType\\\":\\\"Complaint\\\",\\\"complaint\\\":{\\\"complainedRecipients\\\":"
                + "[{\\\"emailAddress\\\":\\\"d@example.test\\\"}]}}";
        var envelope = "{\"Type\":\"Notification\",\"MessageId\":\"x\",\"Message\":\"" + inner + "\"}";
        assertThat(events.parse(envelope)).contains(new Feedback(EmailSuppressionReason.COMPLAINT, List.of("d@example.test")));
    }

    @Test
    void otherEventsAndEventsWithoutRecipientsSuppressNothing() {
        assertThat(events.parse("{\"eventType\":\"Delivery\",\"delivery\":{}}")).isEmpty();
        assertThat(events.parse("{\"eventType\":\"Complaint\",\"complaint\":{\"complainedRecipients\":[]}}")).isEmpty();
    }

    @Test
    void bodiesThatAreNotSesEventsAreUnreadable() {
        for (String body : new String[] {"not json", "[1]", "{\"mail\":{}}"}) {
            assertThatThrownBy(() -> events.parse(body)).as(body)
                    .isInstanceOf(SesFeedbackEvents.UnreadableFeedbackException.class);
        }
    }
}
