package com.vinnot.marketing.infrastructure.accounts;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;

/** A local HTTP server standing in for a network's API in tests (#510 S5): canned answers per path, recorded requests. */
final class FakeNetwork implements AutoCloseable {
    private final HttpServer server;
    private final Map<String, Answer> answers = new ConcurrentHashMap<>();
    private final List<Request> requests = new ArrayList<>();
    private boolean closed;

    FakeNetwork() {
        try {
            server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        } catch (IOException failure) {
            throw new UncheckedIOException(failure);
        }
        server.createContext("/", this::handle);
        server.start();
    }

    String baseUrl() {
        return "http://127.0.0.1:" + server.getAddress().getPort();
    }

    void answer(String path, int status, String body) {
        answers.put(path, new Answer(status, body));
    }

    synchronized List<Request> requests() {
        return List.copyOf(requests);
    }

    synchronized Request request(String path) {
        return requests.stream().filter(request -> request.path().equals(path)).findFirst().orElseThrow();
    }

    static SocialAccountHttp http() {
        return new SocialAccountHttp(HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(2)).build(), new ObjectMapper(), Duration.ofSeconds(2));
    }

    private void handle(HttpExchange exchange) throws IOException {
        String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
        synchronized (this) {
            requests.add(new Request(exchange.getRequestMethod(), exchange.getRequestURI().getPath(), params(exchange.getRequestURI().getRawQuery()),
                    params(body), exchange.getRequestHeaders().getFirst("Authorization"), exchange.getRequestHeaders().getFirst("Content-Type")));
        }
        Answer answer = answers.getOrDefault(exchange.getRequestURI().getPath(), new Answer(404, "{}"));
        byte[] bytes = answer.body().getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().add("Content-Type", "application/json");
        exchange.sendResponseHeaders(answer.status(), bytes.length);
        exchange.getResponseBody().write(bytes);
        exchange.close();
    }

    private static Map<String, String> params(String raw) {
        Map<String, String> params = new LinkedHashMap<>();
        if (Objects.isNull(raw) || raw.isBlank()) {
            return params;
        }
        Arrays.stream(raw.split("&")).map(pair -> pair.split("=", 2)).forEach(pair -> params.put(decode(pair[0]),
                pair.length > 1 ? decode(pair[1]) : ""));
        return params;
    }

    private static String decode(String value) {
        return URLDecoder.decode(value, StandardCharsets.UTF_8);
    }

    @Override
    public synchronized void close() {
        if (!closed) {
            closed = true;
            server.stop(0);
        }
    }

    record Request(String method, String path, Map<String, String> query, Map<String, String> form, String authorization, String contentType) {
    }

    private record Answer(int status, String body) {
    }
}
