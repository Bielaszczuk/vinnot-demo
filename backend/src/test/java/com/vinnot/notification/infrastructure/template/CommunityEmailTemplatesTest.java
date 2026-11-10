package com.vinnot.notification.infrastructure.template;

import com.vinnot.notification.GoldenEmails;
import com.vinnot.notification.application.model.RenderedNotification;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRecipient;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class CommunityEmailTemplatesTest {
    private static final String WINE = "11111111-2222-3333-4444-555555555555";
    private final NotificationTemplate comment = new CommunityEmailTemplates()
            .reviewCommentTemplate(GoldenEmails.brand(), GoldenEmails.SITE + "/");

    @Test
    void theAuthorLearnsWhoCommentedAndOpensTheWine() {
        RenderedNotification spanish = comment.render(request(NotificationLocale.ES, "<Lucía> & Pérez"));
        assertThat(spanish.subject()).isEqualTo("<Lucía> & Pérez comentó tu reseña");
        assertThat(spanish.text()).contains("<Lucía> & Pérez comentó tu reseña de Gran Malbec.",
                "Ver la conversación: " + GoldenEmails.SITE + "/wines/" + WINE, "preferencias de notificaciones");
        assertThat(spanish.html()).contains("&lt;Lucía&gt; &amp; Pérez").doesNotContain("<Lucía>");

        RenderedNotification english = comment.render(request(NotificationLocale.EN, "Lucía"));
        assertThat(english.subject()).isEqualTo("Lucía commented on your review");
        assertThat(english.text()).contains("Lucía commented on your review of Gran Malbec.", "View the conversation");
        assertThat(comment.type()).isEqualTo(NotificationType.REVIEW_COMMENT);
        assertThat(comment.locales()).containsExactlyInAnyOrder(NotificationLocale.ES, NotificationLocale.EN);
    }

    @Test
    void theWeeklyLikesEmailNamesOneLikerAndCountsSeveral() {
        NotificationTemplate likes = new CommunityEmailTemplates().reviewLikesTemplate(GoldenEmails.brand(), GoldenEmails.SITE);
        RenderedNotification one = likes.render(likes(NotificationLocale.ES, Map.of("likes", "1", "reviews", "1", "liker", "Carla Ruiz")));
        assertThat(one.subject()).isEqualTo("A Carla Ruiz le gustó tu reseña");
        assertThat(one.text()).contains("Esta semana, a Carla Ruiz le gustó tu reseña de Gran Malbec.",
                "Ver la reseña: " + GoldenEmails.SITE + "/wines/" + WINE);

        RenderedNotification review = likes.render(likes(NotificationLocale.ES, Map.of("likes", "4", "reviews", "1")));
        assertThat(review.subject()).isEqualTo("Tu reseña sumó 4 me gusta esta semana");
        assertThat(review.text()).contains("Esta semana, tu reseña de Gran Malbec sumó 4 me gusta.");

        RenderedNotification reviews = likes.render(likes(NotificationLocale.EN, Map.of("likes", "9", "reviews", "3")));
        assertThat(reviews.subject()).isEqualTo("Your reviews got 9 likes this week");
        assertThat(reviews.text()).contains("The most liked was your review of Gran Malbec.", "View the review");
        assertThat(likes.type()).isEqualTo(NotificationType.REVIEW_LIKES_WEEKLY);
    }

    private static NotificationRequest likes(NotificationLocale locale, Map<String, String> counts) {
        Map<String, String> data = new HashMap<>(counts);
        data.put("wineId", WINE);
        data.put("wineName", "Gran Malbec");
        return NotificationRequest.of(NotificationType.REVIEW_LIKES_WEEKLY, NotificationRecipient.user(UUID.randomUUID()), locale,
                data, "review-likes:1");
    }

    private static NotificationRequest request(NotificationLocale locale, String commenter) {
        return NotificationRequest.of(NotificationType.REVIEW_COMMENT, NotificationRecipient.user(UUID.randomUUID()), locale,
                Map.of("commenter", commenter, "wineId", WINE, "wineName", "Gran Malbec"), "review-comment:1");
    }
}
