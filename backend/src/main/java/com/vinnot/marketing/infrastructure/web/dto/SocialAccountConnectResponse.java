package com.vinnot.marketing.infrastructure.web.dto;

/** The OAuth consent page the admin's browser opens to connect a network (#510 S5 C5). */
public record SocialAccountConnectResponse(String authorizeUrl) {
}
