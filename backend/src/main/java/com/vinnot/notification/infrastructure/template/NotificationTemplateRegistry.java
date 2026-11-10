package com.vinnot.notification.infrastructure.template;

import com.vinnot.notification.application.model.RenderedNotification;
import com.vinnot.notification.application.port.out.NotificationRendererPort;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/** Templates keyed by type and locale. Startup fails when a type has no template or two templates collide. */
@Component
public class NotificationTemplateRegistry implements NotificationRendererPort {
    private final Map<Key, NotificationTemplate> templates = new HashMap<>();

    public NotificationTemplateRegistry(List<NotificationTemplate> available) {
        for (NotificationTemplate template : available) {
            for (NotificationLocale locale : template.locales()) {
                if (Objects.nonNull(templates.putIfAbsent(new Key(template.type(), locale), template))) {
                    throw new IllegalStateException("Duplicate notification template " + template.type() + "/" + locale);
                }
            }
        }
        for (NotificationType type : NotificationType.values()) {
            if (type.emails() && templates.keySet().stream().noneMatch(key -> key.type() == type)) {
                throw new IllegalStateException("Missing notification template " + type);
            }
        }
    }

    @Override
    public RenderedNotification render(NotificationRequest request) {
        NotificationTemplate template = templates.get(new Key(request.type(), request.locale()));
        if (Objects.isNull(template)) {
            throw new IllegalStateException("No notification template " + request.type() + "/" + request.locale());
        }
        return template.render(request);
    }

    private record Key(NotificationType type, NotificationLocale locale) { }
}
