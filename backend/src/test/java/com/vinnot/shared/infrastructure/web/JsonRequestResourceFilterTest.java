package com.vinnot.shared.infrastructure.web;

import tools.jackson.databind.ObjectMapper;
import jakarta.servlet.ReadListener;
import jakarta.servlet.ServletInputStream;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.Semaphore;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

class JsonRequestResourceFilterTest {
    private final JsonRequestResourceFilter filter = new JsonRequestResourceFilter(new ObjectMapper());

    @Test
    void normalJsonIsPassedIntactAndReaderTracksConsumption() throws Exception {
        var request = request("/auth/login", "application/json; charset=UTF-8", "{\"name\":\"Viñedo\"}".getBytes(StandardCharsets.UTF_8));
        var response = new MockHttpServletResponse();
        filter.doFilter(request, response, (wrapped, ignored) -> {
            var http = (HttpServletRequest) wrapped;
            assertThat(http.getInputStream().isReady()).isTrue();
            assertThat(http.getInputStream().isFinished()).isFalse();
            assertThat(http.getReader().readLine()).isEqualTo("{\"name\":\"Viñedo\"}");
            assertThat(http.getInputStream().isFinished()).isTrue();
            assertThat(http.getInputStream().read()).isEqualTo(-1);
            assertThatThrownBy(() -> http.getInputStream().setReadListener(mock(ReadListener.class)))
                    .isInstanceOf(IllegalStateException.class);
        });
        assertThat(response.getStatus()).isEqualTo(200);
    }

    @Test
    void rejectsDeclaredAndActualOversizeIncludingUnknownChunkedLength() throws Exception {
        var declared = request("/auth/login", "application/json", new byte[1024 * 1024 + 1]);
        var declaredResponse = new MockHttpServletResponse();
        filter.doFilter(declared, declaredResponse, (r, s) -> { throw new AssertionError("must reject"); });
        assertThat(declaredResponse.getStatus()).isEqualTo(413);
        var chunked = new MockHttpServletRequest("POST", "/api/auth/login") {
            @Override public long getContentLengthLong() { return -1; }
        };
        chunked.setContextPath("/api");
        chunked.setContentType("application/problem+json");
        chunked.setContent(new byte[1024 * 1024 + 1]);
        var actualResponse = new MockHttpServletResponse();
        filter.doFilter(chunked, actualResponse, (r, s) -> { throw new AssertionError("must reject"); });
        assertThat(actualResponse.getStatus()).isEqualTo(413);
        assertThat(actualResponse.getContentAsString()).contains("REQUEST_BODY_TOO_LARGE");
    }

    @Test
    void leavesMultipartAndOtherContentTypesToTheirOwnReaders() throws Exception {
        for (String type : new String[]{null, "multipart/form-data;boundary=test", "text/plain"}) {
            var request = request("/wines/scan", type, new byte[0]);
            filter.doFilter(request, new MockHttpServletResponse(), (r, s) -> assertThat(r).isSameAs(request));
        }
    }

    @Test
    void catalogBase64HasItsOwnBoundAndCapacityIsRecoveredAfterDownstreamFailure() throws Exception {
        var slots = (Semaphore) ReflectionTestUtils.getField(filter, "catalogSlots");
        assertThat(slots).isNotNull();
        var request = request("/admin/catalog-images", "application/json", new byte[7_000_100]);
        assertThatThrownBy(() -> filter.doFilter(request, new MockHttpServletResponse(), (r, s) -> {
            assertThat(slots.availablePermits()).isEqualTo(1);
            throw new IOException("downstream failure");
        })).isInstanceOf(IOException.class);
        assertThat(slots.availablePermits()).isEqualTo(2);
        assertThat(slots.tryAcquire(2)).isTrue();
        try {
            var rejected = new MockHttpServletResponse();
            filter.doFilter(request("/admin/catalog-images", "application/json", new byte[0]), rejected,
                    (r, s) -> { throw new AssertionError("must reject"); });
            assertThat(rejected.getStatus()).isEqualTo(503);
            assertThat(rejected.getContentAsString()).contains("IMAGE_PROCESSING_BUSY");
        } finally {
            slots.release(2);
        }
        filter.doFilter(request("/admin/catalog-images", "application/json", new byte[0]),
                new MockHttpServletResponse(), (r, s) -> assertThat(((HttpServletRequest) r).getInputStream().isFinished()).isTrue());
        assertThat(slots.availablePermits()).isEqualTo(2);
    }

    private MockHttpServletRequest request(String path, String contentType, byte[] bytes) {
        var request = new MockHttpServletRequest("POST", "/api" + path);
        request.setContextPath("/api");
        request.setContentType(contentType);
        request.setContent(bytes);
        return request;
    }
}
