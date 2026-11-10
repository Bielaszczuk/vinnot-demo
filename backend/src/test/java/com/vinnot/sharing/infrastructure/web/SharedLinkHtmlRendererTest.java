package com.vinnot.sharing.infrastructure.web;

import com.vinnot.sharing.domain.SharedContent;
import com.vinnot.sharing.domain.SharedContentKind;
import org.junit.jupiter.api.Test;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;

class SharedLinkHtmlRendererTest {
    private final UUID id = UUID.randomUUID();
    @Test void downloadsPrecedeContentAndWebFallbackInBothLanguages() throws Exception {
        var renderer = new SharedLinkHtmlRenderer("https://vinnot.com", "https://api.vinnot.com", false);
        for (boolean english : new boolean[]{false, true}) {
            var html = renderer.render(SharedContentKind.WINES, id, new SharedContent("Mural Tinto", "A wine", null), english);
            assertThat(html.indexOf("data-download-button")).isLessThan(html.indexOf("class=\"content-preview"));
            assertThat(html.indexOf("class=\"content-preview")).isLessThan(html.indexOf("class=\"app-open\""));
            assertThat(html.indexOf("class=\"app-open\"")).isLessThan(html.indexOf("class=\"web-link\""));
            assertThat(html).contains("data-android-available=\"false\"", "aria-disabled=\"true\" tabindex=\"-1\"",
                    "class=\"brand-image\" src=\"https://vinnot.com/share-assets/vinnot-logo.png\"",
                    "href=\"https://vinnot.com/wines/" + id + "\"")
                    .doesNotContain("{{download}}", "{{androidAvailable}}");
        }
        assertThat(renderer.render(null, null, null, false)).contains("content-preview--brand");
        assertThat(new SharedLinkHtmlRenderer("https://vinnot.com", "https://api.vinnot.com", true)
                .render(null, null, null, true)).contains("data-android-available=\"true\"", "aria-disabled=\"false\" tabindex=\"0\"");
    }
    @Test void escapesMarkupAndDoesNotRecursivelyInterpretUserTokens() throws Exception {
        var renderer = new SharedLinkHtmlRenderer("https://vinnot.com", "https://api.vinnot.com", true);
        var html = renderer.render(SharedContentKind.EVENTS, id,
                new SharedContent("<script>\"'&{{origin}}", "Hello\nWorld", "javascript:alert(1)"), true);
        assertThat(html).contains("&lt;script&gt;&quot;&#39;&amp;{{origin}}", "Hello World", "vinnot-preview.png")
                .doesNotContain("<script>", "javascript:alert", "{{title}}")
                .contains("https://play.google.com/store/apps/details?id=com.vinnot.app");
    }
    @Test void onlyTrustedPublicImagesAreRenderedAndDescriptionsAreBounded() throws Exception {
        var renderer = new SharedLinkHtmlRenderer("https://dev.vinnot.com", "https://api-dev.vinnot.com", false);
        for (var source : new String[]{"https://images.vinnot.com.evil.test/image.webp", "https://u:p@images.vinnot.com/i.webp",
                "https://images.vinnot.com:443/i.webp", "https://images.vinnot.com/i.webp?token=secret", "//evil.test/i", "/api/uploads/../private", "/api/uploads/%2e%2e/private", "/api/uploads/covers/x.webp?token=secret", "https://images.vinnot.com/%2e%2e/private"}) {
            assertThat(renderer.render(SharedContentKind.WINES, id, new SharedContent("Wine", "x".repeat(500), source), false))
                    .contains("vinnot-preview.png").doesNotContain(source, "x".repeat(241));
        }
        assertThat(renderer.render(SharedContentKind.ROUTES, id, new SharedContent("Route", null, "/api/uploads/covers/route.webp"), false))
                .contains("https://api-dev.vinnot.com/api/uploads/covers/route.webp");
    }
    @Test void linkPreviewsShowTheSharedPhotoAndKeepTheBrandImageAsFallback() throws Exception {
        var renderer = new SharedLinkHtmlRenderer("https://vinnot.com", "https://api.vinnot.com", false);
        var wine = "https://images.vinnot.com/wines/ar/" + id + "/" + "a".repeat(64) + ".webp";
        var photos = Map.of(
                SharedContentKind.WINES, List.of(wine, wine),
                SharedContentKind.EVENTS, List.of("/api/uploads/events/event.webp", "https://api.vinnot.com/api/uploads/events/event.webp"),
                SharedContentKind.ROUTES, List.of("/api/uploads/covers/route.webp", "https://api.vinnot.com/api/uploads/covers/route.webp"));
        for (var photo : photos.entrySet()) {
            var html = renderer.render(photo.getKey(), id, new SharedContent("Mural Tinto", "Shared", photo.getValue().get(0)), false);
            var image = photo.getValue().get(1);
            assertThat(html).contains("<meta property=\"og:image\" content=\"" + image + "\">",
                            "<meta name=\"twitter:image\" content=\"" + image + "\">",
                            "<meta property=\"og:image:alt\" content=\"Mural Tinto\">")
                    .doesNotContain("vinnot-preview.png", "og:image:width", "og:image:type");
        }
        var brand = "https://vinnot.com/share-assets/vinnot-preview.png";
        for (var html : List.of(renderer.render(SharedContentKind.WINES, id, new SharedContent("Mural Tinto", "Shared", null), false),
                renderer.render(SharedContentKind.EVENTS, id, null, true), renderer.render(null, null, null, false))) {
            assertThat(html).contains("<meta property=\"og:image\" content=\"" + brand + "\">",
                    "<meta name=\"twitter:image\" content=\"" + brand + "\">", "<meta property=\"og:image:type\" content=\"image/png\">",
                    "<meta property=\"og:image:width\" content=\"1200\">", "<meta property=\"og:image:height\" content=\"630\">",
                    "<meta property=\"og:image:alt\" content=\"Vinnot\">");
        }
    }
    @Test void invalidOriginsFailAtCompositionTime() {
        for (var value : new String[]{"javascript:alert(1)", "http://vinnot.com", "https://u:p@vinnot.com", "https://vinnot.com?x=1", "https://vinnot.com/path"}) {
            assertThatThrownBy(() -> new SharedLinkHtmlRenderer(value, "https://api.vinnot.com", false)).isInstanceOf(IllegalArgumentException.class);
        }
    }
}
