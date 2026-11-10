package com.vinnot.user.application.command.handler;

import com.vinnot.user.application.service.SecurityEventRecorder;
import com.vinnot.user.domain.valueobject.SecurityEventType;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.user.application.command.model.ChangePasswordCommand;
import com.vinnot.user.application.port.in.ChangePasswordUseCase;
import com.vinnot.user.application.port.out.PasswordHashingPort;
import com.vinnot.user.application.port.out.UserRepositoryPort;
import com.vinnot.user.domain.model.User;
import com.vinnot.user.domain.valueobject.Password;
import com.vinnot.user.application.service.AccountSecurityNoticeService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ChangePasswordCommandHandler implements ChangePasswordUseCase {

    private final UserRepositoryPort userRepository;
    private final PasswordHashingPort passwordHashing;
    private final AccountSecurityNoticeService securityNotices;
    private final SecurityEventRecorder securityEvents;

    @Override
    @Transactional
    public void execute(ChangePasswordCommand command) {
        User user = userRepository.findById(command.userId())
                .orElseThrow(() -> new EntityNotFoundException("User", command.userId()));

        if (!passwordHashing.matches(
                command.currentPassword(), user.getPassword().getHashedValue())) {
            throw new BusinessRuleViolationException("E2001", "Current password is incorrect");
        }

        Password.validatePlainPassword(command.newPassword());
        user.changePassword(Password.fromHash(passwordHashing.hash(command.newPassword())));
        userRepository.save(user);
        securityNotices.passwordChanged(user);
        securityEvents.record(SecurityEventType.PASSWORD_CHANGED, user.getId());
    }
}
