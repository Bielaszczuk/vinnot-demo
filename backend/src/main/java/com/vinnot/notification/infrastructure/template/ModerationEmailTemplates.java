package com.vinnot.notification.infrastructure.template;

import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.shared.infrastructure.email.BrandedEmailTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Moderation emails (#307): outcomes for authors and reporters, and the moderation team's queue digest. */
@Configuration
public class ModerationEmailTemplates {
    @Bean
    NotificationTemplate reviewPublicationDecisionTemplate(BrandedEmailTemplate brand,
            @Value("${app.auth.frontend-base-url}") String website) {
        return new ReviewPublicationDecisionTemplate(brand, website);
    }

    @Bean
    NotificationTemplate contentRemovedTemplate(BrandedEmailTemplate brand,
            @Value("${app.auth.frontend-base-url}") String website) {
        return new ContentRemovedTemplate(brand, website);
    }

    @Bean
    NotificationTemplate reportOutcomeTemplate(BrandedEmailTemplate brand,
            @Value("${app.auth.frontend-base-url}") String website) {
        return new ReportOutcomeTemplate(brand, website);
    }

    @Bean
    NotificationTemplate moderationQueueDigestTemplate(BrandedEmailTemplate brand,
            @Value("${app.auth.frontend-base-url}") String website) {
        return new ModerationQueueDigestTemplate(brand, website);
    }

    /** The social media agent's batch notice (#489) belongs with the staff alerts: every test context that imports them gets it. */
    @Bean
    NotificationTemplate socialBatchReadyTemplate(BrandedEmailTemplate brand,
            @Value("${app.auth.frontend-base-url}") String website) {
        return new SocialBatchReadyTemplate(brand, website);
    }

    /** A social post failed for good (#510); an administrators' alert like the batch notice. */
    @Bean
    NotificationTemplate socialPostFailedTemplate(BrandedEmailTemplate brand, @Value("${app.auth.frontend-base-url}") String website) {
        return new SocialPublishingNoticeTemplate(NotificationType.SOCIAL_POST_FAILED, "failed", brand, website);
    }

    /** A TikTok draft waits in the inbox to be published by hand (#510). */
    @Bean
    NotificationTemplate socialTiktokDraftWaitingTemplate(BrandedEmailTemplate brand,
            @Value("${app.auth.frontend-base-url}") String website) {
        return new SocialPublishingNoticeTemplate(NotificationType.SOCIAL_TIKTOK_DRAFT_WAITING, "draft", brand, website);
    }

    /** A connected social account must be connected again (#510). */
    @Bean
    NotificationTemplate socialAccountReconnectTemplate(BrandedEmailTemplate brand,
            @Value("${app.auth.frontend-base-url}") String website) {
        return new SocialPublishingNoticeTemplate(NotificationType.SOCIAL_ACCOUNT_RECONNECT, "reconnect", brand, website);
    }
}
