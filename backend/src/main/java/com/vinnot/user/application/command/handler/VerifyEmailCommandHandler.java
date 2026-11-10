package com.vinnot.user.application.command.handler;

import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.user.application.command.model.VerifyEmailCommand;
import com.vinnot.user.application.port.in.VerifyEmailUseCase;
import com.vinnot.user.application.port.out.UserRepositoryPort;
import com.vinnot.user.application.service.AccountActionTokenService;
import com.vinnot.user.application.service.WelcomeEmailService;
import com.vinnot.user.domain.model.User;
import com.vinnot.user.domain.model.UserActionToken;
import com.vinnot.user.domain.valueobject.UserActionTokenType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class VerifyEmailCommandHandler implements VerifyEmailUseCase {

    private final UserRepositoryPort userRepository;
    private final AccountActionTokenService tokenService;
    private final WelcomeEmailService welcomeEmails;

    @Override
    @Transactional
    public void execute(VerifyEmailCommand command) {
        UserActionToken token = tokenService.consume(
                command.token(), UserActionTokenType.EMAIL_VERIFICATION);
        User user = userRepository.findById(token.userId())
                .orElseThrow(() -> new EntityNotFoundException("User", token.userId()));
        boolean firstVerification = !user.isEmailVerified();
        user.verifyEmail();
        userRepository.save(user);
        if (firstVerification) {
            welcomeEmails.welcome(user);
        }
    }
}
