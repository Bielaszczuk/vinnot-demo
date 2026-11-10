package com.vinnot.shared.infrastructure.web;

import org.junit.jupiter.api.AfterEach;
import com.vinnot.shared.infrastructure.metrics.OperationalTelemetry;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.springframework.beans.factory.support.DefaultListableBeanFactory;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import jakarta.servlet.ServletException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class HttpRequestLoggingFilterTest {

    private final HttpRequestLoggingFilter filter = new HttpRequestLoggingFilter(1000, new DefaultListableBeanFactory().getBeanProvider(OperationalTelemetry.class));

    @AfterEach
    void clearMdc() {
        MDC.clear();
    }

    @Test
    void shouldPreserveSafeRequestIdAndReturnItToTheClient() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/wines");
        request.addHeader(HttpRequestLoggingFilter.REQUEST_ID_HEADER, "client-request-123");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertThat(response.getHeader(HttpRequestLoggingFilter.REQUEST_ID_HEADER))
                .isEqualTo("client-request-123");
        assertThat(MDC.get(HttpRequestLoggingFilter.REQUEST_ID_MDC_KEY)).isNull();
    }

    @Test
    void shouldReplaceUnsafeRequestId() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/wines");
        request.addHeader(HttpRequestLoggingFilter.REQUEST_ID_HEADER, "invalid request id\nvalue");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertThat(response.getHeader(HttpRequestLoggingFilter.REQUEST_ID_HEADER))
                .isNotBlank()
                .doesNotContain("invalid request id");
    }

    @Test
    void shouldNotAddRequestIdToHealthChecks() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/actuator/health");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertThat(response.getHeader(HttpRequestLoggingFilter.REQUEST_ID_HEADER)).isNull();
    }

    @Test
    void recordsCompletedAndUncaughtFailureWithoutCountingHealthOrExportingRequestData() throws Exception {
        var registry = new SimpleMeterRegistry();
        var factory = new DefaultListableBeanFactory();
        factory.registerSingleton("telemetry", new OperationalTelemetry(registry));
        var observed = new HttpRequestLoggingFilter(1000, factory.getBeanProvider(OperationalTelemetry.class));
        observed.doFilter(new MockHttpServletRequest("GET", "/api/wines"), new MockHttpServletResponse(), new MockFilterChain());
        observed.doFilter(new MockHttpServletRequest("GET", "/api/actuator/health"), new MockHttpServletResponse(), new MockFilterChain());
        assertThatThrownBy(() -> observed.doFilter(new MockHttpServletRequest("GET", "/api/wines"),
                new MockHttpServletResponse(), (request, response) -> { throw new ServletException("fixture"); }))
                .isInstanceOf(ServletException.class);
        assertThat(registry.get("vinnot.http.requests").counter().count()).isEqualTo(2);
        assertThat(registry.get("vinnot.http.errors").counter().count()).isEqualTo(1);
        assertThat(registry.get("vinnot.http.requests").counter().getId().getTags()).isEmpty();
        assertThat(MDC.get(HttpRequestLoggingFilter.REQUEST_ID_MDC_KEY)).isNull();
    }
}
