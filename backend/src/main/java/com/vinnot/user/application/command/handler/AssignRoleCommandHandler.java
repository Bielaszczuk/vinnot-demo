package com.vinnot.user.application.command.handler;

import com.vinnot.user.application.service.SecurityEventRecorder;
import com.vinnot.user.domain.valueobject.SecurityEventType;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.user.application.command.model.AssignRoleCommand;
import com.vinnot.user.application.port.in.AssignRoleUseCase;
import com.vinnot.user.application.port.out.UserRepositoryPort;
import com.vinnot.user.domain.model.User;
import com.vinnot.user.domain.valueobject.Role;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.vinnot.user.application.service.AccountAdministrationNoticeService;
import lombok.RequiredArgsConstructor;
import com.vinnot.shared.domain.exception.DomainException;
import com.vinnot.user.application.service.AdminUserSafety;
import java.util.Locale;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class AssignRoleCommandHandler implements AssignRoleUseCase {

    private final UserRepositoryPort userRepository;
    private final AccountAdministrationNoticeService notices;
    private final SecurityEventRecorder securityEvents;

    @Override
    @Transactional
    public void execute(AssignRoleCommand command) {
        User user = userRepository.findById(command.userId())
                .orElseThrow(() -> new EntityNotFoundException("User", command.userId()));

        Role role;
        try {
            role = Role.valueOf(command.role().toUpperCase(Locale.ROOT).replaceFirst("^ROLE_", ""));
        } catch (IllegalArgumentException | NullPointerException ex) {
            throw new DomainException("INVALID_ROLE", "Unknown user role");
        }
        Set<Role> before = Set.copyOf(user.getRoles());
        if (command.replace()) {
            if (user.hasRole(Role.ADMIN) && role != Role.ADMIN) {
                AdminUserSafety.requireCanRemoveAccess(userRepository, command.actorId(), user);
            }
            user.replaceRole(role);
        } else {
            user.addRole(role);
        }
        userRepository.save(user);
        if (!before.equals(user.getRoles())) {
            notices.roleChanged(user, role);
            securityEvents.record(SecurityEventType.ROLE_CHANGED, user.getId());
        }
    }
}
