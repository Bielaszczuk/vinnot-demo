package com.vinnot.shared.infrastructure.web;

import com.vinnot.shared.application.exception.ExternalServiceUnavailableException;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.slf4j.MDC;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(OutputCaptureExtension.class)
class GlobalExceptionHandlerLoggingTest {

    @Test
    void keepsCorrelationAndFailureTypesWithoutLeakingProviderMessages(CapturedOutput output) {
        var handler = new GlobalExceptionHandler();
        var request = new MockHttpServletRequest("POST", "/api/users/me/avatar");
        var cause = new IllegalStateException("https://provider?api_key=PRIVATE_SECRET");
        MDC.put(HttpRequestLoggingFilter.REQUEST_ID_MDC_KEY, "test-request-145");
        try {
            assertThat(handler.handleGenericException(cause, request).getStatusCode().value())
                    .isEqualTo(500);
            assertThat(handler.handleExternalServiceUnavailable(
                    new ExternalServiceUnavailableException("EMAIL_DELIVERY_FAILED", "Unavailable", cause),
                    request).getStatusCode().value()).isEqualTo(503);
            handler.handleBusinessRuleViolation(
                    new BusinessRuleViolationException("INVALID_VALUE", "PRIVATE_SECRET"), request);
        } finally {
            MDC.remove(HttpRequestLoggingFilter.REQUEST_ID_MDC_KEY);
        }
        assertThat(output.getAll()).contains("test-request-145", "IllegalStateException", "EMAIL_DELIVERY_FAILED")
                .doesNotContain("PRIVATE_SECRET", "api_key=");
    }
}
