package com.vinnot.user.application.command.model;

import com.vinnot.legal.domain.model.TermsSelection;

public record RegisterUserCommand(String username, String email, String password, String firstName, String lastName,
                                  TermsSelection termsAcceptance) {
    public RegisterUserCommand(String username, String email, String password, String firstName, String lastName) {
        this(username, email, password, firstName, lastName, null);
    }
}
