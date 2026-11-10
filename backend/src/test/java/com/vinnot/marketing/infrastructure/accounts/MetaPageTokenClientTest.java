package com.vinnot.marketing.infrastructure.accounts;

import com.vinnot.marketing.application.port.out.SocialAccountOAuthProvider;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** #510 S5: the Page token is read with the system-user token in the Authorization header, never in the URL. */
class MetaPageTokenClientTest {
    private final FakeNetwork network = new FakeNetwork();
    private final MetaPageTokenClient client = new MetaPageTokenClient(FakeNetwork.http(), network.baseUrl() + "/v27.0");

    @AfterEach
    void stop() {
        network.close();
    }

    @Test
    void readsThePageTokenWithTheSystemUserToken() {
        network.answer("/v27.0/1020", 200, "{\"access_token\":\"page-token\",\"id\":\"1020\"}");

        assertThat(client.pageToken("system-token", "1020")).isEqualTo("page-token");

        FakeNetwork.Request request = network.request("/v27.0/1020");
        assertThat(request.method()).isEqualTo("GET");
        assertThat(request.authorization()).isEqualTo("Bearer system-token");
        assertThat(request.query()).containsOnlyKeys("fields").containsEntry("fields", "access_token");
    }

    @Test
    void aMissingTokenOrARefusalFails() {
        network.answer("/v27.0/1020", 200, "{\"id\":\"1020\"}");
        assertThatThrownBy(() -> client.pageToken("system-token", "1020")).isInstanceOf(SocialAccountOAuthProvider.Failure.class);

        network.answer("/v27.0/1020", 403, "{\"error\":{\"message\":\"system-token invalid\"}}");
        assertThatThrownBy(() -> client.pageToken("system-token", "1020")).isInstanceOfSatisfying(SocialAccountOAuthProvider.Failure.class,
                failure -> assertThat(failure.getMessage()).doesNotContain("system-token"));
    }
}
