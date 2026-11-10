package com.vinnot.user.infrastructure.web.controller;

import com.vinnot.user.application.command.model.LoginCommand;
import com.vinnot.user.application.command.model.ForgotPasswordCommand;
import com.vinnot.user.application.command.model.ConfirmEmailChangeCommand;
import com.vinnot.user.application.command.model.LogoutCommand;
import com.vinnot.user.application.command.model.RefreshTokenCommand;
import com.vinnot.user.application.command.model.RegisterUserCommand;
import com.vinnot.user.application.command.model.ResendVerificationCommand;
import com.vinnot.user.application.command.model.ResetPasswordCommand;
import com.vinnot.user.application.command.model.SocialLoginCommand;
import com.vinnot.user.application.command.model.VerifyEmailCommand;
import com.vinnot.user.application.command.response.AuthSessionResponse;
import com.vinnot.user.application.port.in.ForgotPasswordUseCase;
import com.vinnot.user.application.port.in.ConfirmEmailChangeUseCase;
import com.vinnot.user.application.port.in.GetUserByIdUseCase;
import com.vinnot.user.application.port.in.LoginUserUseCase;
import com.vinnot.user.application.port.in.LogoutUserUseCase;
import com.vinnot.user.application.port.in.RefreshTokenUseCase;
import com.vinnot.user.application.port.in.RegisterUserUseCase;
import com.vinnot.user.application.port.in.ResendVerificationUseCase;
import com.vinnot.user.application.port.in.ResetPasswordUseCase;
import com.vinnot.user.application.port.in.SocialLoginUseCase;
import com.vinnot.user.application.port.in.VerifyEmailUseCase;
import com.vinnot.user.application.port.in.ValidatePasswordResetTokenUseCase;
import com.vinnot.user.application.query.model.GetUserByIdQuery;
import com.vinnot.user.application.query.model.ValidatePasswordResetTokenQuery;
import com.vinnot.user.application.query.response.UserResponse;
import com.vinnot.user.domain.valueobject.UserActionTokenStatus;
import com.vinnot.user.infrastructure.web.request.ForgotPasswordRequest;
import com.vinnot.user.infrastructure.web.request.LoginRequest;
import com.vinnot.user.infrastructure.web.request.LogoutRequest;
import com.vinnot.user.infrastructure.web.request.RefreshTokenRequest;
import com.vinnot.user.infrastructure.web.request.RegisterRequest;
import com.vinnot.user.infrastructure.web.request.ResendVerificationRequest;
import com.vinnot.user.infrastructure.web.request.ResetPasswordRequest;
import com.vinnot.user.infrastructure.web.request.SocialLoginRequest;
import com.vinnot.user.infrastructure.web.request.VerifyEmailRequest;
import com.vinnot.user.infrastructure.web.request.ValidateActionTokenRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/auth")
@Tag(name = "Authentication", description = "User registration and authentication")
@RequiredArgsConstructor
public class AuthController {

    private final RegisterUserUseCase registerUserUseCase;
    private final LoginUserUseCase loginUserUseCase;
    private final RefreshTokenUseCase refreshTokenUseCase;
    private final LogoutUserUseCase logoutUserUseCase;
    private final GetUserByIdUseCase getUserByIdUseCase;
    private final ForgotPasswordUseCase forgotPasswordUseCase;
    private final ResetPasswordUseCase resetPasswordUseCase;
    private final VerifyEmailUseCase verifyEmailUseCase;
    private final ResendVerificationUseCase resendVerificationUseCase;
    private final SocialLoginUseCase socialLoginUseCase;
    private final ValidatePasswordResetTokenUseCase validatePasswordResetTokenUseCase;
    private final ConfirmEmailChangeUseCase confirmEmailChangeUseCase;

