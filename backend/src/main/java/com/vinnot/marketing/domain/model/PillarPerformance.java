package com.vinnot.marketing.domain.model;

/**
 * How a pillar's posts did over a window (#510): how many of its posts were measured (have views) and their summed
 * views and interactions, from each publication's latest metrics.
 */
public record PillarPerformance(String pillarCode, int measuredPosts, long views, long interactions) {
}
