package com.vinnot.notification.infrastructure.push;

import com.vinnot.notification.application.port.out.PushRendererPort;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.notification.domain.model.PushContent;
import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/** Only types that push have a push template; pushing any other type is a programming error. */
@Component
public class PushTemplateRegistry implements PushRendererPort {
    private final Map<NotificationType, PushTemplate> templates = new EnumMap<>(NotificationType.class);

    public PushTemplateRegistry(List<PushTemplate> templates) {
        for (PushTemplate template : templates) {
            if (Objects.nonNull(this.templates.put(template.type(), template))) {
                throw new IllegalStateException("Duplicate push template for " + template.type());
            }
        }
    }

    @Override
    public PushContent render(NotificationType type, NotificationLocale locale, Map<String, String> data) {
        PushTemplate template = templates.get(type);
        if (Objects.isNull(template)) {
            throw new IllegalStateException("No push template for " + type);
        }
        return template.render(locale, data);
    }

    @Override
    public Set<NotificationType> types() {
        return Set.copyOf(templates.keySet());
    }
}
