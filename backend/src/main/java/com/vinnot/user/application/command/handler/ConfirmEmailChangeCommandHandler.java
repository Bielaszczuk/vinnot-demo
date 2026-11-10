package com.vinnot.user.application.command.handler;

import com.vinnot.user.application.service.SecurityEventRecorder;
import com.vinnot.user.domain.valueobject.SecurityEventType;
import com.vinnot.shared.domain.exception.DomainException;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.user.application.command.model.ConfirmEmailChangeCommand;
import com.vinnot.user.application.port.in.ConfirmEmailChangeUseCase;
import com.vinnot.user.application.port.out.RefreshTokenRepositoryPort;
import com.vinnot.notification.application.port.in.NotificationPort;
import com.vinnot.notification.domain.model.NotificationRecipient;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.user.application.port.out.UserRepositoryPort;
import com.vinnot.user.application.service.AccountActionTokenService;
import com.vinnot.user.domain.model.User;
import com.vinnot.user.domain.model.UserActionToken;
import com.vinnot.user.domain.valueobject.Email;
import com.vinnot.user.domain.valueobject.UserActionTokenType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class ConfirmEmailChangeCommandHandler implements ConfirmEmailChangeUseCase {

    private final UserRepositoryPort userRepository;
    private final RefreshTokenRepositoryPort refreshTokenRepository;
    private final NotificationPort notifications;
    private final AccountActionTokenService tokenService;
    private final SecurityEventRecorder securityEvents;

    @Override
    @Transactional
    public void execute(ConfirmEmailChangeCommand command) {
        UserActionToken token = tokenService.consume(
                command.token(), UserActionTokenType.EMAIL_CHANGE);
        User user = userRepository.findById(token.userId())
                .orElseThrow(() -> new EntityNotFoundException("User", token.userId()));
        if (Objects.isNull(token.targetValue()) || token.targetValue().isBlank()) {
            throw new DomainException(
                    "INVALID_EMAIL_CHANGE_TOKEN", "The email change token has no target email");
        }

        Email newEmail = Email.of(token.targetValue());
        if (userRepository.existsByEmail(newEmail)) {
            throw new DomainException(
                    "EMAIL_ALREADY_EXISTS", "A user with this email already exists");
        }

        final String previousEmail = user.getEmail().getValue();
        user.changeVerifiedEmail(newEmail);
        userRepository.save(user);
        refreshTokenRepository.deleteByUserId(user.getId());
        // Queued with the change: a provider outage can no longer roll the verified change back.
        notifications.enqueue(NotificationRequest.of(NotificationType.ACCOUNT_EMAIL_CHANGED,
                NotificationRecipient.address(previousEmail, user.getFullName()),
                AccountActionTokenService.localeOf(user),
                Map.of("newEmail", newEmail.getValue()),
                NotificationType.ACCOUNT_EMAIL_CHANGED.name() + ":" + token.id()));
        securityEvents.record(SecurityEventType.EMAIL_CHANGED, user.getId());
    }
}
