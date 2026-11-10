package com.vinnot.shared.infrastructure.web;

import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.assertj.core.api.Assertions.assertThat;

class GlobalExceptionHandlerLockoutTest {
    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();
    private final MockHttpServletRequest request = new MockHttpServletRequest("POST", "/auth/login");

    @Test
    void aTemporarySignInLockIs423() {
        var response = handler.handleBusinessRuleViolation(
                new BusinessRuleViolationException("ACCOUNT_TEMPORARILY_LOCKED", "Too many failed sign-in attempts"), request);

        assertThat(response.getStatusCode().value()).isEqualTo(423);
        assertThat(response.getBody().code()).isEqualTo("ACCOUNT_TEMPORARILY_LOCKED");
    }

    @Test
    void theOtherCredentialCodesKeepTheirStatus() {
        assertThat(handler.handleBusinessRuleViolation(new BusinessRuleViolationException("AUTH_FAILED", "x"), request)
                .getStatusCode().value()).isEqualTo(401);
        assertThat(handler.handleBusinessRuleViolation(new BusinessRuleViolationException("ACCOUNT_LOCKED", "x"), request)
                .getStatusCode().value()).isEqualTo(422);
        assertThat(handler.handleBusinessRuleViolation(new BusinessRuleViolationException("REAUTHENTICATION_REQUIRED", "x"), request)
                .getStatusCode().value()).isEqualTo(403);
    }
}
