package com.vinnot.user.infrastructure.identity;

import tools.jackson.core.JacksonException;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import com.vinnot.shared.infrastructure.http.HttpOperationDeadline;
import com.vinnot.user.application.port.out.SocialIdentityVerifierPort;
import com.vinnot.user.application.port.out.model.SocialCredential;
import com.vinnot.user.application.port.out.model.VerifiedSocialIdentity;
import com.vinnot.user.domain.valueobject.SocialProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestOperations;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.HexFormat;

@Component
public class SocialIdentityVerifierAdapter implements SocialIdentityVerifierPort {
    private static final Duration OPERATION_BUDGET = Duration.ofSeconds(15);

    private static final Logger LOGGER = LoggerFactory.getLogger(
            SocialIdentityVerifierAdapter.class);
    private static final String GOOGLE_ISSUER = "https://accounts.google.com";
    private static final String APPLE_ISSUER = "https://appleid.apple.com";
    private static final OAuth2Error INVALID_ISSUER = new OAuth2Error(
            "invalid_token", "The token issuer is not accepted", null);
    private static final TypeReference<Map<String, Object>> JSON_OBJECT_TYPE =
            new TypeReference<>() { };

    private final Set<String> googleAudiences;
    private final Set<String> appleAudiences;
    private final String facebookAppId;
    private final String facebookAppSecret;
    private final String facebookGraphVersion;
    private final RestClient facebookClient;
    private final ObjectMapper objectMapper;
    private final RestOperations jwkClient;

    public SocialIdentityVerifierAdapter(
            ObjectMapper objectMapper,
            @Qualifier("socialRestClientBuilder") RestClient.Builder restClientBuilder,
            @Qualifier("socialJwkRestOperations") RestOperations jwkClient,
            @Value("${app.auth.social.google.audiences:}") String googleAudiences,
            @Value("${app.auth.social.apple.audiences:}") String appleAudiences,
            @Value("${app.auth.social.facebook.app-id:}") String facebookAppId,
            @Value("${app.auth.social.facebook.app-secret:}") String facebookAppSecret,
            @Value("${app.auth.social.facebook.graph-version:v23.0}")
            String facebookGraphVersion) {
        this.googleAudiences = parseList(googleAudiences);
        this.appleAudiences = parseList(appleAudiences);
        this.facebookAppId = facebookAppId;
        this.facebookAppSecret = facebookAppSecret;
        this.facebookGraphVersion = facebookGraphVersion;
        this.facebookClient = restClientBuilder
                .baseUrl("https://graph.facebook.com")
                .build();
        this.objectMapper = objectMapper;
        this.jwkClient = jwkClient;
    }

    @Override
    public VerifiedSocialIdentity verify(SocialCredential credential) {
        if (Objects.isNull(credential) || Objects.isNull(credential.provider())
                || Objects.isNull(credential.token()) || credential.token().isBlank()) {
            throw invalidCredential();
        }
        try (var deadline = HttpOperationDeadline.start(OPERATION_BUDGET)) {
            VerifiedSocialIdentity identity = switch (credential.provider()) {
                case GOOGLE -> verifyGoogle(credential);
                case APPLE -> verifyApple(credential);
                case FACEBOOK -> verifyFacebook(credential);
            };
            deadline.check();
            return identity;
        } catch (BusinessRuleViolationException exception) {
            throw exception;
        } catch (RuntimeException exception) {
            LOGGER.warn(
                    "Social credential verification failed for provider={} due to {} at {}",
                    credential.provider(), exception.getClass().getSimpleName(),
                    applicationFailureLocation(exception));
            throw invalidCredential();
        }
    }

