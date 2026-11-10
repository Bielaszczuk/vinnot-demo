package com.vinnot.notification.application.service;

import com.vinnot.notification.application.port.out.NotificationPreferenceRepositoryPort;
import com.vinnot.notification.application.port.out.UnsubscribeLinkPort;
import com.vinnot.notification.domain.model.NotificationCategory;
import com.vinnot.notification.domain.model.NotificationChannel;
import com.vinnot.notification.domain.model.NotificationPreferences;
import com.vinnot.shared.domain.exception.DomainException;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class UnsubscribeServiceTest {
    private final UnsubscribeLinkPort links = mock(UnsubscribeLinkPort.class);
    private final NotificationPreferenceRepositoryPort preferences = mock(NotificationPreferenceRepositoryPort.class);
    private final UnsubscribeService service = new UnsubscribeService(links, preferences);

    @Test
    void turnsOffOnlyTheEmailChannelOfTheLinkedCategory() {
        UUID user = UUID.randomUUID();
        when(links.verify("token")).thenReturn(Optional.of(
                new UnsubscribeLinkPort.UnsubscribeTarget(user, NotificationCategory.NEWSLETTER)));

        assertThat(service.unsubscribe("token")).isEqualTo(NotificationCategory.NEWSLETTER);

        verify(preferences).saveChoices(eq(user), eq(Map.of(new NotificationPreferences.Choice(
                NotificationCategory.NEWSLETTER, NotificationChannel.EMAIL), false)), any());
    }

    @Test
    void rejectsInvalidTokensAndTransactionalCategoriesWithoutWriting() {
        when(links.verify("forged")).thenReturn(Optional.empty());
        when(links.verify("security")).thenReturn(Optional.of(
                new UnsubscribeLinkPort.UnsubscribeTarget(UUID.randomUUID(), NotificationCategory.SECURITY)));

        for (String token : new String[] {"forged", "security"}) {
            assertThatThrownBy(() -> service.unsubscribe(token)).isInstanceOf(DomainException.class)
                    .hasFieldOrPropertyWithValue("code", "INVALID_UNSUBSCRIBE_LINK");
        }
        verifyNoInteractions(preferences);
    }
}