    @PostMapping("/register")
    @Operation(summary = "Register a new user")
    public ResponseEntity<Map<String, Object>> register(
            @Valid @RequestBody RegisterRequest request) {

        String resolvedFirstName = request.firstName();
        String resolvedLastName = request.lastName();
        if (Objects.isNull(resolvedFirstName) && Objects.nonNull(request.name())) {
            resolvedFirstName = request.name();
            resolvedLastName = Objects.requireNonNullElse(resolvedLastName, "");
        }
        if (Objects.isNull(resolvedFirstName)) {
            resolvedFirstName = "";
        }
        if (Objects.isNull(resolvedLastName)) {
            resolvedLastName = "";
        }

        RegisterUserCommand command = new RegisterUserCommand(
                request.username(),
                request.email(),
                request.password(),
                resolvedFirstName,
                resolvedLastName,
                Objects.isNull(request.termsAcceptance()) ? null : request.termsAcceptance().selection()
        );

        UUID userId = registerUserUseCase.execute(command);

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "message", "User registered. Check your email to activate the account",
                "userId", userId,
                "email", request.email(),
                "emailVerificationRequired", true));
    }

    @PostMapping("/login")
    @Operation(summary = "Login with credentials")
    public ResponseEntity<AuthSessionResponse> login(
            @Valid @RequestBody LoginRequest request) {

        LoginCommand command = new LoginCommand(
                request.usernameOrEmail(),
                request.password(),
                Boolean.TRUE.equals(request.reactivate())
        );

        AuthSessionResponse result = loginUserUseCase.execute(command);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/social")
    @Operation(summary = "Login or register with a social identity provider")
    public ResponseEntity<AuthSessionResponse> socialLogin(
            @Valid @RequestBody SocialLoginRequest request) {
        AuthSessionResponse result = socialLoginUseCase.execute(new SocialLoginCommand(
                request.provider(), request.token(), request.nonce(),
                request.firstName(), request.lastName(),
                Boolean.TRUE.equals(request.reactivate())));
        return ResponseEntity.ok(result);
    }

    @PostMapping("/refresh")
    @Operation(summary = "Refresh access token")
    public ResponseEntity<AuthSessionResponse> refresh(
            @Valid @RequestBody RefreshTokenRequest request) {

        AuthSessionResponse result = refreshTokenUseCase.execute(
                new RefreshTokenCommand(request.refreshToken(), request.rotationId()));
        return ResponseEntity.ok(result);
    }

    @PostMapping("/logout")
    @Operation(summary = "Logout and invalidate tokens")
    public ResponseEntity<Map<String, String>> logout(
            @RequestBody(required = false) LogoutRequest request) {

        String refreshToken = Objects.nonNull(request) ? request.refreshToken() : null;
        logoutUserUseCase.execute(new LogoutCommand(refreshToken, Objects.nonNull(request) ? request.pushToken() : null));
        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }

    @GetMapping("/me")
    @Operation(summary = "Get current authenticated user")
    public ResponseEntity<UserResponse> me(@AuthenticationPrincipal String principal) {
        UUID userId = UUID.fromString(principal);
        UserResponse response = getUserByIdUseCase.execute(
                new GetUserByIdQuery(userId));
        return ResponseEntity.ok(response);
    }

    @PostMapping("/forgot-password")
    @Operation(summary = "Request password reset email")
    public ResponseEntity<Map<String, String>> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request) {
        forgotPasswordUseCase.execute(new ForgotPasswordCommand(request.email()));
        return ResponseEntity.ok(confirmation(
                "PASSWORD_RESET_LINK_SENT",
                "If an account exists with that email, a reset link has been sent"));
    }

    @PostMapping("/reset-password")
    @Operation(summary = "Reset password with token")
    public ResponseEntity<Map<String, String>> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request) {
        resetPasswordUseCase.execute(new ResetPasswordCommand(
                request.token(), request.newPassword()));
        return ResponseEntity.ok(confirmation(
                "PASSWORD_RESET", "Password has been reset successfully"));
    }

    @PostMapping("/reset-password/validate")
    @Operation(summary = "Validate password reset token without consuming it")
    public ResponseEntity<Map<String, Object>> validatePasswordResetToken(
            @Valid @RequestBody ValidateActionTokenRequest request) {
        var status = validatePasswordResetTokenUseCase.execute(
                new ValidatePasswordResetTokenQuery(request.token()));
        return ResponseEntity.ok(Map.of(
                "valid", status == UserActionTokenStatus.VALID,
                "status", status.name()));
    }

    @PostMapping("/verify-email")
    @Operation(summary = "Verify email with token")
    public ResponseEntity<Map<String, String>> verifyEmail(
            @Valid @RequestBody VerifyEmailRequest request) {
        verifyEmailUseCase.execute(new VerifyEmailCommand(request.token()));
        return ResponseEntity.ok(confirmation("EMAIL_VERIFIED", "Email verified successfully"));
    }

    @PostMapping("/resend-verification")
    @Operation(summary = "Resend verification email")
    public ResponseEntity<Map<String, String>> resendVerification(
            @Valid @RequestBody ResendVerificationRequest request) {
        resendVerificationUseCase.execute(new ResendVerificationCommand(request.email()));
        return ResponseEntity.ok(confirmation(
                "VERIFICATION_EMAIL_SENT",
                "If verification is pending, a new email has been sent"));
    }

    @PostMapping("/email-change/confirm")
    @Operation(summary = "Confirm a pending email change")
    public ResponseEntity<Map<String, String>> confirmEmailChange(
            @Valid @RequestBody VerifyEmailRequest request) {
        confirmEmailChangeUseCase.execute(new ConfirmEmailChangeCommand(request.token()));
        return ResponseEntity.ok(Map.of("message", "Email changed successfully"));
    }

    /**
     * An auth confirmation: the apps translate the stable {@code code}; {@code message} is only the English fallback.
     */
    private static Map<String, String> confirmation(String code, String fallbackMessage) {
        return Map.of("code", code, "message", fallbackMessage);
    }
}
