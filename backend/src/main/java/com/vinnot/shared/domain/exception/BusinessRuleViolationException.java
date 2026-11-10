package com.vinnot.shared.domain.exception;

public class BusinessRuleViolationException extends DomainException {

    /**
     * Creates a business rule violation exception.
     *
     * @param rule    the rule that was violated
     * @param message detailed message about the violation
     */
    public BusinessRuleViolationException(String rule, String message) {
        super(rule, message);
    }

    /**
     * Creates a business rule violation exception with message only.
     *
     * @param message the error message
     */
    public BusinessRuleViolationException(String message) {
        super("BUSINESS_RULE_VIOLATION", message);
    }
}
