package com.vinnot.marketing.domain.model;

import org.junit.jupiter.api.Test;

import java.time.DayOfWeek;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** S1: every wine day is a rule that resolves itself for a year; half of the days move every year. */
class DateRuleTest {

    @Test
    void aFixedDayFallsOnTheSameDateEveryYear() {
        DateRule malbec = DateRule.parse("fixed:04-17");
        assertThat(malbec.resolve(2026)).isEqualTo(LocalDate.of(2026, 4, 17));
        assertThat(malbec.resolve(2027)).isEqualTo(LocalDate.of(2027, 4, 17));
        assertThat(malbec.serialize()).isEqualTo("fixed:04-17");
    }

    @Test
    void anNthWeekdayMovesWithTheCalendar() {
        DateRule vendimia = DateRule.parse("nth-weekday:03:SAT:1");
        assertThat(vendimia.resolve(2026)).isEqualTo(LocalDate.of(2026, 3, 7));
        assertThat(vendimia.resolve(2027)).isEqualTo(LocalDate.of(2027, 3, 6));
        DateRule tempranillo = DateRule.parse("nth-weekday:11:THU:2");
        assertThat(tempranillo.resolve(2026)).isEqualTo(LocalDate.of(2026, 11, 12));
        assertThat(tempranillo.resolve(2027)).isEqualTo(LocalDate.of(2027, 11, 11));
        assertThat(tempranillo).isEqualTo(DateRule.nthWeekday(11, DayOfWeek.THURSDAY, 2));
    }

    @Test
    void theLastWeekdayOfAMonthIsFound() {
        DateRule openThatBottle = DateRule.parse("last-weekday:02:SAT");
        assertThat(openThatBottle.resolve(2026)).isEqualTo(LocalDate.of(2026, 2, 28));
        assertThat(openThatBottle.resolve(2027)).isEqualTo(LocalDate.of(2027, 2, 27));
        assertThat(openThatBottle.serialize()).isEqualTo("last-weekday:02:SAT");
    }

    @Test
    void anOffsetRuleShiftsAnotherRuleByDays() {
        DateRule chardonnay = DateRule.parse("offset-from:last-weekday:05:MON:-4");
        assertThat(chardonnay.resolve(2026)).as("Thursday before US Memorial Day 2026").isEqualTo(LocalDate.of(2026, 5, 21));
        assertThat(chardonnay.resolve(2027)).isEqualTo(LocalDate.of(2027, 5, 27));
        DateRule cabernet = DateRule.parse("offset-from:nth-weekday:09:MON:1:-4");
        assertThat(cabernet.resolve(2026)).as("Thursday before Labor Day 2026").isEqualTo(LocalDate.of(2026, 9, 3));
        assertThat(cabernet.resolve(2027)).isEqualTo(LocalDate.of(2027, 9, 2));
        assertThat(cabernet.serialize()).isEqualTo("offset-from:nth-weekday:09:MON:1:-4");
        assertThat(DateRule.parse(chardonnay.serialize())).isEqualTo(chardonnay);
    }

    @Test
    void malformedRulesAreRejected() {
        assertThatThrownBy(() -> DateRule.parse("fixed:13-01")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> DateRule.parse("nth-weekday:03:SAT:5")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> DateRule.parse("every-day")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> DateRule.parse("last-weekday:02:CAT")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> DateRule.parse("offset-from:fixed:01-01:x")).isInstanceOf(IllegalArgumentException.class);
    }
}
