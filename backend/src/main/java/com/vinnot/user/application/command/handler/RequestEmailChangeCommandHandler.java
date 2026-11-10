package com.vinnot.user.application.command.handler;

import com.vinnot.shared.domain.exception.DomainException;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.user.application.command.model.RequestEmailChangeCommand;
import com.vinnot.user.application.port.in.RequestEmailChangeUseCase;
import com.vinnot.user.application.port.out.UserRepositoryPort;
import com.vinnot.user.application.service.AccountActionTokenService;
import com.vinnot.user.domain.model.User;
import com.vinnot.user.domain.valueobject.Email;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class RequestEmailChangeCommandHandler implements RequestEmailChangeUseCase {

    private final UserRepositoryPort userRepository;
    private final AccountActionTokenService tokenService;

    @Override
    @Transactional
    public void execute(RequestEmailChangeCommand command) {
        User user = userRepository.findById(command.userId())
                .orElseThrow(() -> new EntityNotFoundException("User", command.userId()));
        Email newEmail = Email.of(command.newEmail());

        if (user.getEmail().equals(newEmail)) {
            throw new DomainException(
                    "EMAIL_UNCHANGED", "The new email must be different from the current email");
        }
        if (userRepository.existsByEmail(newEmail)) {
            throw new DomainException(
                    "EMAIL_ALREADY_EXISTS", "A user with this email already exists");
        }

        tokenService.sendEmailChangeConfirmation(user, newEmail.getValue());
    }
}
