package com.vinnot.user.application.command.handler;

import com.vinnot.user.application.service.SecurityEventRecorder;
import com.vinnot.user.domain.valueobject.SecurityEventType;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.user.application.command.model.DeleteOwnAccountCommand;
import com.vinnot.user.application.port.in.DeleteOwnAccountUseCase;
import com.vinnot.user.application.port.out.AppleAuthorizationRevocationPort;
import com.vinnot.user.application.port.out.SocialIdentityRepositoryPort;
import com.vinnot.user.application.port.out.UpcomingPaidEventsPort;
import com.vinnot.user.application.port.out.UserRepositoryPort;
import com.vinnot.user.application.service.AdminUserSafety;
import com.vinnot.user.domain.model.SocialIdentity;
import com.vinnot.user.domain.model.User;
import com.vinnot.user.domain.valueobject.SocialProvider;
import lombok.RequiredArgsConstructor;
import com.vinnot.user.application.service.AccountSecurityNoticeService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class DeleteOwnAccountCommandHandler implements DeleteOwnAccountUseCase {

    private final UserRepositoryPort userRepository;
    private final SocialIdentityRepositoryPort socialIdentityRepository;
    private final AppleAuthorizationRevocationPort appleRevocationPort;
    private final AccountSecurityNoticeService securityNotices;
    private final SecurityEventRecorder securityEvents;
    private final UpcomingPaidEventsPort paidEvents;

    @Override
    @Transactional
    public void execute(DeleteOwnAccountCommand command) {
        User user = userRepository.findById(command.userId())
                .orElseThrow(() -> new EntityNotFoundException("User", command.userId()));
        AdminUserSafety.requireAnotherActiveAdministrator(userRepository, user);
        // Deleting the organizer would cascade their events away and delete the Mercado Pago credentials that refunds
        // need. Cancelling the events first refunds every credited ticket.
        if (paidEvents.organizesUpcomingPaidEvents(user.getId())) {
            throw new BusinessRuleViolationException(
                    "ORGANIZER_HAS_UPCOMING_PAID_EVENTS",
                    "Cancel your upcoming events with paid tickets before deleting this account");
        }
        Optional<SocialIdentity> appleIdentity =
                socialIdentityRepository.findByUserId(user.getId()).stream()
                        .filter(identity -> identity.provider() == SocialProvider.APPLE)
                        .findFirst();
        appleIdentity.ifPresent(identity -> revokeApple(command, identity));

        // Queued in this transaction, before the address disappears; a failed deletion sends nothing.
        securityNotices.deleted(user);
        userRepository.delete(user);
        // Stored after the commit, when the account is gone: the row keeps no link to it (V73, ON DELETE SET NULL).
        securityEvents.record(SecurityEventType.ACCOUNT_DELETED, user.getId());
    }

    private void revokeApple(DeleteOwnAccountCommand command, SocialIdentity identity) {
        if (isBlank(command.appleAuthorizationCode()) || isBlank(command.appleClientId())) {
            throw new BusinessRuleViolationException(
                    "APPLE_REAUTH_REQUIRED",
                    "Sign in with Apple must be confirmed before deleting this account");
        }
        appleRevocationPort.revoke(
                command.appleAuthorizationCode(),
                command.appleClientId(),
                command.appleRedirectUri(),
                identity.providerSubject());
    }

    private boolean isBlank(String value) {
        return Objects.isNull(value) || value.isBlank();
    }
}
