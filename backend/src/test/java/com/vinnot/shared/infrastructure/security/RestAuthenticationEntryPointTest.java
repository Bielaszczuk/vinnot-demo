package com.vinnot.shared.infrastructure.security;

import tools.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;

import static org.assertj.core.api.Assertions.assertThat;

class RestAuthenticationEntryPointTest {

    @Test
    void returnsUnauthorizedSoMobileCanRefreshAnExpiredAccessToken() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest(
                "POST", "/api/wines/submissions");
        MockHttpServletResponse response = new MockHttpServletResponse();
        RestAuthenticationEntryPoint entryPoint =
                new RestAuthenticationEntryPoint(
                        new ObjectMapper());

        entryPoint.commence(
                request,
                response,
                new AuthenticationCredentialsNotFoundException("missing"));

        assertThat(response.getStatus()).isEqualTo(401);
        assertThat(response.getContentType()).startsWith("application/json");
        assertThat(response.getContentAsString())
                .contains("\"code\":\"AUTHENTICATION_REQUIRED\"");
    }
}
