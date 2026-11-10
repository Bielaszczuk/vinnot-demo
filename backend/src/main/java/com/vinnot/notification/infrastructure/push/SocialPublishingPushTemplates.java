package com.vinnot.notification.infrastructure.push;

import com.vinnot.notification.domain.model.NotificationType;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** The pushes of the social publishing notices (#510), one per notice type. */
@Configuration
public class SocialPublishingPushTemplates {

    @Bean
    PushTemplate socialPostFailedPushTemplate() {
        return new SocialPublishingPushTemplate(NotificationType.SOCIAL_POST_FAILED, "failed");
    }

    @Bean
    PushTemplate socialTiktokDraftWaitingPushTemplate() {
        return new SocialPublishingPushTemplate(NotificationType.SOCIAL_TIKTOK_DRAFT_WAITING, "draft");
    }

    @Bean
    PushTemplate socialAccountReconnectPushTemplate() {
        return new SocialPublishingPushTemplate(NotificationType.SOCIAL_ACCOUNT_RECONNECT, "reconnect");
    }
}
