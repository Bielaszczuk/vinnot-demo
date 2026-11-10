package com.vinnot.shared.domain.base;

import java.io.Serializable;
import java.util.Objects;

/**
 * Base class for all entities in the domain.
 * Entities have identity and lifecycle but are not aggregate roots.
 *
 * @param <EntityId> the type of the entity identifier
 */
public abstract class Entity<EntityId extends Serializable> {

    /**
     * Gets the unique identifier of this entity.
     *
     * @return the entity identifier
     */
    public abstract EntityId getId();

    @Override
    public boolean equals(Object obj) {
        if (this == obj) {
            return true;
        }
        if (Objects.isNull(obj) || getClass() != obj.getClass()) {
            return false;
        }
        Entity<?> entity = (Entity<?>) obj;
        return Objects.equals(getId(), entity.getId());
    }

    @Override
    public int hashCode() {
        return Objects.hash(getId());
    }
}
