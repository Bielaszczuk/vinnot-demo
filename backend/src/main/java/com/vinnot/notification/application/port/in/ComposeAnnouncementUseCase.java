package com.vinnot.notification.application.port.in;

import com.vinnot.notification.application.model.AnnouncementPreview;
import com.vinnot.notification.application.model.AnnouncementReach;
import com.vinnot.notification.domain.model.Announcement;
import com.vinnot.notification.domain.model.AnnouncementContent;
import com.vinnot.notification.domain.model.AnnouncementKind;
import com.vinnot.notification.domain.model.NotificationLocale;

import java.util.UUID;

/** Writing administrators' manual announcements (#310): previewing them and testing them on one's own account. */
public interface ComposeAnnouncementUseCase {
    /** Renders the announcement as the administrator would receive it; nothing is sent or stored. */
    AnnouncementPreview preview(AnnouncementKind kind, NotificationLocale locale, AnnouncementContent content, UUID adminId);

    /**
     * Sends every written version to the administrator only, on the announcement's channels (push only when they
     * have a device; email only when their address is not suppressed), marked as a test. Returns what the test
     * reached; a test that would reach nothing is refused.
     */
    AnnouncementReach sendTest(Announcement announcement, UUID adminId);
}
