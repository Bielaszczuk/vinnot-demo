package com.vinnot.user.application.service;

import com.vinnot.user.application.port.out.LoginAttemptPort;
import com.vinnot.user.domain.model.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

/** Starts a sign-in lock and queues its notice in one short transaction, so a lock never exists without its notice. */
@Service
@RequiredArgsConstructor
public class LoginLockStarter {
    private final LoginAttemptPort attempts;
    private final AccountSecurityNoticeService notices;

    /** Returns true for the one call that started the lock; a call that finds it running changes nothing. */
    @Transactional
    public boolean start(User user, int threshold, Instant now, Instant lockedUntil) {
        if (!attempts.startLock(user.getId(), threshold, now, lockedUntil)) {
            return false;
        }
        notices.loginLocked(user, lockedUntil);
        return true;
    }
}
