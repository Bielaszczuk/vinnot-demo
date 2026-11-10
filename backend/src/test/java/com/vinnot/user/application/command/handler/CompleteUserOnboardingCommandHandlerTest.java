package com.vinnot.user.application.command.handler;

import com.vinnot.shared.domain.exception.DomainException;
import com.vinnot.user.application.command.model.CompleteUserOnboardingCommand;
import com.vinnot.user.application.port.out.UserRepositoryPort;
import com.vinnot.user.domain.model.User;
import com.vinnot.user.domain.valueobject.Email;
import com.vinnot.user.domain.valueobject.Password;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.anyString;

@ExtendWith(MockitoExtension.class)
class CompleteUserOnboardingCommandHandlerTest {

    @Mock
    private UserRepositoryPort userRepository;

    @Test
    void completesOnboardingWithChosenUsername() {
        User user = socialUser();
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(userRepository.existsByUsername("wine.lover")).thenReturn(false);
        CompleteUserOnboardingCommandHandler handler =
                new CompleteUserOnboardingCommandHandler(userRepository);

        handler.execute(new CompleteUserOnboardingCommand(user.getId(), " Wine.Lover "));

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        assertThat(captor.getValue().getUsername()).isEqualTo("wine.lover");
        assertThat(captor.getValue().isOnboardingCompleted()).isTrue();
    }

    @Test
    void skippingKeepsGeneratedUsernameAndCompletesOnboarding() {
        User user = socialUser();
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        CompleteUserOnboardingCommandHandler handler =
                new CompleteUserOnboardingCommandHandler(userRepository);

        handler.execute(new CompleteUserOnboardingCommand(user.getId(), null));

        assertThat(user.getUsername()).isEqualTo("vinnoter-12345678");
        assertThat(user.isOnboardingCompleted()).isTrue();
        verify(userRepository, never()).existsByUsername(anyString());
    }

    @Test
    void rejectsAnAlreadyUsedUsername() {
        User user = socialUser();
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(userRepository.existsByUsername("wine.lover")).thenReturn(true);
        CompleteUserOnboardingCommandHandler handler =
                new CompleteUserOnboardingCommandHandler(userRepository);

        assertThatThrownBy(() -> handler.execute(
                new CompleteUserOnboardingCommand(user.getId(), "wine.lover")))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("USERNAME_ALREADY_EXISTS");
        verify(userRepository, never()).save(user);
    }

    private User socialUser() {
        return User.createSocial(
                "vinnoter-12345678",
                Email.of("social@vinnot.com"),
                Password.fromHash("hash"),
                "Social",
                "User");
    }
}
