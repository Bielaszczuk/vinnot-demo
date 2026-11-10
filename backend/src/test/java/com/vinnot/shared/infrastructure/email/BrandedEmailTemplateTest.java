package com.vinnot.shared.infrastructure.email;

import com.vinnot.shared.infrastructure.email.BrandedEmailTemplate.Language;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class BrandedEmailTemplateTest {
    private final BrandedEmailTemplate template = new BrandedEmailTemplate("https://dev.vinnot.com/");

    @Test
    void escapesUserContentOnceAndPreservesNewlinesWithoutInterpretingTemplatePlaceholders() {
        String html = template.html(Language.ES, "Título <script>", "Resumen <img>",
                BrandedEmailTemplate.paragraph("Ana & María\r\n<script>alert('x')</script> {{website}}")
                        + BrandedEmailTemplate.detail("<Categoría>", "<svg onload=alert(1)>"));
        assertThat(html).contains("Título &lt;script&gt;", "Resumen &lt;img&gt;", "Ana &amp; María<br>",
                "&lt;script&gt;", "{{website}}", "&lt;Categoría&gt;", "&lt;svg onload=alert(1)&gt;")
                .doesNotContain("<script>", "<svg", "<img>");
    }

    @Test
    void imagesAndFooterUseTheConfiguredEnvironmentAndEnglishTextRemainsEnglish() {
        String html = template.html(Language.EN, "Support request", "New request", "");
        assertThat(html).contains("lang=\"en\"", "YOUR WORLD OF WINE", "Visit Vinnot", "Contact", "Privacy",
                "https://dev.vinnot.com/images/brand/mark.png", "https://dev.vinnot.com/images/brand/wordmark.png",
                "https://dev.vinnot.com/images/email/winery-v1.png", "https://dev.vinnot.com/contact",
                "https://dev.vinnot.com/privacy", "alt=\"Vinnot\"")
                .doesNotContain("https://dev.vinnot.com//", "{{title}}", "TU MUNDO DEL VINO");
        assertThat(template.text(Language.EN, "Reference: 123\nMessage"))
                .startsWith("Reference: 123\nMessage").contains("Contact: https://dev.vinnot.com/contact", "Privacy:");
        assertThat(template.text(Language.ES, "Hola"))
                .startsWith("Hola").contains("Contacto:", "Privacidad:");
    }

    @Test
    void actionPreservesTheExactTokenUrlAndHasAnAccessibleTextFallback() {
        String url = "https://vinnot.com/reset-password?token=a_b-123&context=email";
        assertThat(BrandedEmailTemplate.action(url, "Restablecer <clave>"))
                .contains("href=\"https://vinnot.com/reset-password?token=a_b-123&amp;context=email\"",
                        "Restablecer &lt;clave&gt;", "copia y pega este enlace")
                .doesNotContain("<clave>", "tracking", "onclick");
        assertThat(BrandedEmailTemplate.paragraph(null)).doesNotContain("null");
        assertThat(BrandedEmailTemplate.detail("Motivo", "Una\rDos\nTres")).contains("Una<br>Dos<br>Tres");
    }

    @Test
    void rejectsUnsafeActionSchemesAndCredentialUrlsButAllowsLocalPreviewHttp() {
        for (String url : new String[] {"javascript:alert(1)", "data:text/html,hello", "//evil.test", "https://user:pass@vinnot.com"}) {
            assertThatThrownBy(() -> BrandedEmailTemplate.action(url, "Action"))
                    .isInstanceOf(IllegalArgumentException.class);
            assertThatThrownBy(() -> new BrandedEmailTemplate(url)).isInstanceOf(IllegalArgumentException.class);
        }
        assertThat(new BrandedEmailTemplate("http://localhost:5173").html(Language.ES, "Prueba", "", ""))
                .contains("http://localhost:5173/images/brand/mark.png");
    }
}
