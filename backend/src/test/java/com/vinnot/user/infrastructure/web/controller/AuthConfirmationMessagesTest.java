package com.vinnot.user.infrastructure.web.controller;

import com.vinnot.shared.infrastructure.web.GlobalExceptionHandler;
import com.vinnot.user.application.command.model.ForgotPasswordCommand;
import com.vinnot.user.application.command.model.ResendVerificationCommand;
import com.vinnot.user.application.command.model.ResetPasswordCommand;
import com.vinnot.user.application.command.model.VerifyEmailCommand;
import com.vinnot.user.application.port.in.ConfirmEmailChangeUseCase;
import com.vinnot.user.application.port.in.ForgotPasswordUseCase;
import com.vinnot.user.application.port.in.GetUserByIdUseCase;
import com.vinnot.user.application.port.in.LoginUserUseCase;
import com.vinnot.user.application.port.in.LogoutUserUseCase;
import com.vinnot.user.application.port.in.RefreshTokenUseCase;
import com.vinnot.user.application.port.in.RegisterUserUseCase;
import com.vinnot.user.application.port.in.ResendVerificationUseCase;
import com.vinnot.user.application.port.in.ResetPasswordUseCase;
import com.vinnot.user.application.port.in.SocialLoginUseCase;
import com.vinnot.user.application.port.in.ValidatePasswordResetTokenUseCase;
import com.vinnot.user.application.port.in.VerifyEmailUseCase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Auth confirmations carry a stable {@code code} the apps translate; {@code message} stays as the English fallback.
 */
class AuthConfirmationMessagesTest {

    private final ForgotPasswordUseCase forgotPassword = mock(ForgotPasswordUseCase.class);
    private final ResetPasswordUseCase resetPassword = mock(ResetPasswordUseCase.class);
    private final VerifyEmailUseCase verifyEmail = mock(VerifyEmailUseCase.class);
    private final ResendVerificationUseCase resendVerification = mock(ResendVerificationUseCase.class);
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.standaloneSetup(new AuthController(
                        mock(RegisterUserUseCase.class), mock(LoginUserUseCase.class),
                        mock(RefreshTokenUseCase.class), mock(LogoutUserUseCase.class),
                        mock(GetUserByIdUseCase.class), forgotPassword, resetPassword,
                        verifyEmail, resendVerification, mock(SocialLoginUseCase.class),
                        mock(ValidatePasswordResetTokenUseCase.class),
                        mock(ConfirmEmailChangeUseCase.class)))
                .setControllerAdvice(new GlobalExceptionHandler()).build();
    }

    @Test
    void verifyEmailReturnsAStableCodeAndTheEnglishFallback() throws Exception {
        mvc.perform(post("/auth/verify-email").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"verification-token\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("EMAIL_VERIFIED"))
                .andExpect(jsonPath("$.message").value("Email verified successfully"));
        verify(verifyEmail).execute(new VerifyEmailCommand("verification-token"));
    }

    @Test
    void resetPasswordReturnsAStableCodeAndTheEnglishFallback() throws Exception {
        mvc.perform(post("/auth/reset-password").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"reset-token\",\"newPassword\":\"N3w-Passw0rd!\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("PASSWORD_RESET"))
                .andExpect(jsonPath("$.message").value("Password has been reset successfully"));
        verify(resetPassword).execute(new ResetPasswordCommand("reset-token", "N3w-Passw0rd!"));
    }

    @Test
    void forgotPasswordReturnsAStableCodeAndTheEnglishFallback() throws Exception {
        mvc.perform(post("/auth/forgot-password").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"ana@vinnot.com\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("PASSWORD_RESET_LINK_SENT"))
                .andExpect(jsonPath("$.message")
                        .value("If an account exists with that email, a reset link has been sent"));
        verify(forgotPassword).execute(new ForgotPasswordCommand("ana@vinnot.com"));
    }

    @Test
    void resendVerificationReturnsAStableCodeAndTheEnglishFallback() throws Exception {
        mvc.perform(post("/auth/resend-verification").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"ana@vinnot.com\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("VERIFICATION_EMAIL_SENT"))
                .andExpect(jsonPath("$.message")
                        .value("If verification is pending, a new email has been sent"));
        verify(resendVerification).execute(new ResendVerificationCommand("ana@vinnot.com"));
    }
}
