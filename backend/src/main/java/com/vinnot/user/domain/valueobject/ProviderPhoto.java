package com.vinnot.user.domain.valueobject;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.regex.Pattern;

/**
 * Profile photos that come from a social sign-in. Google pictures are requested at 256 px instead of the 96 px the
 * token carries. A stored photo still pointing at a provider is refreshed on the next social sign-in; photos uploaded
 * to Vinnot are never provider links, so they are never replaced.
 */
public final class ProviderPhoto {

    private static final Pattern GOOGLE_SIZE = Pattern.compile("=s\\d+(-c)?$");
    private static final String GOOGLE_256 = "=s256-c";
    private static final String GOOGLE_HOST = "googleusercontent.com";
    private static final List<String> PROVIDER_HOSTS = List.of(GOOGLE_HOST, "facebook.com", "fbcdn.net", "fbsbx.com");

    private ProviderPhoto() {
    }

    /**
     * @param providerUrl the photo link the provider supplied
     * @return the link to store, Google pictures at 256 px; {@code null} when the provider supplied none
     */
    public static String normalize(String providerUrl) {
        if (Objects.isNull(providerUrl) || providerUrl.isBlank()) {
            return null;
        }
        return isHost(providerUrl, List.of(GOOGLE_HOST))
                ? GOOGLE_SIZE.matcher(providerUrl).replaceFirst(GOOGLE_256) : providerUrl;
    }

    /** Whether the stored photo is a Google or Facebook link rather than a photo uploaded to Vinnot. */
    public static boolean isProviderLink(String storedUrl) {
        return Objects.nonNull(storedUrl) && isHost(storedUrl, PROVIDER_HOSTS);
    }

    private static boolean isHost(String url, List<String> domains) {
        String host;
        try {
            host = new URI(url).getHost();
        } catch (URISyntaxException exception) {
            return false;
        }
        if (Objects.isNull(host)) {
            return false;
        }
        String normalized = host.toLowerCase(Locale.ROOT);
        return domains.stream().anyMatch(domain -> normalized.equals(domain) || normalized.endsWith("." + domain));
    }
}
