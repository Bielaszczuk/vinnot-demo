package com.vinnot.wine.infrastructure.web;

import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.shared.domain.valueobject.ResourceReader;
import com.vinnot.wine.application.port.in.CheckWineReadAccessUseCase;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.servlet.HandlerMapping;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class WineResourceAccessInterceptorTest {
    @Test
    void authorizesNestedWineResourcesBeforeReadingTheirPayload() {
        var access = mock(CheckWineReadAccessUseCase.class);
        var interceptor = new WineResourceAccessInterceptor(access);
        var request = new MockHttpServletRequest();
        var response = new MockHttpServletResponse();
        assertThat(interceptor.preHandle(request, response, new Object())).isTrue();
        request.setAttribute(HandlerMapping.URI_TEMPLATE_VARIABLES_ATTRIBUTE, Map.of("other", "value"));
        assertThat(interceptor.preHandle(request, response, new Object())).isTrue();
        UUID wineId = UUID.randomUUID();
        request.setAttribute(HandlerMapping.URI_TEMPLATE_VARIABLES_ATTRIBUTE, Map.of("wineId", wineId.toString()));
        assertThat(interceptor.preHandle(request, response, new Object())).isTrue();
        verify(access).check(wineId, ResourceReader.anonymous());
        request.setAttribute(HandlerMapping.URI_TEMPLATE_VARIABLES_ATTRIBUTE, Map.of("id", wineId.toString()));
        doThrow(new EntityNotFoundException("Wine", wineId)).when(access).check(wineId, ResourceReader.anonymous());
        assertThatThrownBy(() -> interceptor.preHandle(request, response, new Object())).isInstanceOf(EntityNotFoundException.class);
    }
}
