package com.vinnot.support.infrastructure;

import com.vinnot.shared.application.exception.ExternalServiceUnavailableException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class SupportDeliveryConfiguration {
    private final String recipient;
    private final String provider;
    private final String sender;
    public SupportDeliveryConfiguration(@Value("${app.support.recipient:}") String recipient,
            @Value("${app.auth.email.provider:log}") String provider,
            @Value("${app.auth.email.from:}") String sender) {
        this.recipient = recipient;
        this.provider = provider;
        this.sender = sender;
    }
    public String requireRecipient() {
        if (!"ses".equals(provider) || !recipient.matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+")
                || sender.isBlank() || sender.contains("\r") || sender.contains("\n")) {
            throw new ExternalServiceUnavailableException("SUPPORT_UNAVAILABLE",
                    "Support delivery is temporarily unavailable", null);
        }
        return recipient;
    }
}
