package com.vinnot.notification.infrastructure.push;

import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.notification.domain.model.PushContent;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;

/**
 * Copy of the engagement pushes (#405), from the {@code push/engagement} bundle: short, warm and professional, with
 * the content's own name and a tap that opens it. Data keys are the ones the engagement planner fills; optional ones
 * switch to a variant without them, so a push is never rendered with a gap.
 */
@Configuration
public class EngagementPushTemplates {
    static final String BUNDLE = "engagement";

    @Bean
    PushTemplate tastePickPushTemplate() {
        return new EngagementPushTemplate(NotificationType.TASTE_PICK, (copy, data) -> {
            boolean byType = "TYPE".equals(BundlePushTemplate.required(data, "reasonKind"));
            String reason = BundlePushTemplate.required(data, "reason");
            String typeKey = "type." + reason.toUpperCase(Locale.ROOT);
            String shown = !byType ? reason : copy.has(typeKey) ? copy.text(typeKey, Map.of()) : reason.toLowerCase(Locale.ROOT);
            Map<String, String> values = Map.of("wine", BundlePushTemplate.required(data, "wine"), "reason", shown);
            return new PushContent(copy.text("taste.title", values),
                    copy.text(byType ? "taste.typeBody" : "taste.grapeBody", values), wine(data));
        });
    }

    @Bean
    PushTemplate routePickPushTemplate() {
        return new EngagementPushTemplate(NotificationType.ROUTE_PICK, (copy, data) -> {
            Map<String, String> values = withOptional(Map.of("route", BundlePushTemplate.required(data, "route")),
                    "region", data.get("region"));
            return new PushContent(copy.text("route.title", values),
                    copy.text(values.containsKey("region") ? "route.regionBody" : "route.body", values),
                    "/routes/" + BundlePushTemplate.required(data, "routeId"));
        });
    }

    @Bean
    PushTemplate viewedNotRatedPushTemplate() {
        return new EngagementPushTemplate(NotificationType.VIEWED_NOT_RATED, (copy, data) -> BundlePushTemplate.content(copy,
                "viewed", Map.of("wine", BundlePushTemplate.required(data, "wine")), wine(data)));
    }

    @Bean
    PushTemplate cellarCheckinPushTemplate() {
        return new EngagementPushTemplate(NotificationType.CELLAR_CHECKIN, (copy, data) -> BundlePushTemplate.content(copy,
                "cellar", Map.of("wine", BundlePushTemplate.required(data, "wine")), wine(data)));
    }

    @Bean
    PushTemplate weekendEventsPushTemplate() {
        return new EngagementPushTemplate(NotificationType.WEEKEND_EVENTS, (copy, data) -> {
            String count = BundlePushTemplate.required(data, "count");
            Map<String, String> values = Map.of("event", BundlePushTemplate.required(data, "event"), "count", count);
            boolean one = "1".equals(count);
            String eventId = data.get("eventId");
            return new PushContent(copy.text("weekend.title", values), copy.text(one ? "weekend.oneBody" : "weekend.manyBody", values),
                    one && Objects.nonNull(eventId) ? "/events/" + eventId : "/events");
        });
    }

    @Bean
    PushTemplate wineryPickPushTemplate() {
        return new EngagementPushTemplate(NotificationType.WINERY_PICK, (copy, data) -> {
            Map<String, String> values = withOptional(Map.of("winery", BundlePushTemplate.required(data, "winery")),
                    "region", data.get("region"));
            return new PushContent(copy.text("winery.title", values),
                    copy.text(values.containsKey("region") ? "winery.regionBody" : "winery.body", values),
                    "/wineries/" + BundlePushTemplate.required(data, "wineryId"));
        });
    }

    @Bean
    PushTemplate onboardingPushTemplate() {
        return new EngagementPushTemplate(NotificationType.ONBOARDING, (copy, data) -> {
            String step = BundlePushTemplate.required(data, "step");
            String wine = data.get("wine");
            if ("3".equals(step) && Objects.nonNull(wine) && Objects.nonNull(data.get("wineId"))) {
                return BundlePushTemplate.content(copy, "onboarding.3", Map.of("wine", wine), wine(data));
            }
            String key = "3".equals(step) ? "onboarding.3.plain" : "onboarding." + ("2".equals(step) ? "2" : "1");
            return BundlePushTemplate.content(copy, key, Map.of(), "/wines");
        });
    }

    @Bean
    PushTemplate winbackPushTemplate() {
        return new EngagementPushTemplate(NotificationType.WINBACK, (copy, data) -> {
            if ("2".equals(BundlePushTemplate.required(data, "attempt"))) {
                String count = data.get("count");
                boolean counted = Objects.nonNull(count) && !"0".equals(count);
                return BundlePushTemplate.content(copy, counted ? "winback.2" : "winback.2.plain",
                        counted ? Map.of("count", count) : Map.of(), "/wines");
            }
            String wine = data.get("wine");
            return Objects.nonNull(wine) && Objects.nonNull(data.get("wineId"))
                    ? BundlePushTemplate.content(copy, "winback.1", Map.of("wine", wine), wine(data))
                    : BundlePushTemplate.content(copy, "winback.1.plain", Map.of(), "/wines");
        });
    }

    @Bean
    PushTemplate milestonePushTemplate() {
        return new EngagementPushTemplate(NotificationType.MILESTONE, (copy, data) -> {
            boolean likes = "LIKES".equals(BundlePushTemplate.required(data, "kind"));
            String wineId = data.get("wineId");
            return BundlePushTemplate.content(copy, likes ? "milestone.likes" : "milestone.rated",
                    Map.of("count", BundlePushTemplate.required(data, "count")),
                    likes && Objects.nonNull(wineId) ? "/wines/" + wineId : "/wines");
        });
    }

    @Bean
    PushTemplate postEventPushTemplate() {
        return new EngagementPushTemplate(NotificationType.POST_EVENT, (copy, data) -> BundlePushTemplate.content(copy,
                "postEvent", Map.of("event", BundlePushTemplate.required(data, "event")),
                "/events/" + BundlePushTemplate.required(data, "eventId")));
    }

    private static String wine(Map<String, String> data) {
        return "/wines/" + BundlePushTemplate.required(data, "wineId");
    }

    private static Map<String, String> withOptional(Map<String, String> values, String key, String value) {
        if (Objects.isNull(value) || value.isBlank()) {
            return values;
        }
        Map<String, String> extended = new HashMap<>(values);
        extended.put(key, value);
        return extended;
    }

    /** How one engagement type turns its data into copy. */
    @FunctionalInterface
    interface Renderer {
        PushContent render(PushCopy copy, Map<String, String> data);
    }

    static final class EngagementPushTemplate extends BundlePushTemplate {
        private final Renderer renderer;

        EngagementPushTemplate(NotificationType type, Renderer renderer) {
            super(type, BUNDLE);
            this.renderer = renderer;
        }

        @Override
        protected PushContent render(PushCopy copy, NotificationLocale locale, Map<String, String> data) {
            return renderer.render(copy, data);
        }
    }
}
