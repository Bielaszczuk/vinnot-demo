package com.vinnot.marketing.application.model;

import java.time.LocalDate;

/** What a planner run did: posts created inside the window {@code from}..{@code to} (inclusive, Argentina dates). */
public record PlanResult(int created, LocalDate from, LocalDate to) { }
