package com.vinnot.shared.domain.base;

import java.io.Serializable;
import java.time.Instant;
import java.util.Objects;

/**
 * Base class for all aggregate roots in the domain.
 * Aggregates are consistency boundaries that encapsulate domain invariants.
 *
 * @param <AggregateId> the type of the aggregate identifier
 */
public abstract class AggregateRoot<AggregateId extends Serializable> {

    /**
     * Gets the unique identifier of this aggregate.
     *
     * @return the aggregate identifier
     */
    public abstract AggregateId getId();

    /**
     * Gets the creation timestamp.
     *
     * @return when this aggregate was created
     */
    public abstract Instant getCreatedAt();

    /**
     * Gets the last update timestamp.
     *
     * @return when this aggregate was last updated
     */
    public abstract Instant getUpdatedAt();

    @Override
    public boolean equals(Object obj) {
        if (this == obj) {
            return true;
        }
        if (Objects.isNull(obj) || getClass() != obj.getClass()) {
            return false;
        }
        AggregateRoot<?> that = (AggregateRoot<?>) obj;
        return Objects.equals(getId(), that.getId());
    }

    @Override
    public int hashCode() {
        return Objects.hash(getId());
    }
}
