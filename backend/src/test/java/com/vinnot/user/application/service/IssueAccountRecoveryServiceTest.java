package com.vinnot.user.application.service;

import com.vinnot.user.application.port.out.UserRepositoryPort;
import com.vinnot.user.domain.model.User;
import com.vinnot.user.domain.valueobject.AccountRecoveryAction;
import com.vinnot.user.domain.valueobject.Email;
import com.vinnot.user.domain.valueobject.Password;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class IssueAccountRecoveryServiceTest {
    private static final Email EMAIL = Email.of("user@vinnot.com");

    @Mock
    private UserRepositoryPort userRepository;
    @Mock
    private AccountActionTokenService tokenService;

    private IssueAccountRecoveryService service;
    private User user;

    @BeforeEach
    void setUp() {
        service = new IssueAccountRecoveryService(userRepository, tokenService);
        user = User.create("wine-lover", EMAIL, Password.fromHash("hash"), "Wine", "Lover");
    }

    @Test
    void sendsAPasswordResetToAnActiveUnlockedAccount() {
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));

        service.issue(AccountRecoveryAction.PASSWORD_RESET, EMAIL);

        verify(tokenService).sendPasswordReset(user);
    }

    @Test
    void skipsPasswordResetForLockedOrInactiveAccounts() {
        user.lock("security review");
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        service.issue(AccountRecoveryAction.PASSWORD_RESET, EMAIL);

        User inactive = User.create("inactive", EMAIL, Password.fromHash("hash"), "Wine", "Lover");
        inactive.deactivate();
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(inactive));
        service.issue(AccountRecoveryAction.PASSWORD_RESET, EMAIL);

        verifyNoInteractions(tokenService);
    }

    @Test
    void sendsVerificationOnlyToAnActiveUnverifiedAccount() {
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        service.issue(AccountRecoveryAction.EMAIL_VERIFICATION, EMAIL);
        verify(tokenService).sendEmailVerification(user);
    }

    @Test
    void skipsVerificationForVerifiedOrInactiveAccounts() {
        user.verifyEmail();
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        service.issue(AccountRecoveryAction.EMAIL_VERIFICATION, EMAIL);

        User inactive = User.create("inactive", EMAIL, Password.fromHash("hash"), "Wine", "Lover");
        inactive.deactivate();
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(inactive));
        service.issue(AccountRecoveryAction.EMAIL_VERIFICATION, EMAIL);

        verifyNoInteractions(tokenService);
    }

    @Test
    void doesNothingForAnUnknownAddress() {
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.empty());

        service.issue(AccountRecoveryAction.PASSWORD_RESET, EMAIL);
        service.issue(AccountRecoveryAction.EMAIL_VERIFICATION, EMAIL);

        verifyNoInteractions(tokenService);
    }
}
