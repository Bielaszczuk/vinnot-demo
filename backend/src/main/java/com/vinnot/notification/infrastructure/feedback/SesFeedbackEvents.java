package com.vinnot.notification.infrastructure.feedback;

import com.vinnot.notification.domain.model.EmailSuppressionReason;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

/**
 * Reads the SES events the configuration set publishes to SNS. A queue body is either the raw event
 * (raw message delivery) or the SNS envelope around it; both carry the same SES JSON. Event publishing
 * names the kind in {@code eventType}, identity feedback in {@code notificationType}.
 */
public class SesFeedbackEvents {
    /** What one event asks for: suppress these addresses for this reason. */
    public record Feedback(EmailSuppressionReason reason, List<String> addresses) { }

    /** The body is not SES JSON; the message is left for the dead-letter queue. */
    public static class UnreadableFeedbackException extends RuntimeException {
        UnreadableFeedbackException(String message) {
            super(message);
        }
    }

    private final ObjectMapper mapper;

    public SesFeedbackEvents(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    /** Empty for events that suppress nothing: deliveries, soft or undetermined bounces, other kinds. */
    public Optional<Feedback> parse(String body) {
        JsonNode event = read(body);
        if ("Notification".equals(event.path("Type").asText()) && event.path("Message").isTextual()) {
            event = read(event.path("Message").asText());
        }
        String kind = event.hasNonNull("eventType") ? event.path("eventType").asText() : event.path("notificationType").asText();
        if (kind.isEmpty()) {
            throw new UnreadableFeedbackException("SES event without a type");
        }
        return switch (kind) {
            case "Bounce" -> "Permanent".equals(event.path("bounce").path("bounceType").asText())
                    ? feedback(EmailSuppressionReason.HARD_BOUNCE, event.path("bounce").path("bouncedRecipients"))
                    : Optional.empty();
            case "Complaint" -> feedback(EmailSuppressionReason.COMPLAINT,
                    event.path("complaint").path("complainedRecipients"));
            default -> Optional.empty();
        };
    }

    private Optional<Feedback> feedback(EmailSuppressionReason reason, JsonNode recipients) {
        List<String> addresses = new ArrayList<>();
        for (JsonNode recipient : recipients) {
            String address = recipient.path("emailAddress").asText();
            if (!address.isBlank()) {
                addresses.add(address);
            }
        }
        return addresses.isEmpty() ? Optional.empty() : Optional.of(new Feedback(reason, List.copyOf(addresses)));
    }

    private JsonNode read(String body) {
        try {
            JsonNode node = mapper.readTree(body);
            if (Objects.isNull(node) || !node.isObject()) {
                throw new UnreadableFeedbackException("SES event is not a JSON object");
            }
            return node;
        } catch (RuntimeException unreadable) {
            if (unreadable instanceof UnreadableFeedbackException known) {
                throw known;
            }
            throw new UnreadableFeedbackException("SES event is not JSON");
        }
    }
}
