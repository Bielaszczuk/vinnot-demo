package com.vinnot.user.application.command.handler;

import com.vinnot.user.domain.valueobject.SecurityEventType;
import com.vinnot.user.application.service.SecurityEventRecorder;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import com.vinnot.user.application.command.model.DeleteOwnAccountCommand;
import com.vinnot.user.application.port.out.AppleAuthorizationRevocationPort;
import com.vinnot.user.application.port.out.SocialIdentityRepositoryPort;
import com.vinnot.user.application.port.out.UpcomingPaidEventsPort;
import com.vinnot.user.application.port.out.UserRepositoryPort;
import com.vinnot.user.domain.model.SocialIdentity;
import com.vinnot.user.domain.model.User;
import com.vinnot.user.domain.valueobject.Email;
import com.vinnot.user.domain.valueobject.Password;
import com.vinnot.user.domain.valueobject.Role;
import com.vinnot.user.domain.valueobject.SocialProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import com.vinnot.user.application.service.AccountSecurityNoticeService;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
class DeleteOwnAccountCommandHandlerTest {

    private static final String AUTHORIZATION_CODE = "single-use-code";
    private static final String CLIENT_ID = "com.vinnot.app";
    private static final String REDIRECT_URI = "https://dev.vinnot.com/login";
    private static final String APPLE_SUBJECT = "apple-user-subject";

    @Mock
    private UserRepositoryPort userRepository;
    @Mock
    private SocialIdentityRepositoryPort socialIdentityRepository;
    @Mock
    private AppleAuthorizationRevocationPort appleRevocationPort;
    @Mock
    private AccountSecurityNoticeService securityNotices;
    @Mock
    private SecurityEventRecorder securityEvents;
    @Mock
    private UpcomingPaidEventsPort paidEvents;

    private User user;
    private DeleteOwnAccountCommandHandler handler;

    @BeforeEach
    void setUp() {
        user = User.create(
                "delete-owner",
                Email.of("delete@vinnot.com"),
                Password.fromHash("hash"),
                "Delete",
                "Owner");
        handler = new DeleteOwnAccountCommandHandler(
                userRepository,
                socialIdentityRepository,
                appleRevocationPort,
                securityNotices,
                securityEvents,
                paidEvents);
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
    }

    @Test
    void deletesAccountWithoutProviderReauthenticationWhenAppleIsNotLinked() {
        when(socialIdentityRepository.findByUserId(user.getId())).thenReturn(List.of());

        handler.execute(command(null, null, null));

        var order = inOrder(securityNotices, userRepository);
        order.verify(securityNotices).deleted(user);
        order.verify(userRepository).delete(user);
        verify(securityEvents).record(SecurityEventType.ACCOUNT_DELETED, user.getId());
        verify(appleRevocationPort, never()).revoke(
                AUTHORIZATION_CODE, CLIENT_ID, REDIRECT_URI, APPLE_SUBJECT);
    }

    @Test
    void requiresFreshAppleAuthorizationBeforeDeletingLinkedAccount() {
        when(socialIdentityRepository.findByUserId(user.getId()))
                .thenReturn(List.of(appleIdentity()));

        assertThatThrownBy(() -> handler.execute(command(null, null, null)))
                .isInstanceOf(BusinessRuleViolationException.class)
                .extracting("code")
                .isEqualTo("APPLE_REAUTH_REQUIRED");

        verify(userRepository, never()).delete(user);
        verifyNoInteractions(securityNotices);
    }

    @Test
    void revokesAppleAndSchedulesManagedAvatarCleanupAfterDeletion() {
        user.updateProfileImage(
                "/api/uploads/avatars/avatar_" + user.getId() + "_managed.jpg");
        when(socialIdentityRepository.findByUserId(user.getId()))
                .thenReturn(List.of(appleIdentity()));

        handler.execute(command(AUTHORIZATION_CODE, CLIENT_ID, REDIRECT_URI));

        verify(appleRevocationPort).revoke(
                AUTHORIZATION_CODE, CLIENT_ID, REDIRECT_URI, APPLE_SUBJECT);
        verify(userRepository).delete(user);
    }

    @Test
    void lastActiveAdministratorCannotDeleteTheirOwnAccount() {
        user.addRole(Role.ADMIN);
        when(userRepository.lockActiveAdministratorIds()).thenReturn(List.of(user.getId()));

        assertThatThrownBy(() -> handler.execute(command(AUTHORIZATION_CODE, CLIENT_ID, REDIRECT_URI)))
                .isInstanceOf(BusinessRuleViolationException.class)
                .extracting("code")
                .isEqualTo("LAST_ADMIN");

        verify(userRepository, never()).delete(any());
        verify(appleRevocationPort, never()).revoke(anyString(), anyString(), any(), anyString());
    }

    @Test
    void administratorCanDeleteTheirOwnAccountWhileAnotherAdministratorRemains() {
        user.addRole(Role.ADMIN);
        when(userRepository.lockActiveAdministratorIds())
                .thenReturn(List.of(user.getId(), UUID.randomUUID()));
        when(socialIdentityRepository.findByUserId(user.getId())).thenReturn(List.of());

        handler.execute(command(null, null, null));

        verify(userRepository).delete(user);
    }

    @Test
    void organizerWithUpcomingPaidEventsMustCancelThemBeforeDeletingTheAccount() {
        when(paidEvents.organizesUpcomingPaidEvents(user.getId())).thenReturn(true);

        assertThatThrownBy(() -> handler.execute(command(AUTHORIZATION_CODE, CLIENT_ID, REDIRECT_URI)))
                .isInstanceOf(BusinessRuleViolationException.class)
                .extracting("code")
                .isEqualTo("ORGANIZER_HAS_UPCOMING_PAID_EVENTS");

        verify(userRepository, never()).delete(any());
        verify(appleRevocationPort, never()).revoke(anyString(), anyString(), any(), anyString());
        verifyNoInteractions(securityNotices, securityEvents);
    }

    private DeleteOwnAccountCommand command(
            String authorizationCode, String clientId, String redirectUri) {
        return new DeleteOwnAccountCommand(
                user.getId(), authorizationCode, clientId, redirectUri);
    }

    private SocialIdentity appleIdentity() {
        return SocialIdentity.create(
                user.getId(), SocialProvider.APPLE, APPLE_SUBJECT, user.getEmail().getValue());
    }
}
