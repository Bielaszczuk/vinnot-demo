package com.vinnot.marketing.application.model;

import com.vinnot.marketing.domain.model.WineDayKind;

import java.time.LocalDate;

/** A wine day resolved for one year. */
public record WineDayResponse(String code, String nameEs, String nameEn, WineDayKind kind, int priority, String countryCode,
        LocalDate date) { }
