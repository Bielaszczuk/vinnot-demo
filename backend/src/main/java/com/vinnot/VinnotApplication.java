package com.vinnot;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Main application entry point for Vinnot Backend.
 * Uses Hexagonal Architecture with CQRS pattern.
 */
@SpringBootApplication
public class VinnotApplication {

    /**
     * Application entry point.
     *
     * @param args command line arguments
     */
    public static void main(String[] args) {
        SpringApplication.run(VinnotApplication.class, args);
    }
}

