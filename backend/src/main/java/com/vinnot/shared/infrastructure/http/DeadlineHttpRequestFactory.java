package com.vinnot.shared.infrastructure.http;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.client.AbstractClientHttpRequest;
import org.springframework.http.client.ClientHttpRequest;
import org.springframework.http.client.ClientHttpRequestFactory;
import org.springframework.http.client.ClientHttpResponse;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.SocketTimeoutException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Set;
import java.util.Locale;
import java.util.Objects;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

/** Bounded, non-redirecting transport; waits for the entire body, not just headers. */
public final class DeadlineHttpRequestFactory implements ClientHttpRequestFactory {
    private static final Set<String> MANAGED_HEADERS = Set.of(
            "content-length", "host", "connection", "expect", "upgrade");
    private final HttpClient client;
    private final Duration requestBudget;
    private final int maximumRequestBytes;
    private final int maximumResponseBytes;

    public DeadlineHttpRequestFactory(Duration connectBudget, Duration requestBudget,
            int maximumRequestBytes, int maximumResponseBytes) {
        HttpOperationDeadline.requireBounded(connectBudget);
        HttpOperationDeadline.requireBounded(requestBudget);
        if (maximumRequestBytes < 1 || maximumResponseBytes < 1) {
            throw new IllegalArgumentException("HTTP byte limits must be positive");
        }
        this.client = HttpClient.newBuilder().connectTimeout(connectBudget)
                .followRedirects(HttpClient.Redirect.NEVER).build();
        this.requestBudget = requestBudget;
        this.maximumRequestBytes = maximumRequestBytes;
        this.maximumResponseBytes = maximumResponseBytes;
    }

    @Override
    public ClientHttpRequest createRequest(URI uri, HttpMethod method) {
        return new Request(uri, method);
    }

    private final class Request extends AbstractClientHttpRequest {
        private final URI uri;
        private final HttpMethod method;
        private final ByteArrayOutputStream body = new ByteArrayOutputStream();

        private Request(URI uri, HttpMethod method) {
            this.uri = uri;
            this.method = method;
        }

        @Override public URI getURI() { return uri; }
        @Override public HttpMethod getMethod() { return method; }

        @Override
        protected OutputStream getBodyInternal(HttpHeaders headers) {
            return new OutputStream() {
                @Override public void write(int value) throws IOException {
                    requireCapacity(1);
                    body.write(value);
                }
                @Override public void write(byte[] bytes, int offset, int length) throws IOException {
                    requireCapacity(length);
                    body.write(bytes, offset, length);
                }
                private void requireCapacity(int length) throws IOException {
                    if ((long) body.size() + length > maximumRequestBytes) {
                        throw new IOException("External request exceeds byte limit");
                    }
                }
            };
        }

        @Override
        protected ClientHttpResponse executeInternal(HttpHeaders headers) throws IOException {
            Duration remaining = HttpOperationDeadline.remaining(requestBudget);
            var request = HttpRequest.newBuilder(uri).timeout(remaining)
                    .method(method.name(), HttpRequest.BodyPublishers.ofByteArray(body.toByteArray()));
            headers.forEach((name, values) -> {
                if (!MANAGED_HEADERS.contains(name.toLowerCase(Locale.ROOT))) {
                    values.forEach(value -> request.header(name, value));
                }
            });
            var future = client.sendAsync(request.build(), HttpResponse.BodyHandlers.limiting(
                    HttpResponse.BodyHandlers.ofByteArray(), maximumResponseBytes));
            try {
                return new Response(future.get(remaining.toNanos(), TimeUnit.NANOSECONDS));
            } catch (TimeoutException exception) {
                future.cancel(true);
                throw new SocketTimeoutException("External request deadline exceeded");
            } catch (InterruptedException exception) {
                future.cancel(true);
                Thread.currentThread().interrupt();
                throw new IOException("External request interrupted");
            } catch (ExecutionException exception) {
                // Do not propagate provider URLs, tokens or response bodies through nested causes.
                throw new IOException("External request failed");
            }
        }
    }

    private static final class Response implements ClientHttpResponse {
        private final HttpResponse<byte[]> response;
        private final HttpHeaders headers = new HttpHeaders();
        private final InputStream body;

        private Response(HttpResponse<byte[]> response) {
            this.response = response;
            response.headers().map().forEach(headers::addAll);
            body = new ByteArrayInputStream(response.body());
        }
        @Override public HttpStatusCode getStatusCode() { return HttpStatusCode.valueOf(response.statusCode()); }
        @Override public String getStatusText() {
            HttpStatus status = HttpStatus.resolve(response.statusCode());
            return Objects.isNull(status) ? "" : status.getReasonPhrase();
        }
        @Override public HttpHeaders getHeaders() { return HttpHeaders.readOnlyHttpHeaders(headers); }
        @Override public InputStream getBody() { return body; }
        @Override public void close() { /* Response is fully buffered within the configured byte limit. */ }
    }
}
