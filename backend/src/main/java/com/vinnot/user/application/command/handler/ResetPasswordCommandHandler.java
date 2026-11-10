package com.vinnot.user.application.command.handler;

import com.vinnot.user.application.service.SecurityEventRecorder;
import com.vinnot.user.domain.valueobject.SecurityEventType;
import com.vinnot.user.application.port.out.LoginAttemptPort;
import com.vinnot.notification.application.port.in.ManagePushDevicesUseCase;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.user.application.command.model.ResetPasswordCommand;
import com.vinnot.user.application.port.in.ResetPasswordUseCase;
import com.vinnot.user.application.port.out.PasswordHashingPort;
import com.vinnot.user.application.port.out.RefreshTokenRepositoryPort;
import com.vinnot.user.application.port.out.UserRepositoryPort;
import com.vinnot.user.application.service.AccountActionTokenService;
import com.vinnot.user.domain.model.User;
import com.vinnot.user.domain.model.UserActionToken;
import com.vinnot.user.domain.valueobject.Password;
import com.vinnot.user.domain.valueobject.UserActionTokenType;
import com.vinnot.user.application.service.AccountSecurityNoticeService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ResetPasswordCommandHandler implements ResetPasswordUseCase {

    private final UserRepositoryPort userRepository;
    private final RefreshTokenRepositoryPort refreshTokenRepository;
    private final AccountActionTokenService tokenService;
    private final PasswordHashingPort passwordHashing;
    private final AccountSecurityNoticeService securityNotices;
    private final ManagePushDevicesUseCase pushDevices;
    private final LoginAttemptPort loginAttempts;
    private final SecurityEventRecorder securityEvents;

    @Override
    @Transactional
    public void execute(ResetPasswordCommand command) {
        Password.validatePlainPassword(command.newPassword());
        UserActionToken token = tokenService.consume(
                command.token(), UserActionTokenType.PASSWORD_RESET);
        User user = userRepository.findById(token.userId())
                .orElseThrow(() -> new EntityNotFoundException("User", token.userId()));
        user.changePassword(Password.fromHash(passwordHashing.hash(command.newPassword())));
        userRepository.save(user);
        refreshTokenRepository.deleteByUserId(user.getId());
        // Every session ends, so no device keeps receiving this account's pushes until it signs in again.
        pushDevices.forgetUser(user.getId());
        securityNotices.passwordChanged(user);
        // The lock notice tells the owner to reset the password; the new one must not wait for the lock to end.
        loginAttempts.reset(user.getId());
        securityEvents.record(SecurityEventType.PASSWORD_RESET, user.getId());
    }
}
