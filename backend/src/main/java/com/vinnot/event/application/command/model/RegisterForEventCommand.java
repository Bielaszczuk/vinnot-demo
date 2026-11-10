package com.vinnot.event.application.command.model;

import com.vinnot.event.domain.valueobject.EventPaymentMethod;

import java.util.List;
import java.util.UUID;

public record RegisterForEventCommand(
        UUID eventId,
        UUID userId,
        int attendeeCount,
        String contactName,
        String contactEmail,
        String contactPhone,
        String note,
        List<String> companionNames,
        EventPaymentMethod paymentMethod,
        boolean saveContactPhone,
        String notificationLanguage
) {
    public RegisterForEventCommand(UUID eventId, UUID userId, int attendeeCount, String contactName,
            String contactEmail, String contactPhone, String note, List<String> companionNames, EventPaymentMethod paymentMethod, boolean saveContactPhone) {
        this(eventId,userId,attendeeCount,contactName,contactEmail,contactPhone,note,companionNames,paymentMethod,saveContactPhone,"es");
    }
    public RegisterForEventCommand(UUID eventId, UUID userId, int attendeeCount, String contactName,
            String contactEmail, String contactPhone, String note, List<String> companionNames, EventPaymentMethod paymentMethod) {
        this(eventId, userId, attendeeCount, contactName, contactEmail, contactPhone, note, companionNames, paymentMethod, false);
    }
}
