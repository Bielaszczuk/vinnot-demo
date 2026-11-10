package com.vinnot.shared.infrastructure.maps;

import tools.jackson.databind.ObjectMapper;
import com.vinnot.shared.application.port.RouteDistanceService.LatLng;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.Duration;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.net.http.HttpClient;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.anything;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withException;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

@ExtendWith(OutputCaptureExtension.class)
class GoogleMapsDistanceServiceTest {
    private final RestTemplate client = new RestTemplate();
    private final MockRestServiceServer server = MockRestServiceServer.bindTo(client).build();
    private final GoogleMapsDistanceService service = new GoogleMapsDistanceService(
            new ObjectMapper(), "private-api-key", client);
    private final LatLng coordinate = new LatLng(BigDecimal.ZERO, BigDecimal.ZERO);

    @Test
    void preservesDistanceCalculationAndWaypointOrder() {
        server.expect(anything()).andExpect(request -> {
            assertThat(request.getURI().getQuery()).contains("origin=0,0", "destination=1,2",
                    "waypoints=0,0|0,0", "key=private-api-key");
        }).andRespond(withSuccess("""
                {"status":"OK","routes":[{"legs":[{"distance":{"value":1234}},
                {"distance":{"value":5678}}]}]}
                """, MediaType.APPLICATION_JSON));
        assertThat(service.calculateTotalDistanceKm(List.of(coordinate, coordinate, coordinate,
                new LatLng(BigDecimal.ONE, BigDecimal.valueOf(2))))).isEqualTo(6.9);
        server.verify();
    }

    @Test
    void rejectsUnusableInputsWithoutProviderCalls() {
        assertThat(service.calculateTotalDistanceKm(null)).isNull();
        for (List<LatLng> stops : List.of(List.<LatLng>of(), List.of(coordinate),
                Collections.nCopies(28, coordinate), Arrays.asList(coordinate, null),
                List.of(coordinate, new LatLng(null, BigDecimal.ZERO)),
                List.of(coordinate, new LatLng(BigDecimal.valueOf(91), BigDecimal.ZERO)),
                List.of(coordinate, new LatLng(BigDecimal.ZERO, BigDecimal.valueOf(-181))))) {
            assertThat(service.calculateTotalDistanceKm(stops)).isNull();
        }
        for (String key : Arrays.asList(null, "")) {
            assertThat(new GoogleMapsDistanceService(new ObjectMapper(), key, client)
                    .calculateTotalDistanceKm(List.of(coordinate, coordinate))).isNull();
        }
        server.verify();
    }

    @Test
    void doesNotLogProviderErrorBodiesOrSecrets(CapturedOutput output) {
        server.expect(anything()).andRespond(withSuccess(
                "{\"status\":\"DENIED-private-api-key\",\"error_message\":\"private-body\"}",
                MediaType.APPLICATION_JSON));
        server.expect(anything()).andRespond(withException(
                new IOException("https://maps.example/?key=private-api-key private-body")));
        assertThat(service.calculateTotalDistanceKm(List.of(coordinate, coordinate))).isNull();
        assertThat(service.calculateTotalDistanceKm(List.of(coordinate, coordinate))).isNull();
        assertThat(output.getAll()).doesNotContain("private-api-key", "private-body", "https://maps.example");
        server.verify();
    }

    @Test
    void configuresFiniteTimeoutsAndRejectsUnlimitedConfiguration() {
        var configured = new GoogleMapsDistanceService(new ObjectMapper(), "",
                Duration.ofSeconds(3), Duration.ofSeconds(5));
        var template = (RestTemplate) ReflectionTestUtils.getField(configured, "restTemplate");
        var transport = (HttpClient) ReflectionTestUtils.getField(template.getRequestFactory(), "client");
        assertThat(transport.connectTimeout()).contains(Duration.ofSeconds(3));
        assertThat(ReflectionTestUtils.getField(template.getRequestFactory(), "requestBudget"))
                .isEqualTo(Duration.ofSeconds(5));
        for (Duration value : List.of(Duration.ZERO, Duration.ofSeconds(-1), Duration.ofNanos(1),
                Duration.ofMillis((long) Integer.MAX_VALUE + 1))) {
            assertThatThrownBy(() -> new GoogleMapsDistanceService(new ObjectMapper(), "", value,
                    Duration.ofSeconds(5))).isInstanceOf(IllegalArgumentException.class);
            assertThatThrownBy(() -> new GoogleMapsDistanceService(new ObjectMapper(), "", Duration.ofSeconds(3),
                    value)).isInstanceOf(IllegalArgumentException.class);
        }
    }
}
