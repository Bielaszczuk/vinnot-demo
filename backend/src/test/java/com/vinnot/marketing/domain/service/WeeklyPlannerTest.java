package com.vinnot.marketing.domain.service;

import com.vinnot.marketing.domain.model.ContentPillar;
import com.vinnot.marketing.domain.model.DateRule;
import com.vinnot.marketing.domain.model.WineDay;
import com.vinnot.marketing.domain.model.WineDayKind;
import com.vinnot.marketing.domain.service.WeeklyPlanner.Existing;
import com.vinnot.marketing.domain.service.WeeklyPlanner.Planned;
import org.junit.jupiter.api.Test;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * #489 S3: fixed slots a week, pillars rotate, and planning twice adds nothing. #510 S7: the least used pillar for its
 * weight times its performance factor comes next, and switched-off pillars are not planned. #513 S1-S3: rotating posts on
 * Tuesday, Wednesday and Thursday at 12:30 and wine days on their own day at 09:30, one post per date, extra wine days
 * within the weekly maximum (priority 1 always), existing posts counted by date whatever their time.
 */
class WeeklyPlannerTest {
    private static final LocalDate MONDAY = LocalDate.of(2026, 11, 2);
    private static final ZoneId ARGENTINA = ZoneId.of("America/Argentina/Buenos_Aires");
    private static final List<ContentPillar> PILLARS = List.of(pillar("WINE_DAY", 1), pillar("CURIOUS_FACT", 2),
            pillar("EDUCATION", 3), pillar("MYTH_VS_REALITY", 4), pillar("QUIZ", 5), pillar("PAIRING", 6),
            pillar("GRAPE_OF_MONTH", 7), pillar("HUMOR", 8), pillar("APP_FEATURE", 9));
    private final WeeklyPlanner planner = new WeeklyPlanner(WeeklyPlanner.Settings.defaults());

    @Test
    void theDefaultsAreTheApprovedSchedule() {
        WeeklyPlanner.Settings defaults = WeeklyPlanner.Settings.defaults();

        assertThat(defaults.zone()).isEqualTo(ARGENTINA);
        assertThat(defaults.slotDays()).containsExactlyInAnyOrder(DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY);
        assertThat(defaults.slotTime()).isEqualTo(LocalTime.of(12, 30));
        assertThat(defaults.wineDayTime()).isEqualTo(LocalTime.of(9, 30));
        assertThat(defaults.maxPostsPerWeek()).isEqualTo(4);
        assertThat(defaults.windowDays()).isEqualTo(14);
    }

    @Test
    void fillsTuesdayWednesdayAndThursdayAt1230ArgentinaTimeForTwoWeeks() {
        List<Planned> plan = planner.plan(MONDAY, List.of(), PILLARS, List.of());
        assertThat(plan).extracting(Planned::scheduledFor).containsExactly(slot("2026-11-03"), slot("2026-11-04"), slot("2026-11-05"),
                slot("2026-11-10"), slot("2026-11-11"), slot("2026-11-12"));
        assertThat(plan).extracting(Planned::pillarCode).containsExactly("CURIOUS_FACT", "EDUCATION", "MYTH_VS_REALITY",
                "APP_FEATURE", "QUIZ", "PAIRING");
        assertThat(plan).extracting(Planned::wineDayCode).containsOnlyNulls();
    }

    @Test
    void aWineDayPostsOnItsOwnDayAt0930AsAnExtraPostWhenItIsNotASlotDay() {
        List<Planned> plan = planner.plan(MONDAY, List.of(day("MERLOT", "fixed:11-07", 1)), PILLARS, List.of());

        assertThat(plan).extracting(Planned::scheduledFor).containsExactly(slot("2026-11-03"), slot("2026-11-04"), slot("2026-11-05"),
                morning("2026-11-07"), slot("2026-11-10"), slot("2026-11-11"), slot("2026-11-12"));
        assertThat(plan.get(3)).isEqualTo(new Planned(Instant.parse("2026-11-07T12:30:00Z"), "WINE_DAY", "MERLOT"));
        assertThat(plan).extracting(Planned::pillarCode).containsExactly("CURIOUS_FACT", "EDUCATION", "MYTH_VS_REALITY", "WINE_DAY",
                "APP_FEATURE", "QUIZ", "PAIRING");
    }

