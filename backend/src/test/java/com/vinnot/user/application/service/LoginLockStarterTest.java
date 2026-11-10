package com.vinnot.user.application.service;

import com.vinnot.user.application.port.out.LoginAttemptPort;
import com.vinnot.user.domain.model.User;
import com.vinnot.user.domain.valueobject.Email;
import com.vinnot.user.domain.valueobject.Password;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class LoginLockStarterTest {
    private static final Instant NOW = Instant.parse("2026-10-29T12:00:00Z");
    private static final Instant UNTIL = NOW.plusSeconds(900);
    private final LoginAttemptPort attempts = mock(LoginAttemptPort.class);
    private final AccountSecurityNoticeService notices = mock(AccountSecurityNoticeService.class);
    private final LoginLockStarter starter = new LoginLockStarter(attempts, notices);
    private final User user = User.create("ana", Email.of("ana@vinnot.com"), Password.fromHash("hash"), "Ana", "Paz");

    @Test
    void theCallThatStartsTheLockNoticesTheOwner() {
        when(attempts.startLock(user.getId(), 5, NOW, UNTIL)).thenReturn(true);

        assertThat(starter.start(user, 5, NOW, UNTIL)).isTrue();

        verify(notices).loginLocked(user, UNTIL);
    }

    @Test
    void aCallThatFindsTheLockRunningSendsNoNotice() {
        when(attempts.startLock(user.getId(), 5, NOW, UNTIL)).thenReturn(false);

        assertThat(starter.start(user, 5, NOW, UNTIL)).isFalse();

        verifyNoInteractions(notices);
    }
}
