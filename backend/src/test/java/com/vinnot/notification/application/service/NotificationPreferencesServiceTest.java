package com.vinnot.notification.application.service;

import com.vinnot.notification.application.port.out.NotificationPreferenceRepositoryPort;
import com.vinnot.notification.application.port.out.PushRendererPort;
import com.vinnot.notification.domain.model.NotificationCategory;
import com.vinnot.notification.domain.model.NotificationChannel;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.notification.domain.model.PushContent;
import com.vinnot.notification.domain.model.ConsentSource;
import com.vinnot.notification.domain.model.MarketingConsent;
import com.vinnot.notification.domain.model.NotificationPreferences;
import com.vinnot.notification.domain.model.NotificationPreferences.Choice;
import com.vinnot.shared.domain.exception.DomainException;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static com.vinnot.notification.domain.model.NotificationCategory.EVENTS_NEARBY;
import static com.vinnot.notification.domain.model.NotificationCategory.NEWSLETTER;
import static com.vinnot.notification.domain.model.NotificationCategory.SECURITY;
import static com.vinnot.notification.domain.model.NotificationChannel.EMAIL;
import static com.vinnot.notification.domain.model.NotificationChannel.PUSH;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class NotificationPreferencesServiceTest {

    private static final Instant NOW = Instant.parse("2026-10-19T12:00:00Z");
    private final UUID user = UUID.randomUUID();
    private final FakeRepository repository = new FakeRepository();
    /** The push templates the platform has, as the template registry reports them. */
    private final PushRendererPort pushTemplates = pushTemplatesFor(Set.of(NotificationType.EVENT_NEARBY,
            NotificationType.WINE_RECOMMENDATION, NotificationType.REVIEW_COMMENT, NotificationType.NEWSLETTER,
            NotificationType.EVENT_REMINDER, NotificationType.ONBOARDING));
    private final NotificationPreferencesService service =
            new NotificationPreferencesService(repository, pushTemplates, Clock.fixed(NOW, ZoneOffset.UTC));

    @Test
    void offersOnlyTheChannelsTheTypesOfEachCategoryUse() {
        Map<NotificationCategory, Set<NotificationChannel>> channels = service.availableChannels();

        assertThat(channels.get(EVENTS_NEARBY)).containsExactly(PUSH);
        assertThat(channels.get(NotificationCategory.RECOMMENDATIONS)).containsExactly(PUSH);
        assertThat(channels.get(NotificationCategory.COMMUNITY)).containsExactlyInAnyOrder(EMAIL, PUSH);
        assertThat(channels.get(NEWSLETTER)).containsExactlyInAnyOrder(EMAIL, PUSH);
        assertThat(channels.get(NotificationCategory.TICKETS)).containsExactlyInAnyOrder(EMAIL, PUSH);
        assertThat(channels.get(SECURITY)).containsExactly(EMAIL);
        assertThat(channels.get(NotificationCategory.REMINDERS)).as("engagement reminders are pushed (#405)").containsExactly(PUSH);
        assertThat(channels.keySet()).containsAll(NotificationCategory.preferenceCategories());
    }

    @Test
    void grantsConsentAndTurnsAPromotionalCategoryOnInOneRequest() {
        var result = service.update(user, Map.of(new Choice(NEWSLETTER, EMAIL), true), true, ConsentSource.WEB);

        assertThat(result.allows(NEWSLETTER, EMAIL)).isTrue();
        assertThat(result.marketingConsent()).isEqualTo(new MarketingConsent(true, NOW, ConsentSource.WEB));
        assertThat(repository.consents).containsExactly("true WEB " + NOW);
        assertThat(repository.choices).containsEntry(new Choice(NEWSLETTER, EMAIL), true);
    }

    @Test
    void recordsARevocationWithItsSourceAndKeepsChoicesWithoutEffect() {
        service.update(user, Map.of(new Choice(NEWSLETTER, EMAIL), true), true, ConsentSource.WEB);

        var result = service.update(user, Map.of(), false, ConsentSource.MOBILE);

        assertThat(repository.consents).containsExactly("true WEB " + NOW, "false MOBILE " + NOW);
        assertThat(result.allows(NEWSLETTER, EMAIL)).isFalse();
        assertThat(repository.choices).containsEntry(new Choice(NEWSLETTER, EMAIL), true);
    }

    @Test
    void anUnchangedDecisionIsNotRecordedAgain() {
        service.update(user, Map.of(), true, ConsentSource.WEB);
        service.update(user, Map.of(), true, ConsentSource.MOBILE);

        assertThat(repository.consents).containsExactly("true WEB " + NOW);
    }

    @Test
    void anAccountThatNeverDecidedGetsPromotionsAndCanRevokeThem() {
        assertThat(service.get(user).allows(NEWSLETTER, EMAIL)).isTrue();

        var result = service.update(user, Map.of(), false, ConsentSource.MOBILE);

        assertThat(repository.consents).containsExactly("false MOBILE " + NOW);
        assertThat(result.allows(NEWSLETTER, EMAIL)).isFalse();
    }

    @Test
    void rejectsPromotionAfterARevocationAndTransactionalChangesWithoutWritingAnything() {
        service.update(user, Map.of(), false, ConsentSource.WEB);
        assertThatThrownBy(() -> service.update(user, Map.of(new Choice(NEWSLETTER, EMAIL), true), null, ConsentSource.WEB))
                .isInstanceOf(DomainException.class).hasFieldOrPropertyWithValue("code", "MARKETING_CONSENT_REQUIRED");
        assertThatThrownBy(() -> service.update(user, Map.of(new Choice(SECURITY, EMAIL), false), true, ConsentSource.WEB))
                .isInstanceOf(DomainException.class)
                .hasFieldOrPropertyWithValue("code", "TRANSACTIONAL_NOTIFICATION_CATEGORY");

        assertThat(repository.choices).isEmpty();
        assertThat(repository.consents).containsExactly("false WEB " + NOW);
    }

    @Test
    void storesOptionalChoicesAndReadsThemBack() {
        service.update(user, Map.of(new Choice(EVENTS_NEARBY, EMAIL), false), null, ConsentSource.MOBILE);

        assertThat(service.get(user).allows(EVENTS_NEARBY, EMAIL)).isFalse();
        assertThat(repository.consents).isEmpty();
    }

    private static final class FakeRepository implements NotificationPreferenceRepositoryPort {
        private final Map<Choice, Boolean> choices = new HashMap<>();
        private final List<String> consents = new ArrayList<>();
        private MarketingConsent consent = MarketingConsent.none();

        @Override
        public NotificationPreferences load(UUID userId) {
            return new NotificationPreferences(choices, consent);
        }

        @Override
        public void saveChoices(UUID userId, Map<Choice, Boolean> changes, Instant at) {
            choices.putAll(changes);
        }

        @Override
        public void recordConsent(UUID userId, boolean granted, ConsentSource source, Instant at) {
            consents.add(granted + " " + source + " " + at);
            consent = new MarketingConsent(granted, at, source);
        }
    }

    private static PushRendererPort pushTemplatesFor(Set<NotificationType> types) {
        return new PushRendererPort() {
            @Override
            public PushContent render(NotificationType type, NotificationLocale locale, Map<String, String> data) {
                throw new UnsupportedOperationException("Preferences never render a push");
            }

            @Override
            public Set<NotificationType> types() {
                return types;
            }
        };
    }
}
