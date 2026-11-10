package com.vinnot.notification.infrastructure.push;

import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.notification.domain.model.PushContent;
import org.springframework.stereotype.Component;

import java.util.Locale;
import java.util.Map;

/**
 * A wine that matches the user's taste (#306), with why it was picked: a grape they rate highly ({@code reasonKind}
 * GRAPE, {@code reason} its name) or a wine type ({@code reasonKind} TYPE, {@code reason} the type). A tap opens it.
 */
@Component
class WineRecommendationPushTemplate extends BundlePushTemplate {
    WineRecommendationPushTemplate() {
        super(NotificationType.WINE_RECOMMENDATION, "recommendation");
    }

    @Override
    protected PushContent render(PushCopy copy, NotificationLocale locale, Map<String, String> data) {
        String reason = required(data, "reason");
        boolean byType = "TYPE".equals(required(data, "reasonKind"));
        Map<String, String> values = Map.of("wine", required(data, "wine"),
                "reason", byType ? copy.text("type." + reason.toUpperCase(Locale.ROOT), Map.of()) : reason);
        return new PushContent(copy.text("wine.title", values), copy.text(byType ? "wine.typeBody" : "wine.grapeBody", values),
                "/wines/" + required(data, "wineId"));
    }
}
