package com.vinnot.user.application.command.model;

public record ResetPasswordCommand(String token, String newPassword) {
}
