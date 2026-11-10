package com.vinnot.user.application.command.handler;

import com.vinnot.user.domain.valueobject.SecurityEventType;
import com.vinnot.user.application.service.SecurityEventRecorder;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import com.vinnot.user.application.command.model.ChangePasswordCommand;
import com.vinnot.user.application.port.out.PasswordHashingPort;
import com.vinnot.user.application.port.out.UserRepositoryPort;
import com.vinnot.user.domain.model.User;
import com.vinnot.user.domain.valueobject.Email;
import com.vinnot.user.domain.valueobject.Password;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import com.vinnot.user.application.service.AccountSecurityNoticeService;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
class ChangePasswordCommandHandlerTest {

    @Mock
    private UserRepositoryPort userRepository;
    @Mock
    private PasswordHashingPort passwordHashing;
    @Mock
    private AccountSecurityNoticeService securityNotices;
    @Mock
    private SecurityEventRecorder securityEvents;

    private User user;
    private ChangePasswordCommandHandler handler;

    @BeforeEach
    void setUp() {
        user = User.create(
                "profile-user", Email.of("profile@vinnot.com"),
                Password.fromHash("current-hash"), "Profile", "User");
        handler = new ChangePasswordCommandHandler(userRepository, passwordHashing, securityNotices, securityEvents);
    }

    @Test
    void rejectsAnIncorrectCurrentPassword() {
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(passwordHashing.matches("wrong", "current-hash")).thenReturn(false);

        assertThatThrownBy(() -> handler.execute(
                new ChangePasswordCommand(user.getId(), "wrong", "NewPassword1")))
                .isInstanceOf(BusinessRuleViolationException.class)
                .hasMessageContaining("Current password is incorrect");
        verifyNoInteractions(securityNotices, securityEvents);
    }

    @Test
    void changesPasswordWhenCurrentPasswordMatches() {
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(passwordHashing.matches("CurrentPassword1", "current-hash")).thenReturn(true);
        when(passwordHashing.hash("NewPassword1")).thenReturn("new-hash");

        handler.execute(new ChangePasswordCommand(
                user.getId(), "CurrentPassword1", "NewPassword1"));

        assertThat(user.getPassword().getHashedValue()).isEqualTo("new-hash");
        verify(userRepository).save(user);
        verify(securityNotices).passwordChanged(user);
        verify(securityEvents).record(SecurityEventType.PASSWORD_CHANGED, user.getId());
    }

    @Test
    void rejectsANewPasswordThatDoesNotMeetTheDomainPolicy() {
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(passwordHashing.matches("CurrentPassword1", "current-hash")).thenReturn(true);

        assertThatThrownBy(() -> handler.execute(
                new ChangePasswordCommand(user.getId(), "CurrentPassword1", "weak")))
                .hasMessageContaining("at least 8 characters");
    }
}
