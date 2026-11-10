package com.vinnot.marketing.application.service;

import com.vinnot.marketing.application.model.SocialAccountDisconnectResult;
import com.vinnot.marketing.application.model.SocialAccountGrant;
import com.vinnot.marketing.application.model.SocialAccountMetaSettings;
import com.vinnot.marketing.application.model.SocialAccountResponse;
import com.vinnot.marketing.application.model.SocialAccountSummary;
import com.vinnot.marketing.application.port.in.ManageSocialAccountsUseCase;
import com.vinnot.marketing.application.port.out.SocialAccountConnectStates;
import com.vinnot.marketing.application.port.out.SocialAccountOAuthProvider;
import com.vinnot.marketing.application.port.out.SocialAccountStore;
import com.vinnot.marketing.domain.model.SocialAccountStatus;
import com.vinnot.marketing.domain.model.SocialNetwork;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Instant;
import java.util.Arrays;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * The network connections of the admin page (#510 S5 C5). Meta (Instagram and the Facebook Page) is configured by
 * secrets; Threads and TikTok are connected with OAuth and their tokens stored encrypted. Nothing here returns or logs a
 * token or an authorization code.
 */
@Service
public class SocialAccountAdminService implements ManageSocialAccountsUseCase {
    public static final String NOT_OAUTH = "SOCIAL_ACCOUNT_NOT_OAUTH";
    public static final String NOT_CONFIGURED = "SOCIAL_ACCOUNT_NOT_CONFIGURED";
    public static final String ENCRYPTION_KEY_MISSING = "SOCIAL_ACCOUNT_ENCRYPTION_KEY_MISSING";
    private static final Logger LOGGER = LoggerFactory.getLogger(SocialAccountAdminService.class);
    private final SocialAccountStore store;
    private final Map<SocialNetwork, SocialAccountOAuthProvider> providers;
    private final SocialAccountConnectStates states;
    private final SocialAccountMetaSettings meta;
    private final Clock clock;

    @Autowired
    public SocialAccountAdminService(SocialAccountStore store, List<SocialAccountOAuthProvider> providers, SocialAccountConnectStates states,
            SocialAccountMetaSettings meta) {
        this(store, providers, states, meta, Clock.systemUTC());
    }

    SocialAccountAdminService(SocialAccountStore store, List<SocialAccountOAuthProvider> providers, SocialAccountConnectStates states,
            SocialAccountMetaSettings meta, Clock clock) {
        this.store = store;
        this.providers = new EnumMap<>(SocialNetwork.class);
        providers.forEach(provider -> this.providers.put(provider.network(), provider));
        this.states = states;
        this.meta = meta;
        this.clock = clock;
    }

    @Override
    public List<SocialAccountResponse> list() {
        Instant now = clock.instant();
        Map<SocialNetwork, SocialAccountSummary> stored = store.summaries().stream()
                .collect(Collectors.toMap(SocialAccountSummary::network, Function.identity()));
        return Arrays.stream(SocialNetwork.values()).map(network -> switch (network) {
            case INSTAGRAM -> configured(network, meta.instagramConfigured(), meta.instagramUserId());
            case FACEBOOK -> configured(network, meta.facebookConfigured(), meta.pageId());
            default -> connected(network, stored.get(network), now);
        }).toList();
    }

    private static SocialAccountResponse configured(SocialNetwork network, boolean configured, String accountId) {
        return new SocialAccountResponse(network, SocialAccountResponse.Mode.CONFIG, configured, configured, configured ? accountId : null, null,
                configured ? SocialAccountStatus.CONNECTED : null, null, null);
    }

    private SocialAccountResponse connected(SocialNetwork network, SocialAccountSummary account, Instant now) {
        boolean configured = Optional.ofNullable(providers.get(network)).map(SocialAccountOAuthProvider::configured).orElse(false);
        if (Objects.isNull(account)) {
            return new SocialAccountResponse(network, SocialAccountResponse.Mode.OAUTH, configured, false, null, null, null, null, null);
        }
        boolean working = account.status() == SocialAccountStatus.CONNECTED
                && (Objects.isNull(account.accessExpiresAt()) || account.accessExpiresAt().isAfter(now));
        Instant expiresAt = Objects.nonNull(account.refreshExpiresAt()) ? account.refreshExpiresAt() : account.accessExpiresAt();
        return new SocialAccountResponse(network, SocialAccountResponse.Mode.OAUTH, configured, working, account.accountId(),
                account.displayName(), account.status(), expiresAt, account.lastError());
    }

    @Override
    public String connectUrl(SocialNetwork network, UUID adminId) {
        SocialAccountOAuthProvider provider = providers.get(network);
        if (Objects.isNull(provider)) {
            throw new BusinessRuleViolationException(NOT_OAUTH, network + " is configured by secrets, not connected with OAuth");
        }
        if (!provider.configured()) {
            throw new BusinessRuleViolationException(NOT_CONFIGURED, network + " has no client id, client secret or redirect URI configured");
        }
        if (!store.encryptionReady()) {
            throw new BusinessRuleViolationException(ENCRYPTION_KEY_MISSING,
                    "Accounts cannot be connected until MARKETING_ACCOUNTS_ENCRYPTION_KEY is configured");
        }
        return provider.authorizeUrl(states.issue(adminId, network, clock.instant()));
    }

    @Override
    public boolean completeConnection(SocialNetwork network, String code, String state, String error) {
        Instant now = clock.instant();
        Optional<UUID> admin = states.consume(state, network, now);
        if (admin.isEmpty()) {
            LOGGER.warn("Rejected a {} connection callback with an unknown, used, expired or foreign state", network);
            return false;
        }
        if (Objects.nonNull(error) || Objects.isNull(code) || code.isBlank()) {
            LOGGER.warn("The {} connection was not authorized by the network", network);
            return false;
        }
        SocialAccountOAuthProvider provider = providers.get(network);
        if (Objects.isNull(provider) || !provider.configured()) {
            LOGGER.warn("Rejected a {} connection callback: the network is not connected with OAuth or not configured", network);
            return false;
        }
        try {
            SocialAccountGrant grant = provider.exchange(code);
            store.connect(network, grant, admin.get(), now);
            LOGGER.info("Connected the {} account {}", network, grant.accountId());
            return true;
        } catch (SocialAccountOAuthProvider.Failure failure) {
            LOGGER.warn("The {} code exchange failed: {}", network, failure.code());
            return false;
        } catch (RuntimeException storage) {
            // Only the failure's type: storage messages may echo statement parameters. The admin is redirected with an error.
            LOGGER.error("The {} account could not be stored ({})", network, storage.getClass().getSimpleName());
            return false;
        }
    }

    @Override
    public SocialAccountDisconnectResult disconnect(SocialNetwork network) {
        if (network == SocialNetwork.INSTAGRAM || network == SocialNetwork.FACEBOOK) {
            return SocialAccountDisconnectResult.CONFIGURED_BY_SECRETS;
        }
        if (!store.delete(network)) {
            return SocialAccountDisconnectResult.NOT_CONNECTED;
        }
        LOGGER.info("Removed the connected {} account", network);
        return SocialAccountDisconnectResult.REMOVED;
    }
}
