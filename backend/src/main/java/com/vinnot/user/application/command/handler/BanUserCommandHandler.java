package com.vinnot.user.application.command.handler;

import com.vinnot.user.application.service.SecurityEventRecorder;
import com.vinnot.user.domain.valueobject.SecurityEventType;
import com.vinnot.notification.application.port.in.ManagePushDevicesUseCase;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.user.application.command.model.BanUserCommand;
import com.vinnot.user.application.port.in.BanUserUseCase;
import com.vinnot.user.application.port.out.UserRepositoryPort;
import com.vinnot.user.domain.model.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;
import com.vinnot.user.application.service.AccountAdministrationNoticeService;
import com.vinnot.user.domain.valueobject.SuspensionReason;
import lombok.RequiredArgsConstructor;
import com.vinnot.user.application.service.AdminUserSafety;

@Service
@RequiredArgsConstructor
public class BanUserCommandHandler implements BanUserUseCase {

    private final UserRepositoryPort userRepository;
    private final AccountAdministrationNoticeService notices;
    private final ManagePushDevicesUseCase pushDevices;
    private final SecurityEventRecorder securityEvents;

    @Override
    @Transactional
    public void execute(BanUserCommand command) {
        User user = userRepository.findById(command.userId())
                .orElseThrow(() -> new EntityNotFoundException("User", command.userId()));

        AdminUserSafety.requireCanRemoveAccess(userRepository, command.actorId(), user);
        SuspensionReason reason = Objects.requireNonNullElse(command.reasonCode(), SuspensionReason.OTHER);
        String note = Objects.isNull(command.note()) || command.note().isBlank() ? null : command.note().trim();
        user.lock(Objects.isNull(note) ? reason.name() : reason.name() + ": " + note);
        userRepository.save(user);
        // A suspended account must stop receiving pushes on every device it had registered.
        pushDevices.forgetUser(user.getId());
        notices.suspended(user, reason, Objects.isNull(command.reasonCode()) ? null : note);
        securityEvents.record(SecurityEventType.ACCOUNT_BANNED, user.getId());
    }
}
