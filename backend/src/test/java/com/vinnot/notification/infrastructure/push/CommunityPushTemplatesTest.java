package com.vinnot.notification.infrastructure.push;

import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.notification.domain.model.PushContent;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class CommunityPushTemplatesTest {
    private static final String WINE = "11111111-2222-3333-4444-555555555555";

    @Test
    void aCommentPushNamesTheCommenterAndOpensTheWine() {
        var template = new ReviewCommentPushTemplate();
        Map<String, String> data = Map.of("commenter", "Lucía Pérez", "wineId", WINE, "wineName", "Gran Malbec");
        assertThat(template.render(NotificationLocale.ES, data)).isEqualTo(new PushContent("Nuevo comentario",
                "Lucía Pérez comentó tu reseña de Gran Malbec.", "/wines/" + WINE));
        assertThat(template.render(NotificationLocale.EN, data).body()).isEqualTo("Lucía Pérez commented on your review of Gran Malbec.");
        assertThat(template.type()).isEqualTo(NotificationType.REVIEW_COMMENT);
    }

    @Test
    void theDailyLikesPushNamesOneLikerAndCountsSeveral() {
        var template = new ReviewLikesPushTemplate();
        assertThat(template.render(NotificationLocale.ES, Map.of("likes", "1", "reviews", "1", "wineId", WINE,
                "wineName", "Gran Malbec", "liker", "Carla Ruiz"))).isEqualTo(new PushContent("Nuevo me gusta",
                "A Carla Ruiz le gustó tu reseña de Gran Malbec.", "/wines/" + WINE));
        assertThat(template.render(NotificationLocale.ES, Map.of("likes", "4", "reviews", "1", "wineId", WINE,
                "wineName", "Gran Malbec"))).isEqualTo(new PushContent("Nuevos me gusta",
                "Tu reseña de Gran Malbec sumó 4 me gusta hoy.", "/wines/" + WINE));
        assertThat(template.render(NotificationLocale.EN, Map.of("likes", "6", "reviews", "3", "wineId", WINE,
                "wineName", "Gran Malbec")).body()).isEqualTo("Your reviews got 6 likes today. Most liked: Gran Malbec.");
        assertThat(template.render(NotificationLocale.EN, Map.of("likes", "1", "reviews", "1", "wineId", WINE,
                "wineName", "Gran Malbec", "liker", "Carla")).title()).isEqualTo("New like");
        assertThat(template.type()).isEqualTo(NotificationType.REVIEW_LIKES_DAILY);
    }
}