    @Test
    void aWineDayOnASlotDayTakesThatDaysSlotAndNoRotatingPostGoesOutThatDay() {
        List<Planned> plan = planner.plan(MONDAY, List.of(day("WEDNESDAY_DAY", "fixed:11-04", 3)), PILLARS, List.of());

        assertThat(firstWeek(plan)).containsExactly(new Planned(slot("2026-11-03"), "CURIOUS_FACT", null),
                new Planned(morning("2026-11-04"), "WINE_DAY", "WEDNESDAY_DAY"), new Planned(slot("2026-11-05"), "EDUCATION", null));
        assertThat(plan).hasSize(6).extracting(Planned::scheduledFor).doesNotContain(slot("2026-11-04"));
    }

    @Test
    void priorityOneWineDaysAlwaysPostEvenAboveTheWeeklyMaximum() {
        List<WineDay> days = List.of(day("MONDAY_DAY", "fixed:11-02", 1), day("SATURDAY_DAY", "fixed:11-07", 1));

        List<Planned> plan = planner.plan(MONDAY, days, PILLARS, List.of());

        assertThat(firstWeek(plan)).extracting(Planned::scheduledFor).containsExactly(morning("2026-11-02"), slot("2026-11-03"),
                slot("2026-11-04"), slot("2026-11-05"), morning("2026-11-07"));
    }

    @Test
    void priorityTwoAndThreeWineDaysPostOnlyWhileTheWeekHasFewerPostsThanTheMaximum() {
        List<WineDay> days = List.of(day("SUNDAY_DAY", "fixed:11-08", 3), day("FRIDAY_DAY", "fixed:11-06", 2));

        assertThat(firstWeek(planner.plan(MONDAY, days, PILLARS, List.of()))).as("three slots and Friday make four")
                .extracting(Planned::wineDayCode).containsExactly(null, null, null, "FRIDAY_DAY");
        assertThat(firstWeek(planner.plan(MONDAY, List.of(day("MONDAY_DAY", "fixed:11-02", 1), day("SATURDAY_DAY", "fixed:11-07", 3)),
                PILLARS, List.of()))).as("a priority 1 day fills the fourth place").extracting(Planned::wineDayCode)
                .containsExactly("MONDAY_DAY", null, null, null);
        WeeklyPlanner roomier = new WeeklyPlanner(new WeeklyPlanner.Settings(ARGENTINA, LocalTime.of(12, 30),
                Set.of(DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY), 14, LocalTime.of(9, 30), 5));
        assertThat(firstWeek(roomier.plan(MONDAY, days, PILLARS, List.of()))).as("a maximum of five lets Sunday in")
                .extracting(Planned::wineDayCode).containsExactly(null, null, null, "FRIDAY_DAY", "SUNDAY_DAY");
    }

    @Test
    void twoWineDaysOnOneDateKeepTheLowerPriorityNumberAndDropTheOther() {
        WeeklyPlanner roomy = new WeeklyPlanner(new WeeklyPlanner.Settings(ARGENTINA, LocalTime.of(12, 30),
                Set.of(DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY), 14, LocalTime.of(9, 30), 10));
        List<WineDay> days = List.of(day("MERLOT", "fixed:11-07", 2), day("CARMENERE", "fixed:11-07", 1),
                day("ZINFANDEL", "fixed:11-04", 3), day("TANNAT", "fixed:11-04", 2));

        List<Planned> plan = roomy.plan(MONDAY, days, PILLARS, List.of());

        assertThat(plan).filteredOn(post -> "WINE_DAY".equals(post.pillarCode())).containsExactly(
                new Planned(morning("2026-11-04"), "WINE_DAY", "TANNAT"), new Planned(morning("2026-11-07"), "WINE_DAY", "CARMENERE"));
        assertThat(plan).extracting(Planned::wineDayCode).doesNotContain("MERLOT", "ZINFANDEL");
    }

    @Test
    void existingPostsCountByDateWhateverTheirTime() {
        List<Existing> existing = List.of(new Existing(Instant.parse("2026-11-03T23:15:00Z"), "QUIZ", null),
                new Existing(Instant.parse("2026-11-07T21:00:00Z"), "WINE_DAY", "MERLOT"));

        List<Planned> plan = planner.plan(MONDAY, List.of(day("MERLOT", "fixed:11-07", 1)), PILLARS, existing);

        assertThat(firstWeek(plan)).extracting(Planned::scheduledFor).containsExactly(slot("2026-11-04"), slot("2026-11-05"));
        assertThat(plan).extracting(Planned::wineDayCode).containsOnlyNulls();
    }

