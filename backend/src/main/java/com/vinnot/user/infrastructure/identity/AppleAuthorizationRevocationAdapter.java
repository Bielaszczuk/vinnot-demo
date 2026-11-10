package com.vinnot.user.infrastructure.identity;

import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import com.vinnot.shared.infrastructure.http.HttpOperationDeadline;
import com.vinnot.user.application.port.out.AppleAuthorizationRevocationPort;
import io.jsonwebtoken.Jwts;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestOperations;

import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.time.Instant;
import java.time.Duration;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Component
public class AppleAuthorizationRevocationAdapter
        implements AppleAuthorizationRevocationPort {

    private static final String APPLE_ISSUER = "https://appleid.apple.com";
    private static final Duration OPERATION_BUDGET = Duration.ofSeconds(15);
    private static final long CLIENT_SECRET_MINUTES = 5L;

    private final Set<String> audiences;
    private final String teamId;
    private final String keyId;
    private final String privateKey;
    private final Set<String> redirectUris;
    private final RestClient appleClient;
    private final RestOperations jwkClient;

    public AppleAuthorizationRevocationAdapter(
            @Qualifier("socialRestClientBuilder") RestClient.Builder restClientBuilder,
            @Qualifier("socialJwkRestOperations") RestOperations jwkClient,
            @Value("${app.auth.social.apple.audiences:}") String audiences,
            @Value("${app.auth.social.apple.team-id:}") String teamId,
            @Value("${app.auth.social.apple.key-id:}") String keyId,
            @Value("${app.auth.social.apple.private-key:}") String privateKey,
            @Value("${app.auth.social.apple.redirect-uris:}") String redirectUris) {
        this.audiences = parseCsv(audiences);
        this.teamId = teamId;
        this.keyId = keyId;
        this.privateKey = privateKey;
        this.redirectUris = parseCsv(redirectUris);
        this.appleClient = restClientBuilder.baseUrl(APPLE_ISSUER).build();
        this.jwkClient = jwkClient;
    }

    @Override
    public void revoke(
            String authorizationCode,
            String clientId,
            String redirectUri,
            String expectedProviderSubject) {
        try (var deadline = HttpOperationDeadline.start(OPERATION_BUDGET)) {
            revokeWithinBudget(authorizationCode, clientId, redirectUri, expectedProviderSubject);
            deadline.check();
        }
    }

    private void revokeWithinBudget(String authorizationCode, String clientId,
            String redirectUri, String expectedProviderSubject) {
        requireConfigured(clientId, redirectUri);
        String clientSecret = createClientSecret(clientId);
        Map<?, ?> tokenResponse = exchangeCode(
                authorizationCode, clientId, clientSecret, redirectUri);
        validateIdentity(tokenResponse, clientId, expectedProviderSubject);
        String token = firstNonBlank(
                stringValue(tokenResponse.get("refresh_token")),
                stringValue(tokenResponse.get("access_token")));
        if (Objects.isNull(token)) {
            throw revocationFailure();
        }
        revokeToken(token, clientId, clientSecret,
                Objects.nonNull(tokenResponse.get("refresh_token"))
                        ? "refresh_token" : "access_token");
    }

    private Map<?, ?> exchangeCode(
            String authorizationCode,
            String clientId,
            String clientSecret,
            String redirectUri) {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("client_id", clientId);
        form.add("client_secret", clientSecret);
        form.add("code", authorizationCode);
        form.add("grant_type", "authorization_code");
        if (Objects.nonNull(redirectUri) && !redirectUri.isBlank()) {
            form.add("redirect_uri", redirectUri);
        }
        try {
            Map<?, ?> response = appleClient.post()
                    .uri("/auth/token")
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .retrieve()
                    .body(Map.class);
            return Objects.requireNonNullElse(response, Map.of());
        } catch (RestClientResponseException exception) {
            throw revocationFailure();
        }
    }

    private void validateIdentity(
            Map<?, ?> tokenResponse,
            String clientId,
            String expectedProviderSubject) {
        String identityToken = stringValue(tokenResponse.get("id_token"));
        if (Objects.isNull(identityToken)) {
            throw revocationFailure();
        }
        JwtDecoder decoder = NimbusJwtDecoder
                .withJwkSetUri("https://appleid.apple.com/auth/keys")
                .restOperations(jwkClient)
                .build();
        ((NimbusJwtDecoder) decoder).setJwtValidator(
                new DelegatingOAuth2TokenValidator<>(
                        JwtValidators.createDefaultWithIssuer(APPLE_ISSUER),
                        new JwtClaimValidator<List<String>>(
                                "aud",
                                values -> Objects.nonNull(values)
                                        && values.contains(clientId))));
        Jwt jwt = decoder.decode(identityToken);
        if (!Objects.equals(expectedProviderSubject, jwt.getSubject())) {
            throw new BusinessRuleViolationException(
                    "APPLE_IDENTITY_MISMATCH",
                    "The Apple authorization does not belong to this account");
        }
    }

    private void revokeToken(
            String token,
            String clientId,
            String clientSecret,
            String tokenTypeHint) {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("client_id", clientId);
        form.add("client_secret", clientSecret);
        form.add("token", token);
        form.add("token_type_hint", tokenTypeHint);
        try {
            appleClient.post()
                    .uri("/auth/revoke")
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientResponseException exception) {
            throw revocationFailure();
        }
    }

    private String createClientSecret(String clientId) {
        Instant now = Instant.now();
        return Jwts.builder()
                .header()
                .keyId(keyId)
                .and()
                .issuer(teamId)
                .subject(clientId)
                .audience()
                .add(APPLE_ISSUER)
                .and()
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(CLIENT_SECRET_MINUTES, ChronoUnit.MINUTES)))
                .signWith(readPrivateKey(), Jwts.SIG.ES256)
                .compact();
    }

    private PrivateKey readPrivateKey() {
        try {
            String normalized = privateKey
                    .replace("\\n", "\n")
                    .replace("-----BEGIN PRIVATE KEY-----", "")
                    .replace("-----END PRIVATE KEY-----", "")
                    .replaceAll("\\s", "");
            byte[] decoded = Base64.getDecoder().decode(normalized);
            return KeyFactory.getInstance("EC")
                    .generatePrivate(new PKCS8EncodedKeySpec(decoded));
        } catch (Exception exception) {
            throw new BusinessRuleViolationException(
                    "APPLE_REVOCATION_NOT_CONFIGURED",
                    "Apple account deletion is not configured correctly");
        }
    }

    private void requireConfigured(String clientId, String redirectUri) {
        if (!audiences.contains(clientId)
                || teamId.isBlank()
                || keyId.isBlank()
                || privateKey.isBlank()
                || !isAllowedRedirectUri(redirectUri)) {
            throw new BusinessRuleViolationException(
                    "APPLE_REVOCATION_NOT_CONFIGURED",
                    "Apple account deletion is not configured");
        }
    }

    private boolean isAllowedRedirectUri(String redirectUri) {
        return Objects.isNull(redirectUri)
                || redirectUri.isBlank()
                || redirectUris.contains(redirectUri);
    }

    private Set<String> parseCsv(String values) {
        return Stream.of(values.split(","))
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .collect(Collectors.toUnmodifiableSet());
    }

    private String firstNonBlank(String first, String second) {
        if (Objects.nonNull(first) && !first.isBlank()) {
            return first;
        }
        return Objects.nonNull(second) && !second.isBlank() ? second : null;
    }

    private String stringValue(Object value) {
        return Objects.isNull(value) ? null : String.valueOf(value);
    }

    private BusinessRuleViolationException revocationFailure() {
        return new BusinessRuleViolationException(
                "APPLE_REVOCATION_FAILED",
                "Apple authorization could not be revoked; sign in again and retry");
    }
}
