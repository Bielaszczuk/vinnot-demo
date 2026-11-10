package com.vinnot.notification.infrastructure.template;

import com.vinnot.notification.GoldenEmails;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRecipient;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class ReviewPublicationDecisionTemplateTest {
    private static final String WINE = "11111111-2222-3333-4444-555555555555";
    private final NotificationTemplate template = new ModerationEmailTemplates()
            .reviewPublicationDecisionTemplate(GoldenEmails.brand(), GoldenEmails.SITE + "/");

    @Test
    void anApprovalTellsTheAuthorItIsPublishedAndLinksToTheWine() {
        var rendered = template.render(request(NotificationLocale.ES, Map.of("kind", "REVIEW", "status", "APPROVED")));

        assertThat(rendered.subject()).isEqualTo("Tu reseña ya está publicada");
        assertThat(rendered.text()).contains("Revisamos tu reseña de Gran <Malbec> y ya está visible para la comunidad.",
                "Ver el vino: " + GoldenEmails.SITE + "/wines/" + WINE).doesNotContain("Motivo");
        assertThat(rendered.html()).contains("Gran &lt;Malbec&gt;");
        assertThat(template.type()).isEqualTo(NotificationType.REVIEW_PUBLICATION_DECISION);
        assertThat(template.locales()).containsExactlyInAnyOrder(NotificationLocale.ES, NotificationLocale.EN);
    }

    @Test
    void aRejectionNamesThePresetReasonAndOnlyOtherCarriesTheModeratorsNote() {
        var spam = template.render(request(NotificationLocale.EN,
                Map.of("kind", "COMMENT", "status", "REJECTED", "reasonCode", "SPAM")));
        assertThat(spam.subject()).isEqualTo("Your comment was not published");
        assertThat(spam.text()).contains("Reason: It appears to be spam or promotional content.",
                "View the community guidelines: " + GoldenEmails.SITE + "/content-policy").doesNotContain("Details");

        var other = template.render(request(NotificationLocale.ES,
                Map.of("kind", "REVIEW", "status", "REJECTED", "reasonCode", "OTHER", "note", "Repetiste la misma reseña.")));
        assertThat(other.text()).contains("Motivo: No cumple las normas de la comunidad.", "Detalle: Repetiste la misma reseña.");

        var unknown = template.render(request(NotificationLocale.ES,
                Map.of("kind", "REVIEW", "status", "REJECTED", "reasonCode", "LEGACY")));
        assertThat(unknown.text()).contains("Motivo: No cumple las normas de la comunidad.");
        var noCode = template.render(request(NotificationLocale.ES, Map.of("kind", "REVIEW", "status", "REJECTED", "note", " ")));
        assertThat(noCode.text()).contains("Motivo: No cumple las normas de la comunidad.").doesNotContain("Detalle");
    }

    private static NotificationRequest request(NotificationLocale locale, Map<String, String> values) {
        Map<String, String> data = new HashMap<>(values);
        data.put("wineId", WINE);
        data.put("wineName", "Gran <Malbec>");
        return NotificationRequest.of(NotificationType.REVIEW_PUBLICATION_DECISION,
                NotificationRecipient.user(UUID.fromString(WINE)), locale, data, "review-publication:1");
    }
}
