package com.vinnot.notification.domain.model;

import com.vinnot.shared.domain.exception.DomainException;

import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

/**
 * A user's stored choices per category and channel, plus their marketing consent. Every listed category is on by
 * default (#347); promotional ones also need a consent that was not revoked.
 */
public record NotificationPreferences(Map<Choice, Boolean> choices, MarketingConsent marketingConsent) {

    public NotificationPreferences {
        choices = Map.copyOf(Objects.requireNonNullElse(choices, Map.of()));
        marketingConsent = Objects.requireNonNullElse(marketingConsent, MarketingConsent.none());
        choices.keySet().forEach(NotificationPreferences::requireChangeable);
    }

    public static NotificationPreferences defaults() {
        return new NotificationPreferences(Map.of(), MarketingConsent.none());
    }

    public boolean allows(NotificationCategory category, NotificationChannel channel) {
        return switch (category.kind()) {
            case TRANSACTIONAL -> true;
            case OPTIONAL -> choices.getOrDefault(new Choice(category, channel), true);
            case PROMOTIONAL -> marketingConsent.granted()
                    && choices.getOrDefault(new Choice(category, channel), true);
        };
    }

    /** The same consent with these choices applied over the stored ones. */
    public NotificationPreferences withChoices(Map<Choice, Boolean> changes) {
        Map<Choice, Boolean> merged = new HashMap<>(choices);
        merged.putAll(changes);
        return new NotificationPreferences(merged, marketingConsent);
    }

    /** Turning a promotional category on is only possible while marketing consent is not revoked. */
    public void requireConsentFor(Map<Choice, Boolean> changes) {
        boolean enablesPromotion = changes.entrySet().stream()
                .anyMatch(change -> change.getKey().category().promotional() && change.getValue());
        if (enablesPromotion && !marketingConsent.granted()) {
            throw new DomainException("MARKETING_CONSENT_REQUIRED",
                    "Promotional notifications need marketing consent");
        }
    }

    private static void requireChangeable(Choice choice) {
        if (choice.category().transactional()) {
            throw new DomainException("TRANSACTIONAL_NOTIFICATION_CATEGORY",
                    choice.category() + " notifications are always delivered");
        }
    }

    public record Choice(NotificationCategory category, NotificationChannel channel) {
        public Choice {
            Objects.requireNonNull(category, "Category cannot be null");
            Objects.requireNonNull(channel, "Channel cannot be null");
        }
    }
}
