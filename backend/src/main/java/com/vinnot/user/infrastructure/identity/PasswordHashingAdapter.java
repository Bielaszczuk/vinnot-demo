package com.vinnot.user.infrastructure.identity;

import com.vinnot.user.application.port.out.PasswordHashingPort;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class PasswordHashingAdapter implements PasswordHashingPort {

    private final PasswordEncoder passwordEncoder;

    @Override
    public String hash(String plainPassword) {
        return passwordEncoder.encode(plainPassword);
    }

    @Override
    public boolean matches(String plainPassword, String passwordHash) {
        return passwordEncoder.matches(plainPassword, passwordHash);
    }
}
