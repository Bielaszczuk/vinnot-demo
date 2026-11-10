package com.vinnot.sharing.domain;

/** Deliberately excludes accounts, contacts, registrations, stops and moderation data. */
public record SharedContent(String title, String description, String imageUrl) { }