    private VerifiedSocialIdentity verifyGoogle(SocialCredential credential) {
        requireConfigured(googleAudiences, SocialProvider.GOOGLE);
        NimbusJwtDecoder decoder = NimbusJwtDecoder
                .withJwkSetUri("https://www.googleapis.com/oauth2/v3/certs")
                .restOperations(jwkClient)
                .build();
        OAuth2TokenValidator<Jwt> issuerValidator = token -> {
            String issuer = Objects.isNull(token.getIssuer())
                    ? "" : token.getIssuer().toString();
            boolean valid = GOOGLE_ISSUER.equals(issuer) || "accounts.google.com".equals(issuer);
            return valid ? OAuth2TokenValidatorResult.success()
                    : OAuth2TokenValidatorResult.failure(INVALID_ISSUER);
        };
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
                JwtValidators.createDefault(), issuerValidator,
                audienceValidator(googleAudiences)));
        Jwt token = decode(decoder, credential.token());
        return new VerifiedSocialIdentity(
                SocialProvider.GOOGLE,
                requiredSubject(token),
                token.getClaimAsString("email"),
                booleanClaim(token, "email_verified"),
                token.getClaimAsString("given_name"),
                token.getClaimAsString("family_name"),
                token.getClaimAsString("picture"));
    }

    private VerifiedSocialIdentity verifyApple(SocialCredential credential) {
        requireConfigured(appleAudiences, SocialProvider.APPLE);
        NimbusJwtDecoder decoder = NimbusJwtDecoder
                .withJwkSetUri("https://appleid.apple.com/auth/keys")
                .restOperations(jwkClient)
                .build();
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
                JwtValidators.createDefaultWithIssuer(APPLE_ISSUER),
                audienceValidator(appleAudiences)));
        Jwt token = decode(decoder, credential.token());
        validateNonce(token, credential.nonce());
        return new VerifiedSocialIdentity(
                SocialProvider.APPLE,
                requiredSubject(token),
                token.getClaimAsString("email"),
                booleanClaim(token, "email_verified"),
                credential.firstName(),
                credential.lastName(),
                null);
    }

    private VerifiedSocialIdentity verifyFacebook(SocialCredential credential) {
        if (facebookAppId.isBlank() || facebookAppSecret.isBlank()) {
            throw notConfigured(SocialProvider.FACEBOOK);
        }
        String debugPayloadJson;
        try {
            debugPayloadJson = facebookClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/{version}/debug_token")
                            .queryParam("input_token", credential.token())
                            .queryParam("access_token", facebookAppId + "|" + facebookAppSecret)
                            .build(facebookGraphVersion))
                    .accept(MediaType.APPLICATION_JSON)
                    .retrieve()
                    .body(String.class);
        } catch (RestClientResponseException exception) {
            LOGGER.warn("Facebook debug_token request failed with HTTP {}",
                    exception.getStatusCode().value());
            throw invalidCredential();
        }
        Map<String, Object> debugPayload = parseFacebookPayload(debugPayloadJson);
        Map<String, Object> data = asMap(debugPayload.get("data"));
        if (!Boolean.TRUE.equals(data.get("is_valid"))
                || !facebookAppId.equals(String.valueOf(data.get("app_id")))) {
            LOGGER.warn(
                    "Facebook token rejected: valid={}, appIdMatches={}, type={}, "
                            + "expiresAt={}, dataAccessExpiresAt={}, errorCode={}",
                    data.get("is_valid"),
                    facebookAppId.equals(String.valueOf(data.get("app_id"))),
                    data.get("type"), data.get("expires_at"),
                    data.get("data_access_expires_at"),
                    asMap(data.get("error")).get("code"));
            throw invalidCredential();
        }

        String profilePayloadJson;
        try {
            profilePayloadJson = facebookClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/{version}/me")
                            .queryParam("fields", "id,email,first_name,last_name,picture.type(large)")
                            .queryParam("access_token", credential.token())
                            .build(facebookGraphVersion))
                    .accept(MediaType.APPLICATION_JSON)
                    .retrieve()
                    .body(String.class);
        } catch (RestClientResponseException exception) {
            LOGGER.warn("Facebook profile request failed with HTTP {}",
                    exception.getStatusCode().value());
            throw invalidCredential();
        }
        Map<String, Object> profilePayload = parseFacebookPayload(profilePayloadJson);
        if (profilePayload.isEmpty() || !Objects.equals(
                String.valueOf(data.get("user_id")), String.valueOf(profilePayload.get("id")))) {
            throw invalidCredential();
        }
        Map<String, Object> picture = asMap(profilePayload.get("picture"));
        Map<String, Object> pictureData = asMap(picture.get("data"));
        String email = stringValue(profilePayload.get("email"));
        return new VerifiedSocialIdentity(
                SocialProvider.FACEBOOK,
                stringValue(profilePayload.get("id")),
                email,
                Objects.nonNull(email) && !email.isBlank(),
                stringValue(profilePayload.get("first_name")),
                stringValue(profilePayload.get("last_name")),
                stringValue(pictureData.get("url")));
    }

    private OAuth2TokenValidator<Jwt> audienceValidator(Set<String> audiences) {
        return new JwtClaimValidator<List<String>>("aud",
                tokenAudiences -> Objects.nonNull(tokenAudiences)
                        && tokenAudiences.stream().anyMatch(audiences::contains));
    }

    private Jwt decode(JwtDecoder decoder, String token) {
        return decoder.decode(token);
    }

    private String requiredSubject(Jwt token) {
        String subject = token.getSubject();
        if (Objects.isNull(subject) || subject.isBlank()) {
            throw invalidCredential();
        }
        return subject;
    }

    private boolean booleanClaim(Jwt token, String claimName) {
        Object claim = token.getClaims().get(claimName);
        return Boolean.TRUE.equals(claim) || "true".equalsIgnoreCase(String.valueOf(claim));
    }

    private void validateNonce(Jwt token, String nonce) {
        if (Objects.isNull(nonce) || nonce.isBlank()) {
            return;
        }
        String tokenNonce = token.getClaimAsString("nonce");
        if (!nonce.equals(tokenNonce) && !sha256(nonce).equals(tokenNonce)) {
            throw invalidCredential();
        }
    }

    private String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 not available", exception);
        }
    }

    private void requireConfigured(Set<String> audiences, SocialProvider provider) {
        if (audiences.isEmpty()) {
            throw notConfigured(provider);
        }
    }

    private BusinessRuleViolationException notConfigured(SocialProvider provider) {
        return new BusinessRuleViolationException(
                "SOCIAL_LOGIN_NOT_CONFIGURED",
                provider.name() + " login is not configured");
    }

    private BusinessRuleViolationException invalidCredential() {
        return new BusinessRuleViolationException(
                "INVALID_SOCIAL_CREDENTIAL", "The social credential is invalid or expired");
    }

    private static Set<String> parseList(String raw) {
        return Arrays.stream(raw.split(","))
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .collect(Collectors.toUnmodifiableSet());
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> asMap(Object value) {
        return value instanceof Map<?, ?> map ? (Map<String, Object>) map : Map.of();
    }

    private static String stringValue(Object value) {
        return Objects.isNull(value) ? null : String.valueOf(value);
    }

    private Map<String, Object> parseFacebookPayload(String payload) {
        if (Objects.isNull(payload) || payload.isBlank()) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(payload, JSON_OBJECT_TYPE);
        } catch (JacksonException exception) {
            LOGGER.warn("Facebook returned a malformed JSON response");
            throw invalidCredential();
        }
    }

    private static String applicationFailureLocation(RuntimeException exception) {
        return Arrays.stream(exception.getStackTrace())
                .filter(frame -> frame.getClassName().startsWith("com.vinnot."))
                .findFirst()
                .map(frame -> frame.getClassName() + "." + frame.getMethodName()
                        + ":" + frame.getLineNumber())
                .orElse("external-library");
    }
}
