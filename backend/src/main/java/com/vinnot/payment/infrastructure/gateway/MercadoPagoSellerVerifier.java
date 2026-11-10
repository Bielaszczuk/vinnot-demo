package com.vinnot.payment.infrastructure.gateway;

import tools.jackson.databind.JsonNode;
import com.vinnot.payment.domain.model.SellerCredentials;
import java.util.Objects;
import com.vinnot.payment.application.service.PaymentExecutionPolicy;
import org.springframework.web.client.RestClient;

/** Normal API test-user credentials and payments can report live_mode=true. Verify the actual recipient. */
final class MercadoPagoSellerVerifier {
    private MercadoPagoSellerVerifier() { }

    static void verify(RestClient client, SellerCredentials credentials, PaymentExecutionPolicy policy) {
        policy.requireSeller(credentials.sellerId());
        JsonNode identity = client.get().uri("/users/me")
                .headers(headers -> headers.setBearerAuth(credentials.accessToken())).retrieve().body(JsonNode.class);
        if (Objects.isNull(identity) || !credentials.sellerId().equals(identity.path("id").asText())
                || !"MLA".equals(identity.path("site_id").asText()) || !identity.path("tags").isArray()) {
            throw new IllegalArgumentException("Invalid payment seller identity");
        }
        boolean testAccount = false;
        for (JsonNode tag : identity.path("tags")) {
            if ("test_user".equals(tag.asText())) {
                testAccount = true;
            }
        }
        if (testAccount != (policy.environment() == PaymentExecutionPolicy.Environment.SANDBOX)) {
            throw new IllegalArgumentException("Seller does not match payment environment");
        }

    }

}
