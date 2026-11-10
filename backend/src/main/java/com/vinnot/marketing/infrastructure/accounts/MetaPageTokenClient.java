package com.vinnot.marketing.infrastructure.accounts;

import tools.jackson.databind.JsonNode;

import java.util.Map;

/**
 * Reads the Facebook Page access token the Page publisher needs (#510 S5) from the business system-user token:
 * {@code GET {graph}/{page-id}?fields=access_token}, with the system-user token in the Authorization header so it never
 * travels in a URL.
 */
public class MetaPageTokenClient {
    private final SocialAccountHttp http;
    private final String graphBaseUrl;

    public MetaPageTokenClient(SocialAccountHttp http, String graphBaseUrl) {
        this.http = http;
        this.graphBaseUrl = graphBaseUrl;
    }

    public String pageToken(String systemUserToken, String pageId) {
        JsonNode page = http.get(SocialAccountHttp.uri(graphBaseUrl, "/" + SocialAccountHttp.encode(pageId), Map.of("fields", "access_token")),
                systemUserToken, "The Facebook Page token request");
        return SocialAccountHttp.required(page, "access_token", "The Facebook Page token request");
    }
}
