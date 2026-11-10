package com.vinnot.notification.infrastructure.push;

import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.notification.domain.model.PushContent;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class AnnouncementPushTemplatesTest {
    private final AnnouncementPushTemplates templates = new AnnouncementPushTemplates();

    @Test
    void theTitleAndTheParagraphsWithoutAddressesBecomeThePush() {
        PushContent push = templates.newsletterPushTemplate().render(NotificationLocale.ES, Map.of(
                NotificationType.SUBJECT, "Vendimia",
                NotificationType.BODY, "## Ignored heading\nCatas **todo el mes** en [la agenda](https://vinnot.com/events).",
                NotificationType.ROUTE, "/events"));

        assertThat(push).isEqualTo(new PushContent("Vendimia", "Catas todo el mes en la agenda.", "/events"));
        assertThat(templates.newsletterPushTemplate().type()).isEqualTo(NotificationType.NEWSLETTER);
    }

    @Test
    void withoutARouteItOpensTheAppAndABodyOfOnlyAButtonStillHasText() {
        PushContent push = templates.serviceNoticePushTemplate().render(NotificationLocale.EN, Map.of(
                NotificationType.SUBJECT, "Maintenance", NotificationType.BODY, "[[Status]](https://status.vinnot.com)"));

        assertThat(push.route()).isEqualTo("/");
        assertThat(push.body()).isEqualTo("Status: https://status.vinnot.com");
        assertThat(templates.serviceNoticePushTemplate().type()).isEqualTo(NotificationType.SERVICE_NOTICE);
    }

    @Test
    void aTestPushMarksItsTitleInTheDeviceLanguage() {
        Map<String, String> data = Map.of(NotificationType.KIND, "NEWS", NotificationType.SUBJECT, "Vendimia",
                NotificationType.BODY, "Catas todo el mes.", NotificationType.ROUTE, "/wines");

        assertThat(templates.announcementTestPushTemplate().render(NotificationLocale.ES, data))
                .isEqualTo(new PushContent("[Prueba] Vendimia", "Catas todo el mes.", "/wines"));
        assertThat(templates.announcementTestPushTemplate().render(NotificationLocale.EN, data).title()).isEqualTo("[Test] Vendimia");
        assertThat(templates.announcementTestPushTemplate().type()).isEqualTo(NotificationType.ANNOUNCEMENT_TEST);
    }
}
