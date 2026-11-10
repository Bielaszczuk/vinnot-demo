package com.vinnot.marketing.domain.model;

import java.util.Objects;
import java.util.stream.Stream;

/**
 * One reading of a publication's metrics (#510). A null metric is one the network does not give.
 */
public record PublicationMetrics(Long views, Long reach, Long likes, Long comments, Long saves, Long shares, Long follows) {

    /** Likes, comments, saves and shares added up, counting the ones the network does not give as nothing. */
    public long interactions() {
        return Stream.of(likes, comments, saves, shares).filter(Objects::nonNull).mapToLong(Long::longValue).sum();
    }
}
