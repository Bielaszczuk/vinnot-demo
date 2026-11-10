package com.vinnot.notification.application.model;

/**
 * How many accounts an announcement reaches (#310): by email, by push, and in total (an account reached by both
 * counts once). Delivery checks preferences and suppressions again, so a change in between can only lower it.
 */
public record AnnouncementReach(int email, int push, int accounts) {
}
