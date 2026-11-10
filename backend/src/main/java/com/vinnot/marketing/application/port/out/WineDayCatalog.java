package com.vinnot.marketing.application.port.out;

import com.vinnot.marketing.domain.model.WineDay;

import java.util.List;

/** The seeded wine-day calendar (#489). */
public interface WineDayCatalog {
    List<WineDay> all();
}
