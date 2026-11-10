package com.vinnot.user.application.command.model;

public record LoginCommand(
        String usernameOrEmail,
        String password,
        boolean reactivate
) {
}
