package com.vinnot.notification.application.model;

/** What one recipient would get (#310): the branded email and the push text. */
public record AnnouncementPreview(String subject, String html, String text, String pushTitle, String pushBody) {
}
