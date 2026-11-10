package com.vinnot.community.domain.model;

/** Aggregate counts only; never contains private report evidence or identities. */
public record ReportCounts(long open, long inReview, long resolved, long dismissed) { }
