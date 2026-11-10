package com.vinnot.user.application.command.handler;

import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import com.vinnot.user.application.command.model.LoginCommand;
import com.vinnot.user.application.command.response.AuthSessionResponse;
import com.vinnot.user.application.port.in.LoginUserUseCase;
import com.vinnot.user.application.port.out.UserRepositoryPort;
import com.vinnot.user.application.service.AuthSessionIssuer;
import com.vinnot.user.application.service.LoginAttemptGuard;
import com.vinnot.user.application.service.SecurityEventRecorder;
import com.vinnot.user.domain.model.User;
import com.vinnot.user.domain.valueobject.SecurityEventType;
import org.springframework.stereotype.Service;

import java.util.Optional;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class LoginCommandHandler implements LoginUserUseCase {

    private final UserRepositoryPort userRepository;
    private final LoginAttemptGuard loginAttempts;
    private final AuthSessionIssuer authSessionIssuer;
    private final SecurityEventRecorder securityEvents;

    /**
     * Not transactional on purpose: the password hash is checked without holding a database connection, so a burst of
     * sign-ins cannot exhaust the pool (#482). The session is written in {@link AuthSessionIssuer}'s own transaction.
     */
    @Override
    public AuthSessionResponse execute(LoginCommand command) {
        Optional<User> account = userRepository.findByEmailOrUsername(command.usernameOrEmail());
        if (account.isEmpty()) {
            loginAttempts.rejectUnknownAccount(command.password());
            throw authFailed();
        }
        User user = account.get();

        // Throws ACCOUNT_TEMPORARILY_LOCKED while a lockout runs, before any other state of the account is revealed.
        if (!loginAttempts.passwordMatches(user, command.password())) {
            throw authFailed();
        }

        if (user.isLocked()) {
            throw new BusinessRuleViolationException(
                    "ACCOUNT_LOCKED", "Account is locked: " + user.getLockReason());
        }

        reactivateIfRequested(user, command.reactivate());

        if (!user.isEmailVerified()) {
            throw new BusinessRuleViolationException(
                    "EMAIL_NOT_VERIFIED", "Verify your email before signing in");
        }

        AuthSessionResponse session = authSessionIssuer.issue(user);
        securityEvents.record(SecurityEventType.LOGIN_SUCCEEDED, user.getId());
        return session;
    }

    private static BusinessRuleViolationException authFailed() {
        return new BusinessRuleViolationException("AUTH_FAILED", "Invalid credentials");
    }

    private void reactivateIfRequested(User user, boolean reactivate) {
        if (user.isActive()) {
            return;
        }
        if (!reactivate) {
            throw new BusinessRuleViolationException(
                    "ACCOUNT_DEACTIVATED",
                    "The account is deactivated and can be reactivated after confirming sign-in");
        }
        user.activate();
    }
}
