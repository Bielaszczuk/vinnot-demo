package com.vinnot.user.application.command.handler;

import com.vinnot.shared.domain.exception.DomainException;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.user.application.command.model.UpdateUserPreferencesCommand;
import com.vinnot.user.application.port.out.UserRepositoryPort;
import com.vinnot.user.domain.model.User;
import com.vinnot.user.domain.valueobject.Email;
import com.vinnot.user.domain.valueobject.Password;
import com.vinnot.user.domain.valueobject.UserTimezone;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UpdateUserPreferencesCommandHandlerTest {

    @Mock
    private UserRepositoryPort userRepository;

    @Test
    void storesTheNewLanguageAndTimezone() {
        User user = existingUser();
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));

        handler().execute(new UpdateUserPreferencesCommand(user.getId(), "EN", "Europe/Madrid"));

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        assertThat(captor.getValue().getPreferredLanguage().getValue()).isEqualTo("en");
        assertThat(captor.getValue().getTimezone().getValue()).isEqualTo("Europe/Madrid");
    }

    @Test
    void keepsTheStoredTimezoneWhenOnlyTheLanguageIsSent() {
        User user = existingUser();
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));

        handler().execute(new UpdateUserPreferencesCommand(user.getId(), "en", null));

        assertThat(user.getPreferredLanguage().getValue()).isEqualTo("en");
        assertThat(user.getTimezone()).isEqualTo(UserTimezone.DEFAULT);
        verify(userRepository).save(user);
    }

    @Test
    void skipsTheWriteWhenNothingChanged() {
        User user = existingUser();
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));

        handler().execute(new UpdateUserPreferencesCommand(
                user.getId(), "es", "America/Argentina/Buenos_Aires"));

        verify(userRepository, never()).save(any());
    }

    @Test
    void rejectsInvalidValuesWithoutSaving() {
        User user = existingUser();
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> handler().execute(
                new UpdateUserPreferencesCommand(user.getId(), "en", "Mars/Olympus")))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("INVALID_TIMEZONE");
        assertThatThrownBy(() -> handler().execute(
                new UpdateUserPreferencesCommand(user.getId(), "fr", null)))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("INVALID_PREFERRED_LANGUAGE");
        assertThat(user.getPreferredLanguage().getValue()).isEqualTo("es");
        verify(userRepository, never()).save(any());
    }

    @Test
    void failsForAnUnknownUser() {
        UUID missing = UUID.randomUUID();
        when(userRepository.findById(missing)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> handler().execute(
                new UpdateUserPreferencesCommand(missing, "en", null)))
                .isInstanceOf(EntityNotFoundException.class);
    }

    private UpdateUserPreferencesCommandHandler handler() {
        return new UpdateUserPreferencesCommandHandler(userRepository);
    }

    private User existingUser() {
        return User.create(
                "wine-user",
                Email.of("user@example.com"),
                Password.fromHash("hash"),
                "Wine",
                "User");
    }
}
