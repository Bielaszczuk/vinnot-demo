package com.vinnot.user.application.command.handler;

import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.user.application.command.model.UpdateUserAdminCommand;
import com.vinnot.user.application.port.in.UpdateUserAdminUseCase;
import com.vinnot.user.application.port.out.UserRepositoryPort;
import com.vinnot.notification.application.port.in.ManagePushDevicesUseCase;
import com.vinnot.user.domain.model.User;
import com.vinnot.user.application.service.AdminUserSafety;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class UpdateUserAdminCommandHandler implements UpdateUserAdminUseCase {

    private final UserRepositoryPort userRepository;
    private final ManagePushDevicesUseCase pushDevices;

    @Override
    @Transactional
    public void execute(UpdateUserAdminCommand command) {
        User user = userRepository.findById(command.userId())
                .orElseThrow(() -> new EntityNotFoundException("User", command.userId()));

        String firstName = Objects.nonNull(command.firstName()) ? command.firstName() : user.getFirstName();
        String lastName = Objects.nonNull(command.lastName()) ? command.lastName() : user.getLastName();
        user.updateProfile(firstName, lastName);

        if (Objects.nonNull(command.active())) {
            if (command.active()) {
                user.activate();
            } else {
                AdminUserSafety.requireCanRemoveAccess(userRepository, command.actorId(), user);
                user.deactivate();
                pushDevices.forgetUser(user.getId());
            }
        }

        userRepository.save(user);
    }
}