    @Test
    void aPostMovedOffTheSlotDaysKeepsItsWeekAtItsSize() {
        List<Existing> existing = List.of(new Existing(Instant.parse("2026-11-02T18:00:00Z"), "CURIOUS_FACT", null),
                new Existing(slot("2026-11-04"), "EDUCATION", null), new Existing(slot("2026-11-05"), "MYTH_VS_REALITY", null));

        List<Planned> plan = planner.plan(MONDAY, List.of(), PILLARS, existing);

        assertThat(plan).extracting(Planned::scheduledFor).containsExactly(slot("2026-11-10"), slot("2026-11-11"), slot("2026-11-12"));
    }

    @Test
    void aWineDayPostMovedToAnotherDateIsNotPlannedAgainAndUsesNoSlot() {
        List<Existing> existing = List.of(new Existing(morning("2026-11-06"), "WINE_DAY", "MERLOT"));

        List<Planned> plan = planner.plan(MONDAY, List.of(day("MERLOT", "fixed:11-07", 1)), PILLARS, existing);

        assertThat(plan).extracting(Planned::wineDayCode).containsOnlyNulls();
        assertThat(firstWeek(plan)).extracting(Planned::scheduledFor).containsExactly(slot("2026-11-03"), slot("2026-11-04"),
                slot("2026-11-05"));
    }

    @Test
    void postsPlannedOnTheOldEveningScheduleAreNeverJoinedByASecondPostOrAFourthRotatingOne() {
        List<Existing> old = List.of(new Existing(evening("2026-11-03"), "CURIOUS_FACT", null),
                new Existing(evening("2026-11-05"), "EDUCATION", null), new Existing(evening("2026-11-07"), "HUMOR", null),
                new Existing(evening("2026-11-10"), "QUIZ", null), new Existing(evening("2026-11-12"), "PAIRING", null),
                new Existing(evening("2026-11-14"), "GRAPE_OF_MONTH", null));

        assertThat(planner.plan(MONDAY, List.of(), PILLARS, old)).isEmpty();
    }

    @Test
    void slotsOfTheLastWeekBeyondTheWindowStillCountTowardsItsMaximum() {
        WeeklyPlanner tight = new WeeklyPlanner(new WeeklyPlanner.Settings(ARGENTINA, LocalTime.of(12, 30),
                Set.of(DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY), 14, LocalTime.of(9, 30), 3));
        LocalDate wednesday = MONDAY.plusDays(2);

        List<Planned> plan = tight.plan(wednesday, List.of(day("LATE_MONDAY", "fixed:11-16", 2)), PILLARS, List.of());

        assertThat(plan).extracting(Planned::wineDayCode).as("Tuesday plus the Wednesday and Thursday still to plan fill the week")
                .containsOnlyNulls();
        assertThat(plan).extracting(Planned::scheduledFor).last().isEqualTo(slot("2026-11-17"));
    }

    @Test
    void planningAgainOverTheSameWindowCreatesNothing() {
        List<WineDay> days = List.of(day("MERLOT", "fixed:11-07", 1), day("FRIDAY_DAY", "fixed:11-13", 2),
                day("SUNDAY_DAY", "fixed:11-15", 3), day("WEDNESDAY_DAY", "fixed:11-11", 3));
        List<Planned> first = planner.plan(MONDAY, days, PILLARS, List.of());
        List<Existing> existing = first.stream().map(post -> new Existing(post.scheduledFor(), post.pillarCode(), post.wineDayCode()))
                .toList();
        assertThat(first).extracting(Planned::wineDayCode).contains("MERLOT", "FRIDAY_DAY", "WEDNESDAY_DAY").doesNotContain("SUNDAY_DAY");

        assertThat(planner.plan(MONDAY, days, PILLARS, existing)).isEmpty();
        assertThat(planner.plan(MONDAY.plusDays(3), days, PILLARS, existing)).as("a later run only adds the new days of its window")
                .extracting(Planned::scheduledFor).containsExactly(slot("2026-11-17"), slot("2026-11-18"));
        List<Planned> nextWeek = planner.plan(MONDAY.plusWeeks(1), List.of(), PILLARS, existing);
        assertThat(nextWeek).extracting(Planned::scheduledFor).containsExactly(slot("2026-11-17"), slot("2026-11-18"), slot("2026-11-19"));
    }

