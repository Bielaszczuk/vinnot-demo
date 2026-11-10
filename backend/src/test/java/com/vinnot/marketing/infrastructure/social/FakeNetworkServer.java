package com.vinnot.marketing.infrastructure.social;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

/** A local stand-in for the networks' HTTP APIs: canned answers per method and path, every request recorded. */
final class FakeNetworkServer implements AutoCloseable {

    record Recorded(String method, String path, String query, String authorization, String contentType, String body) {

        Map<String, String> form() {
            return decode(body);
        }

        Map<String, String> queryParams() {
            return decode(query);
        }

        private static Map<String, String> decode(String encoded) {
            Map<String, String> values = new LinkedHashMap<>();
            if (Objects.isNull(encoded) || encoded.isEmpty()) {
                return values;
            }
            for (String pair : encoded.split("&")) {
                int separator = pair.indexOf('=');
                values.put(URLDecoder.decode(pair.substring(0, separator), StandardCharsets.UTF_8),
                        URLDecoder.decode(pair.substring(separator + 1), StandardCharsets.UTF_8));
            }
            return values;
        }
    }

    private record Answer(int status, String body, long delayMs) {
    }

    private final HttpServer server;
    private final Map<String, Deque<Answer>> routes = new ConcurrentHashMap<>();
    private final List<Recorded> requests = new CopyOnWriteArrayList<>();

    private FakeNetworkServer() {
        try {
            server = HttpServer.create(new InetSocketAddress(InetAddress.getLoopbackAddress(), 0), 0);
        } catch (IOException failure) {
            throw new UncheckedIOException(failure);
        }
        server.createContext("/", this::handle);
        server.start();
    }

    static FakeNetworkServer start() {
        return new FakeNetworkServer();
    }

    String baseUrl() {
        return "http://" + server.getAddress().getHostString() + ":" + server.getAddress().getPort();
    }

    /** Queues an answer; the last one queued for a route keeps answering. */
    FakeNetworkServer on(String method, String path, int status, String body) {
        return on(method, path, status, body, 0);
    }

    FakeNetworkServer on(String method, String path, int status, String body, long delayMs) {
        routes.computeIfAbsent(method + " " + path, key -> new ArrayDeque<>()).add(new Answer(status, body, delayMs));
        return this;
    }

    /** Drops what was queued for the route and answers this from now on. */
    FakeNetworkServer replace(String method, String path, int status, String body) {
        routes.remove(method + " " + path);
        return on(method, path, status, body);
    }

    List<Recorded> requests() {
        return List.copyOf(requests);
    }

    List<Recorded> all(String method, String path) {
        return requests.stream().filter(request -> request.method().equals(method) && request.path().equals(path))
                .toList();
    }

    Recorded only(String method, String path) {
        List<Recorded> matching = all(method, path);
        if (matching.size() != 1) {
            throw new AssertionError("Expected one " + method + " " + path + " but got " + matching.size());
        }
        return matching.getFirst();
    }

    private void handle(HttpExchange exchange) throws IOException {
        String method = exchange.getRequestMethod();
        String path = exchange.getRequestURI().getPath();
        requests.add(new Recorded(method, path, exchange.getRequestURI().getRawQuery(),
                exchange.getRequestHeaders().getFirst("Authorization"),
                exchange.getRequestHeaders().getFirst("Content-Type"),
                new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8)));
        Deque<Answer> answers = routes.get(method + " " + path);
        Answer answer;
        if (Objects.isNull(answers) || answers.isEmpty()) {
            answer = new Answer(404, "{\"error\":{\"message\":\"no route\"}}", 0);
        } else {
            synchronized (answers) {
                answer = answers.size() > 1 ? answers.poll() : answers.peek();
            }
        }
        if (answer.delayMs() > 0) {
            try {
                Thread.sleep(answer.delayMs());
            } catch (InterruptedException interrupted) {
                Thread.currentThread().interrupt();
            }
        }
        byte[] body = answer.body().getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().add("Content-Type", "application/json");
        exchange.sendResponseHeaders(answer.status(), body.length == 0 ? -1 : body.length);
        if (body.length > 0) {
            exchange.getResponseBody().write(body);
        }
        exchange.close();
    }

    @Override
    public void close() {
        server.stop(0);
    }
}
