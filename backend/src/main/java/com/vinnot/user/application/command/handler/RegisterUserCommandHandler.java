package com.vinnot.user.application.command.handler;

import com.vinnot.shared.domain.exception.DomainException;
import com.vinnot.user.application.command.model.RegisterUserCommand;
import com.vinnot.user.application.port.in.RegisterUserUseCase;
import com.vinnot.user.application.port.out.PasswordHashingPort;
import com.vinnot.user.application.port.out.UserRepositoryPort;
import com.vinnot.user.application.service.AccountActionTokenService;
import com.vinnot.user.domain.model.User;
import com.vinnot.user.domain.valueobject.Email;
import com.vinnot.user.domain.valueobject.Password;
import com.vinnot.user.domain.valueobject.Username;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;
import lombok.RequiredArgsConstructor;
import com.vinnot.legal.application.port.in.LegalAgreementUseCase;

@Service
@RequiredArgsConstructor
public class RegisterUserCommandHandler implements RegisterUserUseCase {

    private final UserRepositoryPort userRepository;
    private final PasswordHashingPort passwordHashing;
    private final AccountActionTokenService accountActionTokenService;
    private final LegalAgreementUseCase legalAgreements;

    @Override
    @Transactional
    public UUID execute(RegisterUserCommand command) {
        legalAgreements.validateRegistration(command.termsAcceptance());
        Email email = Email.of(command.email());
        String username = Username.of(command.username()).getValue();

        if (userRepository.existsByEmail(email)) {
            throw new DomainException("EMAIL_ALREADY_EXISTS", "A user with this email already exists");
        }

        if (userRepository.existsByUsername(username)) {
            throw new DomainException("USERNAME_ALREADY_EXISTS", "A user with this username already exists");
        }

        Password.validatePlainPassword(command.password());
        String hashedPassword = passwordHashing.hash(command.password());
        Password password = Password.fromHash(hashedPassword);

        User user = User.create(username, email, password, command.firstName(), command.lastName());
        User savedUser = userRepository.save(user);
        legalAgreements.recordRegistration(savedUser.getId(), command.termsAcceptance());
        accountActionTokenService.sendEmailVerification(savedUser);
        return savedUser.getId();
    }
}
