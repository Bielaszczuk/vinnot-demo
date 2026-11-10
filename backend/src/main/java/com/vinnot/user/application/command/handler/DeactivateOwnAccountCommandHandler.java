package com.vinnot.user.application.command.handler;

import com.vinnot.notification.application.port.in.ManagePushDevicesUseCase;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.user.application.command.model.DeactivateOwnAccountCommand;
import com.vinnot.user.application.port.in.DeactivateOwnAccountUseCase;
import com.vinnot.user.application.port.out.RefreshTokenRepositoryPort;
import com.vinnot.user.application.port.out.UserRepositoryPort;
import com.vinnot.user.application.service.AdminUserSafety;
import com.vinnot.user.domain.model.User;
import lombok.RequiredArgsConstructor;
import com.vinnot.user.application.service.AccountSecurityNoticeService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class DeactivateOwnAccountCommandHandler implements DeactivateOwnAccountUseCase {

    private final UserRepositoryPort userRepository;
    private final RefreshTokenRepositoryPort refreshTokenRepository;
    private final AccountSecurityNoticeService securityNotices;
    private final ManagePushDevicesUseCase pushDevices;

    @Override
    @Transactional
    public void execute(DeactivateOwnAccountCommand command) {
        User user = userRepository.findById(command.userId())
                .orElseThrow(() -> new EntityNotFoundException("User", command.userId()));

        AdminUserSafety.requireAnotherActiveAdministrator(userRepository, user);
        user.deactivate();
        userRepository.save(user);
        refreshTokenRepository.deleteByUserId(user.getId());
        pushDevices.forgetUser(user.getId());
        securityNotices.deactivated(user);
    }
}
