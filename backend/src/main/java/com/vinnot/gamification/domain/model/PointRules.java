package com.vinnot.gamification.domain.model;

import java.util.Objects;

/** The rules of the points system (#455) that other modules apply before asking for an award. */
public final class PointRules {
    /** Global points per day in the member's time zone; approved wine submissions are outside it. */
    public static final int DAILY_CAP = 40;
    /** A review note earns its own points from this many characters, surrounding spaces excluded. */
    public static final int LONG_NOTE_LENGTH = 80;
    /** The single key of the once-only profile award. */
    public static final String PROFILE_KEY = "profile";

    private PointRules() {
    }

    /** Whether a review note is long enough for {@link PointSource#REVIEW_NOTE}. */
    public static boolean isLongNote(String note) {
        if (Objects.isNull(note)) {
            return false;
        }
        String text = note.strip();
        return text.codePointCount(0, text.length()) >= LONG_NOTE_LENGTH;
    }

    /** A complete profile has a photo, a first and last name and a phone number. */
    public static boolean isCompleteProfile(String photoUrl, String firstName, String lastName, String phoneNumber) {
        return hasText(photoUrl) && hasText(firstName) && hasText(lastName) && hasText(phoneNumber);
    }

    /** The source key of a like: the review and the member who liked it. */
    public static String likeKey(Object reviewId, Object likerId) {
        return reviewKeyPrefix(reviewId) + likerId;
    }

    /** The prefix every like key of a review starts with. */
    public static String reviewKeyPrefix(Object reviewId) {
        return reviewId + ":";
    }

    private static boolean hasText(String value) {
        return Objects.nonNull(value) && !value.isBlank();
    }
}
