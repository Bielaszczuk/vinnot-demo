package com.vinnot.notification.domain.model;

/** Languages that notification copy can be written in. */
public enum NotificationLocale {
    ES("es"),
    EN("en");

    private final String language;

    NotificationLocale(String language) {
        this.language = language;
    }

    public String language() {
        return language;
    }

    /** English only when explicitly requested; Spanish is the product default. */
    public static NotificationLocale fromLanguage(String language) {
        return EN.language.equals(language) ? EN : ES;
    }
}
