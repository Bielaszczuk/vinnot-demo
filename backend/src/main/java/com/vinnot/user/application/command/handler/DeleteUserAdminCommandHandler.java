package com.vinnot.user.application.command.handler;

import com.vinnot.user.application.service.SecurityEventRecorder;
import com.vinnot.user.domain.valueobject.SecurityEventType;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.user.application.command.model.DeleteUserAdminCommand;
import com.vinnot.user.application.port.in.DeleteUserAdminUseCase;
import com.vinnot.user.application.port.out.UserRepositoryPort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.vinnot.user.application.service.AccountAdministrationNoticeService;
import lombok.RequiredArgsConstructor;
import com.vinnot.user.application.service.AdminUserSafety;

@Service
@RequiredArgsConstructor
public class DeleteUserAdminCommandHandler implements DeleteUserAdminUseCase {

    private final UserRepositoryPort userRepository;
    private final AccountAdministrationNoticeService notices;
    private final SecurityEventRecorder securityEvents;

    @Override
    @Transactional
    public void execute(DeleteUserAdminCommand command) {
        var user = userRepository.findById(command.userId())
                .orElseThrow(() -> new EntityNotFoundException("User", command.userId()));
        AdminUserSafety.requireCanRemoveAccess(userRepository, command.actorId(), user);
        notices.deletedByAdministrator(user);
        userRepository.deleteById(command.userId());
        securityEvents.record(SecurityEventType.ACCOUNT_DELETED, command.userId());
    }
}
