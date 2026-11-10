package com.vinnot.user.application.service;

import com.vinnot.user.application.port.out.PasswordHashingPort;
import com.vinnot.user.domain.exception.LoginTemporarilyLockedException;
import com.vinnot.user.domain.model.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Instant;
import java.util.Objects;
import java.util.Optional;

/**
 * The password check of sign-in and re-authentication, with the temporary lockout (#482). While an account is locked
 * every attempt gets {@link LoginTemporarilyLockedException}, whatever the password, so the answer never tells
 * whether the password was right.
 */
@Service
public class LoginAttemptGuard {
    /**
     * A BCrypt hash (cost 10, the encoder's default) of a random secret nobody knows. Comparing against it makes an
     * unknown email or username take as long as a wrong password, so timing does not reveal which accounts exist.
     */
    static final String DUMMY_PASSWORD_HASH = "$2a$10$wsfX3r4hgl/Ipu4aTrY0H.vIemLZJSK3Z0YWRgRJcwOLY.zCqOF2a";

    private final PasswordHashingPort passwords;
    private final LoginAttemptRecorder attempts;
    private final Clock clock;

    @Autowired
    public LoginAttemptGuard(PasswordHashingPort passwords, LoginAttemptRecorder attempts) {
        this(passwords, attempts, Clock.systemUTC());
    }

    LoginAttemptGuard(PasswordHashingPort passwords, LoginAttemptRecorder attempts, Clock clock) {
        this.passwords = passwords;
        this.attempts = attempts;
        this.clock = clock;
    }

    /** No account matched: spend one hash comparison like a real account would, and record the attempt. */
    public void rejectUnknownAccount(String password) {
        passwords.matches(Objects.requireNonNullElse(password, ""), DUMMY_PASSWORD_HASH);
        attempts.unknownAccount();
    }

    /**
     * Checks the password and counts the result. Call it outside a transaction: the hash comparison is slow and must
     * not hold a database connection, and the count must survive a sign-in that fails afterwards.
     *
     * @return whether the password is right
     * @throws LoginTemporarilyLockedException while the account is locked, including a lock that started after
     *         {@code user} was loaded, or when this failure starts the lock
     */
    public boolean passwordMatches(User user, String password) {
        if (user.isLoginLockedAt(clock.instant())) {
            throw new LoginTemporarilyLockedException(user.getLoginLockedUntil());
        }
        if (passwords.matches(password, user.getPassword().getHashedValue())) {
            Optional<Instant> lockedUntil = attempts.succeeded(user);
            if (lockedUntil.isPresent()) {
                throw new LoginTemporarilyLockedException(lockedUntil.get());
            }
            return true;
        }
        Optional<Instant> lockedUntil = attempts.failed(user);
        if (lockedUntil.isPresent()) {
            throw new LoginTemporarilyLockedException(lockedUntil.get());
        }
        return false;
    }
}
