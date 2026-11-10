package com.vinnot.event.infrastructure.notification;
import com.vinnot.event.application.port.in.NotifyEventRegistrationUseCase;
import com.vinnot.shared.infrastructure.effects.ExternalEffectHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import java.util.Map;
import java.util.UUID;
@Component
@RequiredArgsConstructor
public class EventRegistrationEffectHandler implements ExternalEffectHandler {
    private final NotifyEventRegistrationUseCase notifications;
    @Override public boolean supports(String kind) { return "EVENT_REGISTRATION_CHANGED".equals(kind); }
    @Override public void execute(String kind, Map<String,Object> payload) {
        String recipient = String.valueOf(payload.get("recipient"));
        if (!"ORGANIZER".equals(recipient) && !"ATTENDEE".equals(recipient)) {
            throw new IllegalArgumentException("Invalid notification recipient type");
        }
        notifications.notify(UUID.fromString(String.valueOf(payload.get("registrationId"))),
                ((Number) payload.get("version")).longValue(), "ORGANIZER".equals(recipient));
    }
}
