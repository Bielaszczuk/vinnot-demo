package com.vinnot.notification.infrastructure.push;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.vinnot.notification.application.port.out.PushSenderPort;
import com.vinnot.notification.domain.model.NotificationCategory;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.notification.domain.model.PushContent;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.ExpectedCount;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withBadRequest;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class ExpoPushSenderAdapterTest {
    private static final Instant NOW = Instant.parse("2026-10-21T12:00:00Z");
    private static final String SEND = "https://exp.host/--/api/v2/push/send";
    private final RestClient.Builder builder = RestClient.builder().baseUrl("https://exp.host/--/api/v2/push")
            .defaultHeader("Authorization", "Bearer secret");
    private final MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
    private final List<Duration> pauses = new ArrayList<>();
    private final SimpleMeterRegistry meters = new SimpleMeterRegistry();
    private final ExpoPushSenderAdapter adapter = new ExpoPushSenderAdapter(builder.build(), PushRateLimiter.unlimited(),
            meters, Clock.fixed(NOW, ZoneOffset.UTC), 2, pauses::add);
    private final PushContent content = new PushContent("Your event is coming up", "Tasting night starts tomorrow", "/my-tickets/r1");

    @Test
    void sendsTitleBodyAndTheTrackedDataAndReadsOneTicketPerMessage() {
        server.expect(requestTo(SEND)).andExpect(method(HttpMethod.POST))
                .andExpect(header("Authorization", "Bearer secret"))
                .andExpect(content().json("""
                        [{"to":"ExpoPushToken[a]","title":"Your event is coming up","body":"Tasting night starts tomorrow",
                          "data":{"url":"/my-tickets/r1","type":"EVENT_REMINDER","ref":"reminder:r1"},"sound":"default",
                          "priority":"high","channelId":"tickets","ttl":3600},
                         {"to":"ExpoPushToken[b]","priority":"normal","channelId":"default"}]
                        """))
                .andRespond(withSuccess("""
                        {"data":[{"status":"ok","id":"t1"},
                                 {"status":"error","message":"not registered","details":{"error":"DeviceNotRegistered"}}]}
                        """, MediaType.APPLICATION_JSON));

        var tickets = adapter.send(List.of(
                new PushSenderPort.Message("ExpoPushToken[a]", content, true, NotificationType.EVENT_REMINDER, "reminder:r1",
                        NOW.plus(Duration.ofHours(1)), true),
                new PushSenderPort.Message("ExpoPushToken[b]", content, false, NotificationType.EVENT_REMINDER, "reminder:r1",
                        null, false)));

        assertThat(tickets).containsExactly(new PushSenderPort.Ticket("ExpoPushToken[a]", "t1", null),
                new PushSenderPort.Ticket("ExpoPushToken[b]", null, "DeviceNotRegistered"));
        assertThat(tickets.get(1).deviceNotRegistered()).isTrue();
        server.verify();
    }

    @Test
    void theStrictPayloadHasNoTtlWithoutADeadlineAndAPastDeadlineIsZero() {
        server.expect(requestTo(SEND)).andExpect(content().json("""
                        [{"to":"ExpoPushToken[a]","title":"Your event is coming up","body":"Tasting night starts tomorrow",
                          "data":{"url":"/my-tickets/r1","type":"NEWSLETTER","ref":"news:1"},"sound":"default",
                          "priority":"normal","channelId":"news"},
                         {"to":"ExpoPushToken[b]","title":"Your event is coming up","body":"Tasting night starts tomorrow",
                          "data":{"url":"/my-tickets/r1","type":"NEWSLETTER","ref":"news:1"},"sound":"default",
                          "priority":"normal","channelId":"news","ttl":0}]
                        """, true))
                .andRespond(withSuccess("{\"data\":[{\"status\":\"ok\",\"id\":\"t1\"},{\"status\":\"ok\",\"id\":\"t2\"}]}",
                        MediaType.APPLICATION_JSON));

        adapter.send(List.of(
                new PushSenderPort.Message("ExpoPushToken[a]", content, false, NotificationType.NEWSLETTER, "news:1", null, true),
                new PushSenderPort.Message("ExpoPushToken[b]", content, false, NotificationType.NEWSLETTER, "news:1",
                        NOW.minusSeconds(5), true)));

        server.verify();
    }

    @Test
    void everyCategoryHasItsAndroidChannelAndAnUnknownOneFallsBackToDefault() {
        for (NotificationCategory category : NotificationCategory.values()) {
            String expected = switch (category) {
                case TICKETS, PAYMENTS, ACCOUNT, SECURITY, SUBMISSIONS, SUPPORT, MODERATION -> "tickets";
                case COMMUNITY -> "community";
                case RECOMMENDATIONS -> "recommendations";
                case EVENTS_NEARBY -> "events-nearby";
                case NEWSLETTER -> "news";
                default -> "reminders";
            };
            Arrays.stream(NotificationType.values()).filter(type -> type.category() == category)
                    .filter(type -> type != NotificationType.SERVICE_NOTICE && type != NotificationType.ANNOUNCEMENT_TEST)
                    .forEach(type -> assertThat(ExpoPushSenderAdapter.androidChannel(type)).as(type.name()).isEqualTo(expected));
        }
        assertThat(ExpoPushSenderAdapter.androidChannel(NotificationType.SERVICE_NOTICE)).isEqualTo("news");
        assertThat(ExpoPushSenderAdapter.androidChannel(NotificationType.ANNOUNCEMENT_TEST)).isEqualTo("news");
        assertThat(ExpoPushSenderAdapter.channelForCategory("REMINDERS")).isEqualTo("reminders");
        assertThat(ExpoPushSenderAdapter.channelForCategory("SOMETHING_NEW")).isEqualTo("default");
    }

    @Test
    void aMissingTicketFailsSoTheJobIsRetried() {
        server.expect(requestTo(SEND)).andRespond(withSuccess("{\"data\":[]}", MediaType.APPLICATION_JSON));

        assertThatThrownBy(() -> adapter.send(List.of(message("a")))).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void tooManyRequestsWaitsWhatTheProviderAsksAndThenSucceeds() {
        var headers = new HttpHeaders();
        headers.add(HttpHeaders.RETRY_AFTER, "7");
        server.expect(requestTo(SEND)).andRespond(withStatus(HttpStatus.TOO_MANY_REQUESTS).headers(headers));
        server.expect(requestTo(SEND)).andRespond(withSuccess("{\"data\":[{\"status\":\"ok\",\"id\":\"t1\"}]}",
                MediaType.APPLICATION_JSON));

        assertThat(adapter.send(List.of(message("a")))).extracting(PushSenderPort.Ticket::id).containsExactly("t1");
        assertThat(pauses).containsExactly(Duration.ofSeconds(7));
        server.verify();
    }

    @Test
    void serverErrorsBackOffExponentiallyAndFailTheJobOnceRetriesAreUsedUp() {
        server.expect(ExpectedCount.times(3), requestTo(SEND)).andRespond(withServerError());

        assertThatThrownBy(() -> adapter.send(List.of(message("a"))))
                .isInstanceOf(RuntimeException.class).isNotInstanceOf(PushSenderPort.RejectedException.class);
        assertThat(pauses).containsExactly(Duration.ofSeconds(1), Duration.ofSeconds(2));
        server.verify();
    }

    @Test
    void aBadRequestIsRejectedAtOnceAndNeverRetried() {
        server.expect(ExpectedCount.once(), requestTo(SEND)).andRespond(withBadRequest());

        assertThatThrownBy(() -> adapter.send(List.of(message("a")))).isInstanceOf(PushSenderPort.RejectedException.class)
                .hasMessageNotContaining("ExpoPushToken");
        assertThat(pauses).isEmpty();
        server.verify();
    }

    @Test
    void everySendWaitsForTheSharedRateLimitOnePermitPerMessage() {
        long[] nanos = {0};
        var limited = new ExpoPushSenderAdapter(builder.build(), new PushRateLimiter(2, () -> nanos[0], pauses::add), meters,
                Clock.fixed(NOW, ZoneOffset.UTC), 0, pauses::add);
        server.expect(ExpectedCount.times(2), requestTo(SEND)).andRespond(withSuccess(
                "{\"data\":[{\"status\":\"ok\",\"id\":\"t1\"},{\"status\":\"ok\",\"id\":\"t2\"}]}", MediaType.APPLICATION_JSON));

        limited.send(List.of(message("a"), message("b")));
        limited.send(List.of(message("a"), message("b")));

        assertThat(pauses).containsExactly(Duration.ofSeconds(1));
    }

    @Test
    void ticketAndReceiptErrorsAreLoggedByCodeWithoutTokensAndCounted() {
        Logger logger = (Logger) LoggerFactory.getLogger(ExpoPushSenderAdapter.class);
        var logs = new ListAppender<ILoggingEvent>();
        logs.start();
        logger.addAppender(logs);
        server.expect(requestTo(SEND)).andRespond(withSuccess("""
                {"data":[{"status":"error","details":{"error":"MessageRateExceeded"}},
                         {"status":"error","details":{"error":"MessageRateExceeded"}},
                         {"status":"error","details":{"error":"DeviceNotRegistered"}}]}
                """, MediaType.APPLICATION_JSON));
        server.expect(requestTo("https://exp.host/--/api/v2/push/getReceipts")).andRespond(withSuccess("""
                {"data":{"t1":{"status":"error","details":{"error":"InvalidCredentials"}},
                         "t2":{"status":"error","details":{"error":"DeviceNotRegistered"}}}}
                """, MediaType.APPLICATION_JSON));
        try {
            adapter.send(List.of(message("a"), message("b"), message("c")));
            adapter.receipts(List.of("t1", "t2"));
        } finally {
            logger.detachAppender(logs);
        }

        assertThat(logs.list).extracting(ILoggingEvent::getFormattedMessage).containsExactlyInAnyOrder(
                "Expo ticket error MessageRateExceeded for 2 push message(s)",
                "Expo receipt error InvalidCredentials for 1 push message(s)");
        assertThat(logs.list).allSatisfy(event -> assertThat(event.getFormattedMessage()).doesNotContain("ExpoPushToken"));
        assertThat(meters.counter("vinnot.push.provider.errors", "stage", "ticket", "code", "MessageRateExceeded").count())
                .isEqualTo(2);
        assertThat(meters.counter("vinnot.push.provider.errors", "stage", "receipt", "code", "InvalidCredentials").count())
                .isEqualTo(1);
    }

    @Test
    void readsReceiptsAndTheirErrors() {
        server.expect(requestTo("https://exp.host/--/api/v2/push/getReceipts"))
                .andExpect(content().json("{\"ids\":[\"t1\",\"t2\",\"t3\"]}"))
                .andRespond(withSuccess("""
                        {"data":{"t1":{"status":"ok"},"t2":{"status":"error","details":{"error":"DeviceNotRegistered"}},
                                 "t3":{"status":"error","message":"rate"}}}
                        """, MediaType.APPLICATION_JSON));

        var receipts = adapter.receipts(List.of("t1", "t2", "t3"));

        assertThat(receipts).isEqualTo(Map.of("t1", new PushSenderPort.Receipt(true, null),
                "t2", new PushSenderPort.Receipt(false, "DeviceNotRegistered"), "t3", new PushSenderPort.Receipt(false, "Unknown")));
        assertThat(receipts.get("t2").deviceNotRegistered()).isTrue();
    }

    @Test
    void emptyCallsReachNoServerAndOversizedOnesAreRefused() {
        assertThat(adapter.send(List.of())).isEmpty();
        assertThat(adapter.receipts(List.of())).isEmpty();
        var tooMany = IntStream.range(0, 101).mapToObj(index -> message(String.valueOf(index))).toList();
        assertThatThrownBy(() -> adapter.send(tooMany)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> adapter.receipts(IntStream.range(0, 1001).mapToObj(String::valueOf).toList()))
                .isInstanceOf(IllegalArgumentException.class);
        server.verify();
    }

    private PushSenderPort.Message message(String token) {
        return new PushSenderPort.Message("ExpoPushToken[" + token + "]", content, true, NotificationType.EVENT_REMINDER, "key",
                null, false);
    }
}
