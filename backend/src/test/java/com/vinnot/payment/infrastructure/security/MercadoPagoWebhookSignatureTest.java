package com.vinnot.payment.infrastructure.security;
import org.junit.jupiter.api.Test;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.HexFormat;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class MercadoPagoWebhookSignatureTest {
    private static final String SECRET = "local-signature-test-fixture-32-characters";
    private final Instant now = Instant.parse("2026-10-15T12:00:00Z");
    private final MercadoPagoWebhookSignature validator = new MercadoPagoWebhookSignature(SECRET, Clock.fixed(now, ZoneOffset.UTC));
    @Test void validatesOfficialManifestWithBoundedFreshTimestampAndConstantTimeDigest() throws Exception {
        String ts = Long.toString(now.getEpochSecond());
        assertThat(validator.valid(sign(ts), "request-test", "123")).isTrue();
        assertThat(validator.valid(sign(Long.toString(now.toEpochMilli())), "request-test", "123")).isTrue();
        assertThat(validator.valid(sign(ts), "request-test", "124")).isFalse();
        assertThat(validator.valid(sign(ts), "changed", "123")).isFalse();
        assertThat(validator.valid(sign(Long.toString(now.minusSeconds(601).getEpochSecond())), "request-test", "123")).isFalse();
        assertThat(validator.valid(sign(Long.toString(now.plusSeconds(601).getEpochSecond())), "request-test", "123")).isFalse();
    }
    @Test void rejectsMissingOversizedMalformedAndAmbiguousInput() throws Exception {
        String valid = sign(Long.toString(now.getEpochSecond()));
        for (String value : new String[]{null, "x".repeat(513), "", "ts=foo,v1=bar", "ts=123=123", "v1=" + "a".repeat(64), "ts=1234567890",
                valid + ",ts=1234567890", valid + ",v1=" + "a".repeat(64), valid + ",foo=bar", valid.replace("v1=", "v1=z")}) {
            assertThat(validator.valid(value, "request-test", "123")).isFalse();
        }
        for (String value : new String[]{null, "", "a;ts:123", "x".repeat(129)}) {
            assertThat(validator.valid(valid, value, "123")).isFalse();
        }
        for (String value : new String[]{null, "", "0", "../1", "1".repeat(21)}) {
            assertThat(validator.valid(valid, "request-test", value)).isFalse();
        }
        assertThatThrownBy(() -> new MercadoPagoWebhookSignature(null, Clock.systemUTC())).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new MercadoPagoWebhookSignature("short", Clock.systemUTC())).isInstanceOf(IllegalArgumentException.class);
    }
    private String sign(String timestamp) throws Exception {
        var mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return "ts=" + timestamp + ",v1=" + HexFormat.of().formatHex(mac.doFinal(("id:123;request-id:request-test;ts:" + timestamp + ";").getBytes(StandardCharsets.UTF_8)));
    }
}
