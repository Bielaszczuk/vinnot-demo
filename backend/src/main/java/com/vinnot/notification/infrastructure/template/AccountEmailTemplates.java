package com.vinnot.notification.infrastructure.template;

import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.shared.infrastructure.email.BrandedEmailTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** The account emails share one bundle per language ({@code email/account_es} and {@code email/account_en}). */
@Configuration
public class AccountEmailTemplates {
    static final String BUNDLE = "account";

    @Bean
    NotificationTemplate emailVerificationTemplate(BrandedEmailTemplate brand) {
        return new AccountLinkEmailTemplate(NotificationType.ACCOUNT_EMAIL_VERIFICATION, "verification", brand);
    }

    @Bean
    NotificationTemplate passwordResetTemplate(BrandedEmailTemplate brand) {
        return new AccountLinkEmailTemplate(NotificationType.ACCOUNT_PASSWORD_RESET, "reset", brand);
    }

    @Bean
    NotificationTemplate emailChangeConfirmationTemplate(BrandedEmailTemplate brand) {
        return new AccountLinkEmailTemplate(NotificationType.ACCOUNT_EMAIL_CHANGE_CONFIRMATION, "emailChange", brand);
    }

    @Bean
    NotificationTemplate emailChangedTemplate(BrandedEmailTemplate brand) {
        return new AccountEmailChangedTemplate(brand);
    }

    @Bean
    NotificationTemplate passwordChangedTemplate(BrandedEmailTemplate brand, @Value("${app.auth.frontend-base-url}") String website) {
        return new AccountSecurityNoticeTemplate(NotificationType.ACCOUNT_PASSWORD_CHANGED, "passwordChanged", brand, website);
    }

    @Bean
    NotificationTemplate socialLinkedTemplate(BrandedEmailTemplate brand, @Value("${app.auth.frontend-base-url}") String website) {
        return new AccountSecurityNoticeTemplate(NotificationType.ACCOUNT_SOCIAL_LINKED, "socialLinked", brand, website);
    }

    @Bean
    NotificationTemplate accountDeactivatedTemplate(BrandedEmailTemplate brand, @Value("${app.auth.frontend-base-url}") String website) {
        return new AccountSecurityNoticeTemplate(NotificationType.ACCOUNT_DEACTIVATED, "accountDeactivated", brand, website);
    }

    @Bean
    NotificationTemplate loginLockedTemplate(BrandedEmailTemplate brand, @Value("${app.auth.frontend-base-url}") String website) {
        return new AccountSecurityNoticeTemplate(NotificationType.ACCOUNT_LOGIN_LOCKED, "loginLocked", brand, website);
    }

    @Bean
    NotificationTemplate accountDeletedTemplate(BrandedEmailTemplate brand, @Value("${app.auth.frontend-base-url}") String website) {
        return new AccountSecurityNoticeTemplate(NotificationType.ACCOUNT_DELETED, "accountDeleted", brand, website);
    }

    @Bean
    NotificationTemplate welcomeTemplate(BrandedEmailTemplate brand, @Value("${app.auth.frontend-base-url}") String website) {
        return new WelcomeEmailTemplate(brand, website);
    }

    @Bean
    NotificationTemplate termsUpdatedTemplate(BrandedEmailTemplate brand, @Value("${app.auth.frontend-base-url}") String website) {
        return new TermsUpdatedTemplate(brand, website);
    }

    @Bean
    NotificationTemplate accountRoleChangedTemplate(BrandedEmailTemplate brand, @Value("${app.auth.frontend-base-url}") String website) {
        return new AccountAdministrationNoticeTemplate(NotificationType.ACCOUNT_ROLE_CHANGED, "roleChanged", brand, website);
    }

    @Bean
    NotificationTemplate accountSuspendedTemplate(BrandedEmailTemplate brand, @Value("${app.auth.frontend-base-url}") String website) {
        return new AccountAdministrationNoticeTemplate(NotificationType.ACCOUNT_SUSPENDED, "suspended", brand, website);
    }

    @Bean
    NotificationTemplate accountReinstatedTemplate(BrandedEmailTemplate brand, @Value("${app.auth.frontend-base-url}") String website) {
        return new AccountAdministrationNoticeTemplate(NotificationType.ACCOUNT_REINSTATED, "reinstated", brand, website);
    }

    @Bean
    NotificationTemplate accountDeletedByAdminTemplate(BrandedEmailTemplate brand, @Value("${app.auth.frontend-base-url}") String website) {
        return new AccountAdministrationNoticeTemplate(NotificationType.ACCOUNT_DELETED_BY_ADMIN, "deleted", brand, website);
    }
}
