package com.vinnot.user.application.port.out;

public interface AppleAuthorizationRevocationPort {
    void revoke(
            String authorizationCode,
            String clientId,
            String redirectUri,
            String expectedProviderSubject
    );
}
