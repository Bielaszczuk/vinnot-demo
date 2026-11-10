package com.vinnot.event.infrastructure.web.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

import java.util.List;
import jakarta.validation.constraints.Pattern;

public record RegisterForEventRequest(
        @Min(1) @Max(20) int attendeeCount,
        @Size(max = 150) String contactName,
        @Email @Size(max = 254) String contactEmail,
        @Size(max = 50) String contactPhone,
        @Size(max = 1000) String note,
        @Size(max = 19) List<@Size(max = 150) String> companionNames,
        String paymentMethod,
        boolean saveContactPhone,
        @Pattern(regexp = "es|en") String notificationLanguage
) {
    public RegisterForEventRequest(int attendeeCount, String contactName, String contactEmail, String contactPhone,
            String note, List<String> companionNames, String paymentMethod, boolean saveContactPhone) {
        this(attendeeCount,contactName,contactEmail,contactPhone,note,companionNames,paymentMethod,saveContactPhone,"es");
    }
    public RegisterForEventRequest(int attendeeCount, String contactName, String contactEmail, String contactPhone,
            String note, List<String> companionNames, String paymentMethod) {
        this(attendeeCount, contactName, contactEmail, contactPhone, note, companionNames, paymentMethod, false);
    }
}
