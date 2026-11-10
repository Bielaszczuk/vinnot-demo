package com.vinnot.user.application.command.handler;

import com.vinnot.shared.domain.exception.DomainException;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.user.application.command.model.CompleteUserOnboardingCommand;
import com.vinnot.user.application.port.in.CompleteUserOnboardingUseCase;
import com.vinnot.user.application.port.out.UserRepositoryPort;
import com.vinnot.user.domain.model.User;
import com.vinnot.user.domain.valueobject.Username;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CompleteUserOnboardingCommandHandler implements CompleteUserOnboardingUseCase {

    private final UserRepositoryPort userRepository;

    @Override
    @Transactional
    public UUID execute(CompleteUserOnboardingCommand command) {
        User user = userRepository.findById(command.userId())
                .orElseThrow(() -> new EntityNotFoundException("User", command.userId()));

        if (Objects.nonNull(command.username()) && !command.username().isBlank()) {
            String username = Username.of(command.username()).getValue();
            if (!username.equalsIgnoreCase(user.getUsername())
                    && userRepository.existsByUsername(username)) {
                throw new DomainException(
                        "USERNAME_ALREADY_EXISTS", "A user with this username already exists");
            }
            user.updateUsername(username);
        }

        user.completeOnboarding();
        userRepository.save(user);
        return user.getId();
    }
}