    @Test
    void theRotationContinuesFromThePreviousPostAndNeverRepeatsIt() {
        List<Existing> history = List.of(new Existing(evening("2026-10-29"), "APP_FEATURE"), new Existing(evening("2026-10-31"), "EDUCATION"));
        List<Planned> plan = planner.plan(MONDAY, List.of(), PILLARS, history);
        // #510 S7: the least used pillar comes next, so CURIOUS_FACT (never used) goes before the ones after EDUCATION
        assertThat(plan).extracting(Planned::pillarCode).containsExactly("CURIOUS_FACT", "MYTH_VS_REALITY", "APP_FEATURE", "QUIZ",
                "PAIRING", "GRAPE_OF_MONTH");
        List<Planned> wrapped = planner.plan(MONDAY, List.of(), PILLARS, List.of(new Existing(evening("2026-10-31"), "HUMOR")));
        assertThat(wrapped).extracting(Planned::pillarCode).startsWith("CURIOUS_FACT", "EDUCATION");
    }

    @Test
    void settingsNeedASlotDayAWindowAndAWeeklyMaximum() {
        LocalTime noon = LocalTime.NOON;
        assertThatThrownBy(() -> new WeeklyPlanner.Settings(ZoneId.of("UTC"), noon, Set.of(), 14, noon, 4))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("slot day");
        assertThatThrownBy(() -> new WeeklyPlanner.Settings(ZoneId.of("UTC"), noon, Set.of(DayOfWeek.MONDAY), 0, noon, 4))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new WeeklyPlanner.Settings(ZoneId.of("UTC"), noon, Set.of(DayOfWeek.MONDAY), 14, noon, 0))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("maximum");
        assertThatThrownBy(() -> new WeeklyPlanner.Settings(ZoneId.of("UTC"), noon, Set.of(DayOfWeek.MONDAY), 14, null, 4))
                .isInstanceOf(NullPointerException.class);
    }

    @Test
    void atLeastOneRotatingPillarBesidesAppFeatureIsRequired() {
        assertThatThrownBy(() -> planner.plan(MONDAY, List.of(), List.of(pillar("WINE_DAY", 1), pillar("APP_FEATURE", 2)), List.of()))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("rotating pillar");
    }

    @Test
    void aSingleRotatingPillarRepeatsItselfOnlyWhenNothingElseExists() {
        List<ContentPillar> few = List.of(pillar("WINE_DAY", 1), pillar("CURIOUS_FACT", 2), pillar("APP_FEATURE", 3));
        List<Planned> plan = planner.plan(MONDAY, List.of(), few, List.of());
        assertThat(plan).extracting(Planned::pillarCode).containsExactly("CURIOUS_FACT", "CURIOUS_FACT", "CURIOUS_FACT", "APP_FEATURE",
                "CURIOUS_FACT", "CURIOUS_FACT");
    }

    @Test
    void aWindowAcrossNewYearResolvesWineDaysOfBothYearsAndIgnoresTheRest() {
        LocalDate monday = LocalDate.of(2026, 12, 28);
        WineDay january = day("JANUARY_DAY", "fixed:01-02", 1);
        WineDay malbec = day("MALBEC", "fixed:04-17", 1);
        List<Planned> plan = planner.plan(monday, List.of(malbec, january), PILLARS, List.of());
        assertThat(plan).extracting(Planned::scheduledFor).containsExactly(slot("2026-12-29"), slot("2026-12-30"), slot("2026-12-31"),
                morning("2027-01-02"), slot("2027-01-05"), slot("2027-01-06"), slot("2027-01-07"));
        assertThat(plan.get(3)).isEqualTo(new Planned(morning("2027-01-02"), "WINE_DAY", "JANUARY_DAY"));
        assertThat(plan).extracting(Planned::wineDayCode).doesNotContain("MALBEC");
    }

    @Test
    void aHeavierPillarIsPlannedMoreOftenWithoutRepeatingItselfBackToBack() {
        List<ContentPillar> weighted = List.of(pillar("WINE_DAY", 1), weighted("CURIOUS_FACT", 3, 2), weighted("EDUCATION", 1, 3),
                weighted("QUIZ", 1, 4), pillar("APP_FEATURE", 9));
        List<Planned> plan = fourWeeks().plan(MONDAY, List.of(), weighted, List.of());
        assertThat(plan).extracting(Planned::pillarCode).containsExactly("CURIOUS_FACT", "EDUCATION", "QUIZ", "APP_FEATURE",
                "CURIOUS_FACT", "EDUCATION", "CURIOUS_FACT", "APP_FEATURE", "CURIOUS_FACT", "QUIZ", "CURIOUS_FACT", "APP_FEATURE");
        assertNoBackToBack(plan);
    }

    @Test
    void aPillarThatPerformsBetterIsPlannedMoreOftenAndAWorseOneLessOften() {
        List<ContentPillar> even = List.of(pillar("WINE_DAY", 1), pillar("CURIOUS_FACT", 2), pillar("EDUCATION", 3), pillar("QUIZ", 4),
                pillar("APP_FEATURE", 9));
        List<Planned> plan = fourWeeks().plan(MONDAY, List.of(), even, List.of(), Map.of("QUIZ", 2.0, "CURIOUS_FACT", 0.5));
        assertThat(plan).extracting(Planned::pillarCode).containsExactly("CURIOUS_FACT", "EDUCATION", "QUIZ", "APP_FEATURE",
                "QUIZ", "EDUCATION", "QUIZ", "APP_FEATURE", "QUIZ", "CURIOUS_FACT", "EDUCATION", "APP_FEATURE");
        assertNoBackToBack(plan);
        assertThat(fourWeeks().plan(MONDAY, List.of(), even, List.of(), Map.of())).as("neutral factors rotate evenly")
                .extracting(Planned::pillarCode).containsExactly("CURIOUS_FACT", "EDUCATION", "QUIZ", "APP_FEATURE", "CURIOUS_FACT",
                        "EDUCATION", "QUIZ", "APP_FEATURE", "CURIOUS_FACT", "EDUCATION", "QUIZ", "APP_FEATURE");
    }

    @Test
    void aDominantPillarStillNeverFollowsItselfAndAppFeatureStaysEveryFourthRotatingPost() {
        List<ContentPillar> dominant = List.of(weighted("CURIOUS_FACT", 10, 2), weighted("EDUCATION", 1, 3), pillar("APP_FEATURE", 9));
        List<Planned> plan = fourWeeks().plan(MONDAY, List.of(), dominant, List.of(), Map.of("CURIOUS_FACT", 2.0, "EDUCATION", 0.5));
        assertThat(plan).extracting(Planned::pillarCode).containsExactly("CURIOUS_FACT", "EDUCATION", "CURIOUS_FACT", "APP_FEATURE",
                "CURIOUS_FACT", "EDUCATION", "CURIOUS_FACT", "APP_FEATURE", "CURIOUS_FACT", "EDUCATION", "CURIOUS_FACT", "APP_FEATURE");
        assertNoBackToBack(plan);
    }

    @Test
    void existingPostsCountAsUsesSoTheirPillarsWaitTheirTurn() {
        List<Existing> history = List.of(new Existing(evening("2026-10-27"), "CURIOUS_FACT"), new Existing(evening("2026-10-29"), "EDUCATION"),
                new Existing(evening("2026-10-31"), "MYTH_VS_REALITY"));
        List<Planned> plan = planner.plan(MONDAY, List.of(), PILLARS, history, Map.of());
        assertThat(plan).extracting(Planned::pillarCode).containsExactly("APP_FEATURE", "QUIZ", "PAIRING", "GRAPE_OF_MONTH",
                "APP_FEATURE", "HUMOR");
    }

    @Test
    void switchedOffPillarsAreNeverPlanned() {
        List<ContentPillar> someOff = new ArrayList<>(PILLARS);
        someOff.replaceAll(pillar -> Set.of("EDUCATION", "HUMOR").contains(pillar.code()) ? inactive(pillar) : pillar);
        List<Planned> plan = fourWeeks().plan(MONDAY, List.of(), someOff, List.of(), Map.of("EDUCATION", 2.0));
        assertThat(plan).extracting(Planned::pillarCode).doesNotContain("EDUCATION", "HUMOR").startsWith("CURIOUS_FACT",
                "MYTH_VS_REALITY", "QUIZ", "APP_FEATURE", "PAIRING", "GRAPE_OF_MONTH");

        List<ContentPillar> noAppFeature = new ArrayList<>(PILLARS);
        noAppFeature.replaceAll(pillar -> "APP_FEATURE".equals(pillar.code()) ? inactive(pillar) : pillar);
        assertThat(planner.plan(MONDAY, List.of(), noAppFeature, List.of())).extracting(Planned::pillarCode)
                .containsExactly("CURIOUS_FACT", "EDUCATION", "MYTH_VS_REALITY", "QUIZ", "PAIRING", "GRAPE_OF_MONTH");
    }

    @Test
    void aSwitchedOffWineDayPillarPlansNoWineDayPosts() {
        List<ContentPillar> noWineDays = new ArrayList<>(PILLARS);
        noWineDays.replaceAll(pillar -> "WINE_DAY".equals(pillar.code()) ? inactive(pillar) : pillar);
        List<Planned> plan = planner.plan(MONDAY, List.of(day("MERLOT", "fixed:11-07", 1)), noWineDays, List.of());
        assertThat(plan).extracting(Planned::wineDayCode).containsOnlyNulls();
        assertThat(plan).extracting(Planned::pillarCode).containsExactly("CURIOUS_FACT", "EDUCATION", "MYTH_VS_REALITY",
                "APP_FEATURE", "QUIZ", "PAIRING");
    }

    @Test
    void onlySwitchedOffRotatingPillarsLeaveNothingToPlan() {
        List<ContentPillar> allOff = List.of(pillar("WINE_DAY", 1), inactive(pillar("CURIOUS_FACT", 2)), pillar("APP_FEATURE", 9));
        assertThatThrownBy(() -> planner.plan(MONDAY, List.of(), allOff, List.of())).isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("rotating pillar");
    }

    @Test
    void wineDaysKeepTheirPlacesWhateverTheFactors() {
        List<WineDay> days = List.of(day("MERLOT", "fixed:11-07", 1), day("MONDAY_DAY", "fixed:11-09", 2));
        List<Planned> neutral = planner.plan(MONDAY, days, PILLARS, List.of());
        List<Planned> weighted = planner.plan(MONDAY, days, PILLARS, List.of(), Map.of("MYTH_VS_REALITY", 2.0, "CURIOUS_FACT", 0.5));
        assertThat(weighted).extracting(Planned::scheduledFor).containsExactlyElementsOf(neutral.stream().map(Planned::scheduledFor).toList());
        assertThat(weighted).filteredOn(post -> "WINE_DAY".equals(post.pillarCode())).containsExactly(
                new Planned(morning("2026-11-07"), "WINE_DAY", "MERLOT"), new Planned(morning("2026-11-09"), "WINE_DAY", "MONDAY_DAY"));
    }

    private static WeeklyPlanner fourWeeks() {
        WeeklyPlanner.Settings defaults = WeeklyPlanner.Settings.defaults();
        return new WeeklyPlanner(new WeeklyPlanner.Settings(defaults.zone(), defaults.slotTime(), defaults.slotDays(), 28,
                defaults.wineDayTime(), defaults.maxPostsPerWeek()));
    }

    private static List<Planned> firstWeek(List<Planned> plan) {
        return plan.stream().filter(post -> post.scheduledFor().isBefore(Instant.parse("2026-11-09T03:00:00Z"))).toList();
    }

    private static void assertNoBackToBack(List<Planned> plan) {
        for (int index = 1; index < plan.size(); index++) {
            assertThat(plan.get(index).pillarCode()).as("post %d", index).isNotEqualTo(plan.get(index - 1).pillarCode());
        }
    }

    private static ContentPillar weighted(String code, int weight, int order) {
        return new ContentPillar(code, code, code, weight, "brief " + code, "brief " + code, order);
    }

    private static ContentPillar inactive(ContentPillar pillar) {
        return new ContentPillar(pillar.code(), pillar.nameEs(), pillar.nameEn(), pillar.weight(), pillar.brief(), pillar.briefEn(),
                pillar.sortOrder(), pillar.autoApprove(), false);
    }

    /** A rotating slot: 12:30 in Argentina (UTC-3). */
    private static Instant slot(String date) {
        return Instant.parse(date + "T15:30:00Z");
    }

    /** A wine-day post: 09:30 in Argentina. */
    private static Instant morning(String date) {
        return Instant.parse(date + "T12:30:00Z");
    }

    /** The slot time before #513: 19:00 in Argentina. */
    private static Instant evening(String date) {
        return Instant.parse(date + "T22:00:00Z");
    }

    private static WineDay day(String code, String rule, int priority) {
        return new WineDay(code, code, code, WineDayKind.GRAPE, DateRule.parse(rule), priority, null);
    }

    private static ContentPillar pillar(String code, int order) {
        return new ContentPillar(code, code, code, 1, "brief " + code, "brief " + code, order);
    }
}
