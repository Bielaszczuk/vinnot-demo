package com.vinnot.shared.application.port;

/** Decides whether a username and password may open the API documentation. */
public interface ApiDocumentationAccessPort {
    boolean allows(String email, String password);
}
