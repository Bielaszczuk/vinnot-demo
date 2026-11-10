package com.vinnot.user.application.command.handler;

import com.vinnot.user.application.service.SecurityEventRecorder;
import com.vinnot.user.domain.valueobject.SecurityEventType;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.user.application.command.model.UnbanUserCommand;
import com.vinnot.user.application.port.in.UnbanUserUseCase;
import com.vinnot.user.application.port.out.UserRepositoryPort;
import com.vinnot.user.domain.model.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.vinnot.user.application.service.AccountAdministrationNoticeService;
import lombok.RequiredArgsConstructor;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class UnbanUserCommandHandler implements UnbanUserUseCase {

    private final UserRepositoryPort userRepository;
    private final AccountAdministrationNoticeService notices;
    private final SecurityEventRecorder securityEvents;

    @Override
    @Transactional
    public void execute(UnbanUserCommand command) {
        User user = userRepository.findById(command.userId())
                .orElseThrow(() -> new EntityNotFoundException("User", command.userId()));

        boolean wasLocked = user.isLocked();
        user.unlock();
        userRepository.save(user);
        if (wasLocked) {
            notices.reinstated(user, Instant.now());
            securityEvents.record(SecurityEventType.ACCOUNT_UNBANNED, user.getId());
        }
    }
}

