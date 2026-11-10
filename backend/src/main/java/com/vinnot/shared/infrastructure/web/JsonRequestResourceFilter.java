package com.vinnot.shared.infrastructure.web;

import tools.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ReadListener;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletInputStream;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Locale;
import java.util.Objects;
import java.util.concurrent.Semaphore;

/** HTTP-only resource guard after the security chain and before JSON deserialization. */
@Component
@Order(Ordered.LOWEST_PRECEDENCE - 10)
public class JsonRequestResourceFilter extends OncePerRequestFilter {
    private static final int JSON_BYTES = 1024 * 1024;
    private static final int CATALOG_IMAGE_BYTES = 8 * 1024 * 1024;
    private static final int CATALOG_IMAGE_CONCURRENCY = 2;
    private final Semaphore catalogSlots = new Semaphore(CATALOG_IMAGE_CONCURRENCY);
    private final ObjectMapper mapper;

    public JsonRequestResourceFilter(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String type = Objects.requireNonNullElse(request.getContentType(), "")
                .split(";", 2)[0].trim().toLowerCase(Locale.ROOT);
        return !(type.endsWith("/json") || type.endsWith("+json"));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
            FilterChain chain) throws ServletException, IOException {
        String path = request.getRequestURI().substring(request.getContextPath().length());
        boolean catalogImage = "/admin/catalog-images".equals(path);
        int maximum = catalogImage ? CATALOG_IMAGE_BYTES : JSON_BYTES;
        if (request.getContentLengthLong() > maximum) {
            reject(request, response, HttpServletResponse.SC_REQUEST_ENTITY_TOO_LARGE,
                    "REQUEST_BODY_TOO_LARGE", "Request body exceeds the allowed size");
            return;
        }
        if (catalogImage && !catalogSlots.tryAcquire()) {
            reject(request, response, HttpServletResponse.SC_SERVICE_UNAVAILABLE,
                    "IMAGE_PROCESSING_BUSY", "Image processing is busy. Please try again shortly.");
            return;
        }
        try {
            byte[] bytes = request.getInputStream().readNBytes(maximum + 1);
            if (bytes.length > maximum) {
                reject(request, response, HttpServletResponse.SC_REQUEST_ENTITY_TOO_LARGE,
                        "REQUEST_BODY_TOO_LARGE", "Request body exceeds the allowed size");
                return;
            }
            chain.doFilter(new BufferedJsonRequest(request, bytes), response);
        } finally {
            if (catalogImage) {
                catalogSlots.release();
            }
        }
    }

    private void reject(HttpServletRequest request, HttpServletResponse response,
            int status, String code, String message) throws IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        mapper.writeValue(response.getOutputStream(), new GlobalExceptionHandler.ErrorResponse(
                Instant.now(), request.getRequestURI(), status, code, message, null));
    }

    private static final class BufferedJsonRequest extends HttpServletRequestWrapper {
        private final ServletInputStream input;

        private BufferedJsonRequest(HttpServletRequest request, byte[] bytes) {
            super(request);
            var source = new ByteArrayInputStream(bytes);
            input = new ServletInputStream() {
                @Override
                public int read() { return source.read(); }
                @Override
                public int read(byte[] target, int offset, int length) { return source.read(target, offset, length); }
                @Override
                public boolean isFinished() { return source.available() == 0; }
                @Override
                public boolean isReady() { return true; }
                @Override
                public void setReadListener(ReadListener listener) {
                    throw new IllegalStateException("Buffered JSON uses synchronous MVC input");
                }
            };
        }

        @Override
        public ServletInputStream getInputStream() { return input; }

        @Override
        public BufferedReader getReader() {
            return new BufferedReader(new InputStreamReader(input, StandardCharsets.UTF_8));
        }
    }
}
