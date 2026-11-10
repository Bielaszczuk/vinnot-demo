package com.vinnot.user.application.service;

import com.vinnot.user.domain.valueobject.SecurityEventType;
import com.vinnot.notification.application.port.in.ManagePushDevicesUseCase;
import com.vinnot.shared.application.port.AutomatedAccountSuspensionPort;
import com.vinnot.user.application.port.out.UserRepositoryPort;
import com.vinnot.user.domain.model.User;
import com.vinnot.user.domain.valueobject.Role;
import com.vinnot.user.domain.valueobject.SuspensionReason;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Applies the same permanent lock as an administrative suspension when abuse
 * detection flags an account (#431). An administrator lifts it from the panel.
 */
@Service
@RequiredArgsConstructor
public class AutomatedAccountSuspensionService implements AutomatedAccountSuspensionPort {

    static final String CATALOG_SCRAPING_NOTE = "Automatic suspension: daily catalog quota exceeded";

    private final UserRepositoryPort users;
    private final AccountAdministrationNoticeService notices;
    private final ManagePushDevicesUseCase pushDevices;
    private final SecurityEventRecorder securityEvents;

    @Override
    @Transactional
    public void suspendForCatalogScraping(UUID userId) {
        users.findById(userId)
                .filter(user -> !user.isLocked())
                .filter(user -> !user.hasRole(Role.ADMIN) && !user.hasRole(Role.MODERATOR))
                .ifPresent(this::suspend);
    }

    private void suspend(User user) {
        user.lock(SuspensionReason.TERMS_VIOLATION.name() + ": " + CATALOG_SCRAPING_NOTE);
        users.save(user);
        pushDevices.forgetUser(user.getId());
        notices.suspended(user, SuspensionReason.TERMS_VIOLATION, null);
        securityEvents.record(SecurityEventType.ACCOUNT_AUTO_SUSPENDED, user.getId());
    }
}
