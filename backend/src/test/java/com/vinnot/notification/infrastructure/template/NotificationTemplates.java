package com.vinnot.notification.infrastructure.template;

import com.vinnot.notification.GoldenEmails;
import com.vinnot.shared.infrastructure.email.BrandedEmailTemplate;

import java.util.List;

/** Every production template, built the way Spring wires them. */
final class NotificationTemplates {
    private NotificationTemplates() { }

    static List<NotificationTemplate> all(BrandedEmailTemplate brand) {
        return all(brand, GoldenEmails.SITE);
    }

    static List<NotificationTemplate> all(BrandedEmailTemplate brand, String website) {
        var account = new AccountEmailTemplates();
        var events = new EventRegistrationTemplates();
        var payments = new PaymentEmailTemplates();
        var moderation = new ModerationEmailTemplates();
        var community = new CommunityEmailTemplates();
        var support = new SupportEmailTemplates();
        return List.of(account.emailVerificationTemplate(brand), account.passwordResetTemplate(brand),
                account.emailChangeConfirmationTemplate(brand), account.emailChangedTemplate(brand),
                account.welcomeTemplate(brand, website), account.passwordChangedTemplate(brand, website),
                account.socialLinkedTemplate(brand, website), account.accountDeactivatedTemplate(brand, website),
                account.loginLockedTemplate(brand, website),
                account.accountDeletedTemplate(brand, website), account.termsUpdatedTemplate(brand, website),
                account.accountRoleChangedTemplate(brand, website), account.accountSuspendedTemplate(brand, website),
                account.accountReinstatedTemplate(brand, website), account.accountDeletedByAdminTemplate(brand, website),
                new WineSubmissionStatusTemplate(brand), new SupportRequestTemplate(brand),
                events.eventRegistrationAttendeeTemplate(brand, website),
                events.eventRegistrationOrganizerTemplate(brand, website),
                events.eventCancelledOrganizerSummaryTemplate(brand, website),
                events.eventCancelledAttendeeTemplate(brand, website), events.eventChangedAttendeeTemplate(brand, website), events.eventReminderTemplate(brand, website), new NewsletterTemplate(brand), new ServiceNoticeTemplate(brand),
                new AnnouncementTestTemplate(brand, new NewsletterTemplate(brand), new ServiceNoticeTemplate(brand)),
                payments.paymentReceiptTemplate(brand, website), payments.paymentRefundRequestedTemplate(brand, website),
                payments.paymentRefundedTemplate(brand, website), payments.paymentChargebackTemplate(brand, website),
                payments.paymentRefundRejectedTemplate(brand, website),
                payments.paymentAccountConnectedTemplate(brand, website), payments.paymentAccountReconnectTemplate(brand, website),
                moderation.reviewPublicationDecisionTemplate(brand, website), moderation.contentRemovedTemplate(brand, website),
                moderation.reportOutcomeTemplate(brand, website), moderation.moderationQueueDigestTemplate(brand, website),
                moderation.socialBatchReadyTemplate(brand, website), moderation.socialPostFailedTemplate(brand, website),
                moderation.socialTiktokDraftWaitingTemplate(brand, website), moderation.socialAccountReconnectTemplate(brand, website),
                community.reviewCommentTemplate(brand, website), community.reviewLikesTemplate(brand, website),
                support.supportRequestReceivedTemplate(brand, website));
    }
}
