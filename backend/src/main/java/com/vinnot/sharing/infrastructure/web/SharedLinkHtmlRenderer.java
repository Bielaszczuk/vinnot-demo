package com.vinnot.sharing.infrastructure.web;

import com.vinnot.sharing.domain.SharedContent;
import com.vinnot.sharing.domain.SharedContentKind;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import java.io.IOException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;
import java.util.regex.Matcher;

@Component
public class SharedLinkHtmlRenderer {
    private final String origin;
    private final String apiOrigin;
    private final boolean androidAvailable;
    private final String template;
    private static final int TITLE_LIMIT = 120;
    private static final int DESCRIPTION_LIMIT = 240;
    private static final int URL_LIMIT = 2048;
    private static final String IOS_ID = "6817992780";
    private static final Pattern TOKEN = Pattern.compile("\\{\\{([A-Za-z]+)\\}\\}");
    // Known size of the brand preview; a shared photo has no known size, so its tags are left out.
    private static final String BRAND_IMAGE_SIZE = "<meta property=\"og:image:type\" content=\"image/png\">"
            + "<meta property=\"og:image:width\" content=\"1200\"><meta property=\"og:image:height\" content=\"630\">";
    // Tokens whose values are fixed markup built here, never user content.
    private static final Set<String> MARKUP_TOKENS = Set.of("ogImageSize");
    public SharedLinkHtmlRenderer(
            @Value("${app.auth.frontend-base-url}") String origin,
            @Value("${app.sharing.api-origin:https://api.vinnot.com}") String apiOrigin,
            @Value("${app.sharing.android-available:true}") boolean androidAvailable) throws IOException {
        this.origin = validOrigin(origin);
        this.apiOrigin = validOrigin(apiOrigin);
        this.androidAvailable = androidAvailable;
        template = new ClassPathResource("sharing/landing.html").getContentAsString(StandardCharsets.UTF_8);
    }
    private String validOrigin(String value) {
        URI uri = URI.create(value);
        if (Objects.isNull(uri.getHost()) || Objects.nonNull(uri.getUserInfo()) || Objects.nonNull(uri.getRawQuery()) || Objects.nonNull(uri.getRawFragment())
                || !("https".equals(uri.getScheme()) || "http".equals(uri.getScheme()) && "localhost".equals(uri.getHost()))
                || !(uri.getPath().isEmpty() || "/".equals(uri.getPath()))) {
            throw new IllegalArgumentException("Sharing requires an explicit web origin");
        }
        return value.replaceAll("/+$", "");
    }
    public String render(SharedContentKind kind, UUID id, SharedContent content, boolean english) {
        boolean item = Objects.nonNull(kind) && Objects.nonNull(id);
        boolean missing = Objects.isNull(content) && item;
        String path = Objects.nonNull(content) && item ? "/" + kind.path() + "/" + id : "/";
        String sharePath = item ? "/share/" + kind.path() + "/" + id : "/share";
        String title = Objects.nonNull(content) ? clean(content.title(), TITLE_LIMIT)
                : missing ? (english ? "This link is no longer available" : "Este enlace ya no está disponible") : "Vinnot";
        String description = Objects.nonNull(content) ? clean(content.description(), DESCRIPTION_LIMIT)
                : missing ? (english ? "The content may have been removed or is not public." : "El contenido puede haber sido retirado o no ser público.")
                : (english ? "Discover wines, plan wine routes and share experiences." : "Descubrí vinos, planificá rutas y compartí experiencias.");
        String fallback = origin + "/share-assets/vinnot-preview.png";
        String image = publicImage(Objects.isNull(content) ? null : content.imageUrl(), fallback);
        String subtitle = english ? "The world of wine, your way" : "El mundo del vino, a tu manera";
        String pageTitle = Objects.nonNull(content) || missing ? title + " · Vinnot" : "Vinnot · " + subtitle;
        Map<String, String> values = Map.ofEntries(
                Map.entry("lang", english ? "en" : "es"), Map.entry("locale", english ? "en_US" : "es_AR"),
                Map.entry("title", title), Map.entry("pageTitle", pageTitle), Map.entry("description", description),
                Map.entry("canonical", origin + sharePath), Map.entry("origin", origin),
                Map.entry("image", image.equals(fallback) ? origin + "/share-assets/vinnot-logo.png" : image),
                Map.entry("imageClass", image.equals(fallback) ? "brand-image" : "content-image"),
                // Link previews (WhatsApp, social networks) show the shared photo, or the brand preview without one.
                Map.entry("ogImage", image),
                Map.entry("ogImageAlt", image.equals(fallback) ? "Vinnot" : title),
                Map.entry("ogImageSize", image.equals(fallback) ? BRAND_IMAGE_SIZE : ""),
                Map.entry("previewClass", item ? "" : "content-preview--brand"),
                Map.entry("preview", english ? "Shared with you" : "Lo que te compartieron"),
                Map.entry("appUrl", "vinnot://" + path.substring(1)), Map.entry("webUrl", origin + path),
                Map.entry("open", english ? "Already have the app? Open in Vinnot" : "Ya tengo la app · Abrir en Vinnot"),
                Map.entry("web", english ? "Continue on the web" : "Continuar en la web"),
                Map.entry("access", english ? "Other ways to continue" : "Otras formas de continuar"),
                Map.entry("subtitle", subtitle),
                Map.entry("install", english ? "Take Vinnot with you" : "Llevá Vinnot con vos"),
                Map.entry("installText", english
                        ? "Discover the wine in your glass. Scan its label, explore its profile and find your next favourite."
                        : "Conocé el vino que estás tomando. Escaneá su etiqueta, explorá su perfil y descubrí tu próximo favorito."),
                Map.entry("download", english ? "Download Vinnot" : "Descargar Vinnot"),
                Map.entry("free", english ? "Free to download" : "Descargala gratis"),
                Map.entry("stores", english ? "Download stores" : "Tiendas de descarga"),
                Map.entry("features", english ? "Explore in the app" : "Descubrí en la app"),
                Map.entry("scan", english ? "Scan labels" : "Escaneá etiquetas"),
                Map.entry("cellar", english ? "Your own cellar" : "Tu propia bodega"),
                Map.entry("routes", english ? "Wine routes" : "Rutas del vino"),
                Map.entry("iosMessage", english ? "Free on the App Store" : "Gratis en App Store"),
                Map.entry("androidMessage", english ? "Free on Google Play" : "Gratis en Google Play"),
                Map.entry("iosUrl", "https://apps.apple.com/app/vinnot/id" + IOS_ID),
                Map.entry("androidUrl", androidAvailable ? "https://play.google.com/store/apps/details?id=com.vinnot.app" : origin + "/contact"),
                Map.entry("androidClass", androidAvailable ? "" : "unavailable"),
                Map.entry("androidAvailable", Boolean.toString(androidAvailable)),
                Map.entry("androidDisabled", Boolean.toString(!androidAvailable)),
                Map.entry("androidTabIndex", androidAvailable ? "0" : "-1"),
                Map.entry("androidText", androidAvailable ? "Google Play" : (english ? "Coming soon on Google Play" : "Próximamente en Google Play")),
                Map.entry("privacy", english ? "Privacy" : "Privacidad"), Map.entry("contact", english ? "Contact" : "Contacto"),
                Map.entry("smartBanner", "app-id=" + IOS_ID + ", app-argument=" + origin + sharePath),
                Map.entry("category", Objects.isNull(kind) ? "VINNOT" : switch (kind) {
                    case WINES -> english ? "WINE" : "VINO";
                    case EVENTS -> english ? "EVENT" : "EVENTO";
                    case ROUTES -> english ? "WINE ROUTE" : "RUTA DEL VINO";
                }),
                Map.entry("switchUrl", origin + sharePath + (english ? "?lang=es" : "?lang=en")),
                Map.entry("switchLang", english ? "es" : "en"),
                Map.entry("switchText", english ? "Español" : "English"));
        // Single pass prevents user content such as {{origin}} from becoming a template token.
        var matcher = TOKEN.matcher(template);
        var out = new StringBuilder();
        while (matcher.find()) {
            String value = values.get(matcher.group(1));
            matcher.appendReplacement(out, Matcher.quoteReplacement(MARKUP_TOKENS.contains(matcher.group(1)) ? value : escape(value)));
        }
        matcher.appendTail(out);
        return out.toString();
    }
    private String publicImage(String value, String fallback) {
        if (Objects.isNull(value) || value.isBlank() || value.length() > URL_LIMIT) {
            return fallback;
        }
        try {
            URI uri = URI.create(value);
            if (Objects.isNull(uri.getRawPath()) || Objects.nonNull(uri.getRawQuery()) || Objects.nonNull(uri.getRawFragment())
                    || uri.getRawPath().contains("%") || uri.getPath().contains("..") || value.contains("\\")) {
                return fallback;
            }
            if (value.startsWith("/api/uploads/")) {
                return apiOrigin + value;
            }
            if (!"https".equals(uri.getScheme()) || Objects.nonNull(uri.getUserInfo()) || uri.getPort() != -1) {
                return fallback;
            }
            return "images.vinnot.com".equals(uri.getHost()) || uri.toString().startsWith(apiOrigin + "/api/uploads/") ? value : fallback;
        } catch (IllegalArgumentException ignored) { return fallback; }
    }
    private String clean(String value, int limit) {
        if (Objects.isNull(value)) {
            return "";
        }
        String text = value.replaceAll("[\\p{Cntrl}\\s]+", " ").trim();
        return text.length() > limit ? text.substring(0, limit) + "…" : text;
    }
    private String escape(String value) {
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                .replace("\"", "&quot;").replace("'", "&#39;");
    }
}
