package com.vinnot.shared.domain.exception;

public class EntityNotFoundException extends DomainException {

    /**
     * Creates a not found exception.
     *
     * @param entityName the entity type name
     * @param id         the entity id that was not found
     */
    public EntityNotFoundException(String entityName, Object id) {
        super("NOT_FOUND", String.format("%s not found with id: %s", entityName, id));
    }

    /**
     * Creates a not found exception with custom message.
     *
     * @param message the error message
     */
    public EntityNotFoundException(String message) {
        super("NOT_FOUND", message);
    }
}

