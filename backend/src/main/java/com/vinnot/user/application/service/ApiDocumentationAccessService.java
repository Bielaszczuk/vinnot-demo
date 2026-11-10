package com.vinnot.user.application.service;

import com.vinnot.shared.application.port.ApiDocumentationAccessPort;
import com.vinnot.shared.domain.exception.DomainException;
import com.vinnot.user.application.port.out.PasswordHashingPort;
import com.vinnot.user.application.port.out.UserRepositoryPort;
import com.vinnot.user.domain.model.User;
import com.vinnot.user.domain.valueobject.Email;
import com.vinnot.user.domain.valueobject.Role;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Objects;
import java.util.Optional;

/**
 * Lets only active, verified, unlocked administrators open Swagger with their
 * Vinnot email and password (#431).
 */
@Service
@RequiredArgsConstructor
public class ApiDocumentationAccessService implements ApiDocumentationAccessPort {

    private static final String DECOY_PASSWORD = "api-documentation-decoy";

    private final UserRepositoryPort users;
    private final PasswordHashingPort passwords;
    private volatile String decoyHash;

    @Override
    public boolean allows(String email, String password) {
        if (Objects.isNull(email) || Objects.isNull(password) || password.isEmpty()) {
            return false;
        }
        Optional<User> administrator = findByEmail(email)
                .filter(User::isActive)
                .filter(user -> !user.isLocked())
                .filter(User::isEmailVerified)
                .filter(user -> user.hasRole(Role.ADMIN))
                .filter(user -> Objects.nonNull(user.getPassword()));
        if (administrator.isEmpty()) {
            // Spend the same hashing time, so response times do not reveal which emails are administrators.
            passwords.matches(password, decoyHash());
            return false;
        }
        return passwords.matches(password, administrator.get().getPassword().getHashedValue());
    }

    private String decoyHash() {
        String hash = decoyHash;
        if (Objects.isNull(hash)) {
            hash = passwords.hash(DECOY_PASSWORD);
            decoyHash = hash;
        }
        return hash;
    }

    private Optional<User> findByEmail(String email) {
        try {
            return users.findByEmail(Email.of(email.trim()));
        } catch (DomainException invalidEmail) {
            return Optional.empty();
        }
    }
}
