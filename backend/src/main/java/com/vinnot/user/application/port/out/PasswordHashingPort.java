package com.vinnot.user.application.port.out;

public interface PasswordHashingPort {

    String hash(String plainPassword);

    boolean matches(String plainPassword, String passwordHash);
}
