package com.vinnot.shared.domain.base;

import java.util.Objects;

public abstract class ValueObject {

    /**
     * Gets the attributes that define equality for this value object.
     *
     * @return array of attributes used for equality comparison
     */
    protected abstract Object[] getEqualityComponents();

    @Override
    public boolean equals(Object obj) {
        if (this == obj) {
            return true;
        }
        if (Objects.isNull(obj) || getClass() != obj.getClass()) {
            return false;
        }
        ValueObject that = (ValueObject) obj;
        return Objects.deepEquals(getEqualityComponents(), that.getEqualityComponents());
    }

    @Override
    public int hashCode() {
        return Objects.hash(getEqualityComponents());
    }
}

