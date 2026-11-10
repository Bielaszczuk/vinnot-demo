package com.vinnot.marketing.application.model;

/**
 * A content pillar as the admin API lists it, with its switches (#510: planned when {@code active}, its pending posts
 * approved by the system when {@code autoApprove}) and its performance over the weighting window.
 */
public record ContentPillarResponse(String code, String nameEs, String nameEn, int weight, boolean active, boolean autoApprove,
        Performance performance) {

    /** Measured posts, summed views and interactions, and the planner's factor (1.0 is neutral). */
    public record Performance(int measuredPosts, long views, long interactions, double factor) { }
}
