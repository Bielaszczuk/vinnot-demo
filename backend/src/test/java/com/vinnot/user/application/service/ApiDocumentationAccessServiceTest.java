package com.vinnot.user.application.service;

import com.vinnot.user.application.port.out.PasswordHashingPort;
import com.vinnot.user.application.port.out.UserRepositoryPort;
import com.vinnot.user.domain.model.User;
import com.vinnot.user.domain.valueobject.Email;
import com.vinnot.user.domain.valueobject.Password;
import com.vinnot.user.domain.valueobject.Role;
import org.junit.jupiter.api.Test;

import java.util.Optional;
import java.util.function.Consumer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ApiDocumentationAccessServiceTest {

    private static final String EMAIL = "admin@example.com";
    private static final String PASSWORD = "correct-horse";

    private final UserRepositoryPort users = mock(UserRepositoryPort.class);
    private final PasswordHashingPort passwords = mock(PasswordHashingPort.class);
    private final ApiDocumentationAccessService service = new ApiDocumentationAccessService(users, passwords);

    @Test
    void allowsAnActiveVerifiedAdministratorWithTheRightPassword() {
        account(user -> user.addRole(Role.ADMIN));

        assertThat(service.allows(EMAIL, PASSWORD)).isTrue();
        assertThat(service.allows("  " + EMAIL + " ", PASSWORD)).isTrue();
        assertThat(service.allows(EMAIL, "wrong")).isFalse();
    }

    @Test
    void deniesAccountsThatAreNotActiveVerifiedUnlockedAdministrators() {
        account(user -> { });
        assertThat(service.allows(EMAIL, PASSWORD)).as("not an administrator").isFalse();

        account(user -> user.addRole(Role.MODERATOR));
        assertThat(service.allows(EMAIL, PASSWORD)).as("moderator").isFalse();

        account(user -> { user.addRole(Role.ADMIN); user.lock("SPAM"); });
        assertThat(service.allows(EMAIL, PASSWORD)).as("locked").isFalse();

        account(user -> { user.addRole(Role.ADMIN); user.deactivate(); });
        assertThat(service.allows(EMAIL, PASSWORD)).as("inactive").isFalse();

        User unverified = User.create("admin", Email.of(EMAIL), Password.fromHash("hash"), "Ada", "Admin");
        unverified.addRole(Role.ADMIN);
        when(users.findByEmail(Email.of(EMAIL))).thenReturn(Optional.of(unverified));
        assertThat(service.allows(EMAIL, PASSWORD)).as("email not verified").isFalse();
    }

    @Test
    void spendsTheSameHashingTimeForAccountsThatAreNotAdministrators() {
        when(users.findByEmail(any())).thenReturn(Optional.empty());
        when(passwords.hash(any())).thenReturn("decoy-hash");

        assertThat(service.allows(EMAIL, PASSWORD)).isFalse();
        assertThat(service.allows("other@example.com", PASSWORD)).isFalse();

        org.mockito.Mockito.verify(passwords, org.mockito.Mockito.times(2)).matches(PASSWORD, "decoy-hash");
        org.mockito.Mockito.verify(passwords, org.mockito.Mockito.times(1)).hash(any());
    }

    @Test
    void deniesMissingAccountsAndMalformedInput() {
        when(users.findByEmail(any())).thenReturn(Optional.empty());

        assertThat(service.allows(EMAIL, PASSWORD)).isFalse();
        assertThat(service.allows("not-an-email", PASSWORD)).isFalse();
        assertThat(service.allows(null, PASSWORD)).isFalse();
        assertThat(service.allows(EMAIL, null)).isFalse();
        assertThat(service.allows(EMAIL, "")).isFalse();
    }

    private void account(Consumer<User> setup) {
        User user = User.create("admin", Email.of(EMAIL), Password.fromHash("hash"), "Ada", "Admin");
        user.verifyEmail();
        setup.accept(user);
        when(users.findByEmail(Email.of(EMAIL))).thenReturn(Optional.of(user));
        when(passwords.matches(PASSWORD, "hash")).thenReturn(true);
    }
}
