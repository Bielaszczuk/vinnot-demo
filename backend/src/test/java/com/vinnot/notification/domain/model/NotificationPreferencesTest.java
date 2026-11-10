package com.vinnot.notification.domain.model;

import com.vinnot.shared.domain.exception.DomainException;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.Map;

import static com.vinnot.notification.domain.model.NotificationCategory.COMMUNITY;
import static com.vinnot.notification.domain.model.NotificationCategory.EVENTS_NEARBY;
import static com.vinnot.notification.domain.model.NotificationCategory.NEWSLETTER;
import static com.vinnot.notification.domain.model.NotificationCategory.PAYMENTS;
import static com.vinnot.notification.domain.model.NotificationCategory.RECOMMENDATIONS;
import static com.vinnot.notification.domain.model.NotificationCategory.REMINDERS;
import static com.vinnot.notification.domain.model.NotificationCategory.SECURITY;
import static com.vinnot.notification.domain.model.NotificationChannel.EMAIL;
import static com.vinnot.notification.domain.model.NotificationChannel.PUSH;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class NotificationPreferencesTest {

    private static final Instant NOW = Instant.parse("2026-10-19T12:00:00Z");

    @Test
    void transactionalCategoriesAreAlwaysDeliveredOnEveryChannel() {
        var preferences = NotificationPreferences.defaults();

        assertThat(preferences.allows(SECURITY, EMAIL)).isTrue();
        assertThat(preferences.allows(PAYMENTS, PUSH)).isTrue();
    }

    @Test
    void everyCategoryStartsOnForAnAccountThatNeverDecided() {
        var preferences = NotificationPreferences.defaults();

        assertThat(preferences.allows(EVENTS_NEARBY, EMAIL)).isTrue();
        assertThat(preferences.allows(COMMUNITY, PUSH)).isTrue();
        assertThat(preferences.allows(NEWSLETTER, EMAIL)).isTrue();
        assertThat(preferences.allows(NEWSLETTER, PUSH)).isTrue();
        assertThat(preferences.allows(RECOMMENDATIONS, EMAIL)).isTrue();
        assertThat(preferences.allows(RECOMMENDATIONS, PUSH)).isTrue();
        assertThat(preferences.marketingConsent().granted()).isTrue();
        assertThat(preferences.marketingConsent().decided()).isFalse();
    }

    @Test
    void everyListedCategoryIsOnOnEveryChannelUntilTheUserTurnsItOff() {
        var preferences = NotificationPreferences.defaults();

        assertThat(NotificationCategory.preferenceCategories()).contains(REMINDERS, RECOMMENDATIONS, NEWSLETTER);
        for (NotificationCategory category : NotificationCategory.preferenceCategories()) {
            for (NotificationChannel channel : NotificationChannel.values()) {
                assertThat(preferences.allows(category, channel)).as(category + " " + channel).isTrue();
            }
        }
    }

    @Test
    void remindersAreAnOptionalCategoryWithoutAPushLimitOfItsOwn() {
        assertThat(REMINDERS.kind()).isEqualTo(NotificationCategory.Kind.OPTIONAL);
        assertThat(REMINDERS.pushLimit()).isEmpty();
        var off = NotificationPreferences.defaults().withChoices(Map.of(
                new NotificationPreferences.Choice(REMINDERS, PUSH), false));
        var revoked = new NotificationPreferences(Map.of(), new MarketingConsent(false, NOW, ConsentSource.WEB));

        assertThat(off.allows(REMINDERS, PUSH)).isFalse();
        assertThat(revoked.allows(REMINDERS, PUSH)).as("not promotional").isTrue();
    }

    @Test
    void storedChoicesApplyPerCategoryAndChannel() {
        var preferences = NotificationPreferences.defaults().withChoices(Map.of(
                new NotificationPreferences.Choice(EVENTS_NEARBY, EMAIL), false));

        assertThat(preferences.allows(EVENTS_NEARBY, EMAIL)).isFalse();
        assertThat(preferences.allows(EVENTS_NEARBY, PUSH)).isTrue();
    }

    @Test
    void aRevokedConsentOrAPromotionalCategoryTurnedOffStopsPromotions() {
        var revoked = new NotificationPreferences(Map.of(),
                new MarketingConsent(false, NOW, ConsentSource.WEB));
        var newsletterEmailOff = NotificationPreferences.defaults().withChoices(Map.of(
                new NotificationPreferences.Choice(NEWSLETTER, EMAIL), false));

        assertThat(revoked.allows(NEWSLETTER, EMAIL)).isFalse();
        assertThat(revoked.allows(RECOMMENDATIONS, PUSH)).isFalse();
        assertThat(revoked.allows(COMMUNITY, PUSH)).as("not promotional").isTrue();
        assertThat(newsletterEmailOff.allows(NEWSLETTER, EMAIL)).isFalse();
        assertThat(newsletterEmailOff.allows(NEWSLETTER, PUSH)).isTrue();
    }

    @Test
    void aConsentDecisionNeedsItsTimeAndSource() {
        assertThat(new MarketingConsent(true, NOW, ConsentSource.MOBILE).decided()).isTrue();
        assertThatThrownBy(() -> new MarketingConsent(false, null, null))
                .isInstanceOf(DomainException.class)
                .hasFieldOrPropertyWithValue("code", "INVALID_MARKETING_CONSENT");
        assertThatThrownBy(() -> new MarketingConsent(true, NOW, null))
                .isInstanceOf(DomainException.class)
                .hasFieldOrPropertyWithValue("code", "INVALID_MARKETING_CONSENT");
    }

    @Test
    void transactionalCategoriesCannotBeChanged() {
        assertThatThrownBy(() -> NotificationPreferences.defaults().withChoices(Map.of(
                new NotificationPreferences.Choice(SECURITY, EMAIL), false)))
                .isInstanceOf(DomainException.class)
                .hasFieldOrPropertyWithValue("code", "TRANSACTIONAL_NOTIFICATION_CATEGORY")
                .hasMessage("SECURITY notifications are always delivered");
    }

    @Test
    void enablingAPromotionalCategoryAfterRevokingConsentIsRejected() {
        var preferences = new NotificationPreferences(Map.of(), new MarketingConsent(false, NOW, ConsentSource.WEB));
        NotificationPreferences.defaults().requireConsentFor(Map.of(
                new NotificationPreferences.Choice(NEWSLETTER, EMAIL), true));

        assertThatThrownBy(() -> preferences.requireConsentFor(Map.of(
                new NotificationPreferences.Choice(RECOMMENDATIONS, PUSH), true)))
                .isInstanceOf(DomainException.class)
                .hasFieldOrPropertyWithValue("code", "MARKETING_CONSENT_REQUIRED");
        preferences.requireConsentFor(Map.of(new NotificationPreferences.Choice(RECOMMENDATIONS, PUSH), false));
    }

    @Test
    void categoriesDescribeTheirKind() {
        assertThat(SECURITY.kind()).isEqualTo(NotificationCategory.Kind.TRANSACTIONAL);
        assertThat(EVENTS_NEARBY.kind()).isEqualTo(NotificationCategory.Kind.OPTIONAL);
        assertThat(NEWSLETTER.promotional()).isTrue();
        assertThat(NotificationCategory.preferenceCategories()).containsExactly(
                NotificationCategory.ACCOUNT, SECURITY, PAYMENTS, NotificationCategory.TICKETS,
                EVENTS_NEARBY, RECOMMENDATIONS, COMMUNITY, REMINDERS, NEWSLETTER);
    }
}
