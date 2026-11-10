package com.vinnot.shared.infrastructure.email;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.web.util.HtmlUtils;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.Objects;
import java.util.regex.Pattern;
import java.util.regex.Matcher;

/** Email-only presentation at the infrastructure edge. Never accepts user HTML. */
@Component
public class BrandedEmailTemplate {
    private static final Pattern PLACEHOLDER = Pattern.compile("\\{\\{([a-zA-Z]+)}}");
    private final String website;
    private final String template;

    public BrandedEmailTemplate(@Value("${app.auth.frontend-base-url}") String website) {
        this.website = requireWebUrl(website).replaceAll("/+$", "");
        try (var input = new ClassPathResource("email/branded-message.html").getInputStream()) {
            template = new String(input.readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException exception) {
            throw new UncheckedIOException("Cannot load the transactional email template", exception);
        }
    }

    public enum Language { ES, EN }

    /** bodyHtml is composed only from escaped fragments by the sending adapters. */
    public String html(Language language, String title, String preheader, String bodyHtml) {
        return html(language, title, preheader, bodyHtml, null);
    }

    /**
     * Promotional layout: the footer says why the email arrived and links to a one-click unsubscribe page,
     * so it never looks like the transactional footer.
     */
    public String promotionalHtml(Language language, String title, String preheader, String bodyHtml,
            String unsubscribeUrl) {
        return html(language, title, preheader, bodyHtml, Objects.requireNonNull(unsubscribeUrl, "Unsubscribe URL"));
    }

    public String promotionalText(Language language, String body, String unsubscribeUrl) {
        boolean spanish = language == Language.ES;
        return text(language, body) + (spanish ? PROMOTIONAL_FOOTER_ES : PROMOTIONAL_FOOTER_EN) + "\n"
                + (spanish ? "Darte de baja: " : "Unsubscribe: ") + requireWebUrl(unsubscribeUrl) + "\n";
    }

    private static final String PROMOTIONAL_FOOTER_ES = "Recibís este correo porque aceptaste recibir novedades de Vinnot.";
    private static final String PROMOTIONAL_FOOTER_EN = "You receive this email because you agreed to receive news from Vinnot.";

    private String html(Language language, String title, String preheader, String bodyHtml, String unsubscribeUrl) {
        boolean spanish = language == Language.ES;
        boolean promotional = Objects.nonNull(unsubscribeUrl);
        String footerAction = promotional
                ? " <a href=\"" + escape(requireWebUrl(unsubscribeUrl)) + "\" style=\"color:#8d2349;text-decoration:underline;\">"
                        + (spanish ? "Darte de baja" : "Unsubscribe") + "</a>"
                : "";
        Map<String, String> values = Map.ofEntries(
                Map.entry("language", spanish ? "es" : "en"),
                Map.entry("title", escape(title)),
                Map.entry("preheader", escape(preheader)),
                Map.entry("body", bodyHtml),
                Map.entry("website", escape(website)),
                Map.entry("logoMark", escape(website + "/images/brand/mark.png")),
                Map.entry("logoWordmark", escape(website + "/images/brand/wordmark.png")),
                Map.entry("hero", escape(website + "/images/email/winery-v1.png")),
                Map.entry("heroAlt", spanish ? "Viñedos entre montañas" : "Vineyards among mountains"),
                Map.entry("banner", spanish ? "TU MUNDO DEL VINO" : "YOUR WORLD OF WINE"),
                Map.entry("visit", spanish ? "Visitar Vinnot" : "Visit Vinnot"),
                Map.entry("contact", spanish ? "Contacto" : "Contact"),
                Map.entry("privacy", spanish ? "Privacidad" : "Privacy"),
                Map.entry("footer", promotional
                        ? (spanish ? PROMOTIONAL_FOOTER_ES : PROMOTIONAL_FOOTER_EN)
                        : spanish
                        ? "Este correo está relacionado con tu cuenta o actividad en Vinnot."
                        : "This email relates to your account or activity on Vinnot."),
                Map.entry("footerAction", footerAction));
        // One pass: user text resembling a placeholder cannot change the template.
        return PLACEHOLDER.matcher(template).replaceAll(match ->
                Matcher.quoteReplacement(Objects.requireNonNull(values.get(match.group(1)))));
    }

    public String text(Language language, String body) {
        boolean spanish = language == Language.ES;
        return body + "\n\n---\nVinnot\n"
                + (spanish ? "Visitar Vinnot: " : "Visit Vinnot: ") + website + "\n"
                + (spanish ? "Contacto: " : "Contact: ") + website + "/contact\n"
                + (spanish ? "Privacidad: " : "Privacy: ") + website + "/privacy\n";
    }

    public static String paragraph(String value) {
        return "<p style=\"margin:0 0 20px;color:#514951;font-size:16px;line-height:26px;overflow-wrap:anywhere;word-break:break-word;\">"
                + escape(value).replace("\r\n", "\n").replace("\r", "\n").replace("\n", "<br>") + "</p>";
    }

    /** A section heading inside the body. */
    public static String heading(String value) {
        return "<h2 style=\"margin:8px 0 16px;color:#382b33;font-size:21px;line-height:29px;font-weight:bold;"
                + "overflow-wrap:anywhere;word-break:break-word;\">" + escape(value) + "</h2>";
    }

    /**
     * A paragraph of rich text. {@code safeHtml} must be built only from {@link #inlineText}, {@link #bold} and
     * {@link #link}, which escape everything they are given.
     */
    public static String richParagraph(String safeHtml) {
        return "<p style=\"margin:0 0 20px;color:#514951;font-size:16px;line-height:26px;overflow-wrap:anywhere;word-break:break-word;\">"
                + safeHtml + "</p>";
    }

    /** Escaped text for {@link #richParagraph}; line breaks are kept. */
    public static String inlineText(String value) {
        return escape(value).replace("\r\n", "\n").replace("\r", "\n").replace("\n", "<br>");
    }

    public static String bold(String value) {
        return "<strong style=\"color:#382b33;\">" + inlineText(value) + "</strong>";
    }

    public static String link(String url, String label) {
        return "<a href=\"" + escape(requireWebUrl(url)) + "\" style=\"color:#8d2349;text-decoration:underline;\">"
                + inlineText(label) + "</a>";
    }

    public static String detail(String label, String value) {
        return "<p style=\"margin:0 0 16px;padding:16px;background-color:#faf3f5;color:#514951;font-size:15px;line-height:24px;overflow-wrap:anywhere;word-break:break-word;\">"
                + "<strong style=\"color:#382b33;\">" + escape(label) + "</strong><br>"
                + escape(value).replace("\r\n", "\n").replace("\r", "\n").replace("\n", "<br>") + "</p>";
    }

    public static String action(String url, String label) {
        return action(url, label, Language.ES);
    }

    public static String action(String url, String label, Language language) {
        String safeUrl = escape(requireWebUrl(url));
        return "<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"margin:28px 0;\"><tr>"
                + "<td align=\"center\" bgcolor=\"#a32955\" style=\"border-radius:8px;mso-padding-alt:16px 28px;\">"
                + "<a href=\"" + safeUrl + "\" style=\"display:inline-block;background-color:#a32955;border:1px solid #a32955;"
                + "border-radius:8px;padding:16px 28px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;"
                + "line-height:20px;text-align:center;text-decoration:none;color:#ffffff;\">" + escape(label) + "</a></td></tr></table>"
                + paragraph(language == Language.ES ? "Si el botón no funciona, copia y pega este enlace en tu navegador:" : "If the button does not work, copy and paste this link into your browser:")
                + "<p style=\"margin:0 0 24px;font-size:13px;line-height:22px;word-break:break-all;overflow-wrap:anywhere;\">"
                + "<a href=\"" + safeUrl + "\" style=\"color:#8d2349;text-decoration:underline;word-break:break-all;\">"
                + safeUrl + "</a></p>";
    }

    public static String escape(String value) {
        return HtmlUtils.htmlEscape(Objects.requireNonNullElse(value, ""), "UTF-8");
    }

    private static String requireWebUrl(String value) {
        URI uri = URI.create(Objects.requireNonNull(value));
        if (!("https".equals(uri.getScheme()) || "http".equals(uri.getScheme()))
                || Objects.isNull(uri.getHost()) || Objects.nonNull(uri.getUserInfo())) {
            throw new IllegalArgumentException("Email links require an absolute HTTP(S) URL without credentials");
        }
        return value;
    }
}
