package com.vinnot.event.application.port.out;
import java.util.UUID;
public interface EventNotificationPreferences {
    void setLanguage(UUID registrationId, String language);
}
