package com.vinnot.marketing.domain.service;

import com.vinnot.marketing.domain.model.ContentPillar;
import com.vinnot.marketing.domain.model.WineDay;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.TreeMap;

/**
 * Fills a window with posts (#489, #513). Rotating posts go out on the slot days at the slot time (Tuesday, Wednesday and
 * Thursday at 12:30 in Argentina by default) and wine days on their own day at the wine-day time (09:30 by default). There is
 * at most one post per local date: a wine day on a slot day takes that day's slot, and when two wine days share a date the
 * lower priority number wins and the other is dropped. A wine day on another day is an extra post: priority 1 always goes
 * out, priority 2 and 3 only while its week (Monday to Sunday, existing and planned posts, and the slots of the week still
 * beyond the window) has fewer than the weekly maximum. The remaining slots go to the other pillars, never repeating the
 * previous post's pillar, with {@code APP_FEATURE} once every four rotating posts. Each other slot takes the pillar least
 * used for its share (#510): the lowest uses (existing posts plus the ones planned so far) over its weight times its
 * performance factor ({@link PillarWeighting}), the lower sort order on a tie. Only active pillars are planned; a
 * switched-off {@code WINE_DAY} pillar plans no wine-day posts. Existing posts count by local date whatever their time: a
 * date with a post gets no other, a wine day with a post (wherever it was moved) is not planned again, and a rotating post
 * moved off the slot days uses up one free slot of its week. So planning twice adds nothing, and changing the times or
 * rescheduling a post never adds a second post on a date.
 */
public final class WeeklyPlanner {
    /** One of every four rotating posts shows a feature of the app. */
    public static final int APP_FEATURE_EVERY = 4;
    private static final LocalTime DEFAULT_SLOT_TIME = LocalTime.of(12, 30);
    private static final LocalTime DEFAULT_WINE_DAY_TIME = LocalTime.of(9, 30);
    private static final int DEFAULT_MAX_POSTS_PER_WEEK = 4;
    private static final int DEFAULT_WINDOW_DAYS = 14;

    /**
     * Where and when posts fall: rotating posts on the slot days at the slot time, wine days at the wine-day time, at most
     * {@code maxPostsPerWeek} posts a week once extra wine days of priority 2 and 3 are counted. The window is counted in
     * days from the planning date.
     */
    public record Settings(ZoneId zone, LocalTime slotTime, Set<DayOfWeek> slotDays, int windowDays, LocalTime wineDayTime,
            int maxPostsPerWeek) {
        public Settings {
            Objects.requireNonNull(zone, "zone");
            Objects.requireNonNull(slotTime, "slotTime");
            Objects.requireNonNull(wineDayTime, "wineDayTime");
            slotDays = Set.copyOf(slotDays);
            if (slotDays.isEmpty() || windowDays < 1) {
                throw new IllegalArgumentException("At least one slot day and a window of one day or more are required");
            }
            if (maxPostsPerWeek < 1) {
                throw new IllegalArgumentException("The weekly maximum must be at least one post, got " + maxPostsPerWeek);
            }
        }

        public static Settings defaults() {
            return new Settings(ZoneId.of("America/Argentina/Buenos_Aires"), DEFAULT_SLOT_TIME,
                    Set.of(DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY), DEFAULT_WINDOW_DAYS, DEFAULT_WINE_DAY_TIME,
                    DEFAULT_MAX_POSTS_PER_WEEK);
        }
    }

    /**
     * A post already stored, inside the window or shortly before it (the rotation continues from it), with its wine day
     * (null for a rotating post).
     */
    public record Existing(Instant scheduledFor, String pillarCode, String wineDayCode) {
        /** A rotating post. */
        public Existing(Instant scheduledFor, String pillarCode) {
            this(scheduledFor, pillarCode, null);
        }
    }

    /** A post to create. */
    public record Planned(Instant scheduledFor, String pillarCode, String wineDayCode) { }

    private final Settings settings;

    public WeeklyPlanner(Settings settings) {
        this.settings = Objects.requireNonNull(settings, "settings");
    }

    public LocalDate windowEnd(LocalDate from) {
        return from.plusDays(settings.windowDays() - 1L);
    }

    /** Plans with every pillar neutral (no performance data). */
    public List<Planned> plan(LocalDate from, List<WineDay> wineDays, List<ContentPillar> pillars, List<Existing> existing) {
        return plan(from, wineDays, pillars, existing, Map.of());
    }

    /**
     * Plans the window from {@code from}; {@code factors} holds each pillar's performance factor, a pillar absent from it
     * is neutral.
     */
    public List<Planned> plan(LocalDate from, List<WineDay> wineDays, List<ContentPillar> pillars, List<Existing> existing,
            Map<String, Double> factors) {
        LocalDate to = windowEnd(from);
        boolean wineDaysOff = pillars.stream().anyMatch(pillar -> ContentPillar.WINE_DAY.equals(pillar.code()) && !pillar.active());
        Set<LocalDate> taken = new HashSet<>();
        Set<String> postedWineDays = new HashSet<>();
        Map<LocalDate, Integer> postsByWeek = new HashMap<>();
        Map<LocalDate, Integer> movedByWeek = new HashMap<>();
        for (Existing post : existing) {
            LocalDate date = dateOf(post.scheduledFor());
            taken.add(date);
            postsByWeek.merge(weekOf(date), 1, Integer::sum);
            if (Objects.nonNull(post.wineDayCode())) {
                postedWineDays.add(post.wineDayCode());
            }
            if (!ContentPillar.WINE_DAY.equals(post.pillarCode()) && !settings.slotDays().contains(date.getDayOfWeek())) {
                movedByWeek.merge(weekOf(date), 1, Integer::sum);
            }
        }
        Map<LocalDate, WineDay> wineDayByDate = wineDaysOff ? Map.of() : wineDayByDate(from, to, wineDays, postedWineDays, taken);
        TreeMap<Instant, Planned> planned = new TreeMap<>();
        for (LocalDate week = from.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)); !week.isAfter(to); week = week.plusWeeks(1)) {
            List<LocalDate> free = slotsOf(week, from, to).stream().filter(slot -> !taken.contains(slot)).toList();
            int rotating = free.size() - movedByWeek.getOrDefault(week, 0);
            int posts = postsByWeek.getOrDefault(week, 0) + reservedSlots(week, to, taken);
            List<WineDay> extras = new ArrayList<>();
            for (LocalDate date = week; date.isBefore(week.plusWeeks(1)); date = date.plusDays(1)) {
                WineDay day = wineDayByDate.get(date);
                if (Objects.isNull(day)) {
                    continue;
                }
                if (free.contains(date) && rotating > 0) {
                    rotating--;
                    posts++;
                    planned.put(wineDayAt(date), new Planned(wineDayAt(date), ContentPillar.WINE_DAY, day.code()));
                } else {
                    extras.add(day);
                }
            }
            for (LocalDate slot : free) {
                if (rotating <= 0) {
                    break;
                }
                if (!wineDayByDate.containsKey(slot)) {
                    rotating--;
                    posts++;
                    planned.put(slotAt(slot), new Planned(slotAt(slot), null, null));
                }
            }
            extras.sort(Comparator.comparingInt(WineDay::priority).thenComparing(day -> dateOf(day, from, to)).thenComparing(WineDay::code));
            for (WineDay day : extras) {
                if (day.priority() == WineDay.MUST_POST || posts < settings.maxPostsPerWeek()) {
                    posts++;
                    Instant at = wineDayAt(dateOf(day, from, to));
                    planned.put(at, new Planned(at, ContentPillar.WINE_DAY, day.code()));
                }
            }
        }
        return rotate(planned, existing, pillars, factors);
    }

    private List<Planned> rotate(TreeMap<Instant, Planned> planned, List<Existing> existing, List<ContentPillar> pillars,
            Map<String, Double> factors) {
        List<ContentPillar> rotation = pillars.stream().filter(ContentPillar::active).filter(ContentPillar::rotates)
                .filter(pillar -> !ContentPillar.APP_FEATURE.equals(pillar.code())).sorted(Comparator.comparingInt(ContentPillar::sortOrder))
                .toList();
        if (rotation.isEmpty()) {
            throw new IllegalStateException("At least one active rotating pillar besides APP_FEATURE is required");
        }
        boolean appFeature = pillars.stream().anyMatch(pillar -> ContentPillar.APP_FEATURE.equals(pillar.code()) && pillar.active());
        TreeMap<Instant, String> sequence = new TreeMap<>();
        Map<String, Integer> uses = new HashMap<>();
        existing.forEach(post -> {
            sequence.put(post.scheduledFor(), post.pillarCode());
            uses.merge(post.pillarCode(), 1, Integer::sum);
        });
        planned.values().forEach(post -> sequence.put(post.scheduledFor(), post.pillarCode()));
        List<Planned> result = new ArrayList<>();
        String previous = null;
        int sinceAppFeature = 0;
        for (Map.Entry<Instant, String> entry : sequence.entrySet()) {
            String pillar = entry.getValue();
            Planned post = planned.get(entry.getKey());
            if (Objects.isNull(pillar)) {
                pillar = appFeature && sinceAppFeature >= APP_FEATURE_EVERY - 1 && !ContentPillar.APP_FEATURE.equals(previous)
                        ? ContentPillar.APP_FEATURE : leastUsed(rotation, uses, factors, previous);
                uses.merge(pillar, 1, Integer::sum);
                post = new Planned(post.scheduledFor(), pillar, null);
            }
            if (Objects.nonNull(post)) {
                result.add(post);
            }
            if (ContentPillar.APP_FEATURE.equals(pillar)) {
                sinceAppFeature = 0;
            } else if (!ContentPillar.WINE_DAY.equals(pillar)) {
                sinceAppFeature++;
            }
            previous = pillar;
        }
        return result;
    }

    /**
     * The pillar with the fewest uses for its share (uses over weight times factor), the lower sort order on a tie; the
     * previous post's pillar only when it is the only one.
     */
    private static String leastUsed(List<ContentPillar> rotation, Map<String, Integer> uses, Map<String, Double> factors, String previous) {
        List<ContentPillar> candidates = rotation.stream().filter(pillar -> !pillar.code().equals(previous)).toList();
        return (candidates.isEmpty() ? rotation : candidates).stream()
                .min(Comparator.comparingDouble((ContentPillar pillar) -> uses.getOrDefault(pillar.code(), 0)
                        / (pillar.weight() * PillarWeighting.factorOf(factors, pillar.code()))).thenComparingInt(ContentPillar::sortOrder))
                .orElseThrow().code();
    }

    /**
     * The wine day posted on each free date of the window: wine days already posted (wherever they were moved) and dates
     * already taken are left out, and of two wine days on one date the lower priority number wins (then the code).
     */
    private static Map<LocalDate, WineDay> wineDayByDate(LocalDate from, LocalDate to, List<WineDay> wineDays, Set<String> posted,
            Set<LocalDate> taken) {
        Map<LocalDate, WineDay> byDate = new HashMap<>();
        wineDays.stream().filter(day -> Objects.nonNull(dateOf(day, from, to)) && !posted.contains(day.code())
                        && !taken.contains(dateOf(day, from, to)))
                .sorted(Comparator.comparingInt(WineDay::priority).thenComparing(WineDay::code))
                .forEach(day -> byDate.putIfAbsent(dateOf(day, from, to), day));
        return byDate;
    }

    /** The wine day's date inside the window, or null when it falls outside it (the window may span two years). */
    private static LocalDate dateOf(WineDay day, LocalDate from, LocalDate to) {
        for (int year = from.getYear(); year <= to.getYear(); year++) {
            LocalDate date = day.on(year);
            if (!date.isBefore(from) && !date.isAfter(to)) {
                return date;
            }
        }
        return null;
    }

    private List<LocalDate> slotsOf(LocalDate week, LocalDate from, LocalDate to) {
        List<LocalDate> slots = new ArrayList<>();
        for (LocalDate date = week; date.isBefore(week.plusWeeks(1)); date = date.plusDays(1)) {
            if (settings.slotDays().contains(date.getDayOfWeek()) && !date.isBefore(from) && !date.isAfter(to)) {
                slots.add(date);
            }
        }
        return slots;
    }

    /** Slot dates of the week after the window not taken yet: a later run plans them, so they count towards the week's maximum. */
    private int reservedSlots(LocalDate week, LocalDate to, Set<LocalDate> taken) {
        int reserved = 0;
        for (LocalDate date = to.plusDays(1); date.isBefore(week.plusWeeks(1)); date = date.plusDays(1)) {
            if (settings.slotDays().contains(date.getDayOfWeek()) && !taken.contains(date)) {
                reserved++;
            }
        }
        return reserved;
    }

    private Instant slotAt(LocalDate date) {
        return date.atTime(settings.slotTime()).atZone(settings.zone()).toInstant();
    }

    private Instant wineDayAt(LocalDate date) {
        return date.atTime(settings.wineDayTime()).atZone(settings.zone()).toInstant();
    }

    private LocalDate dateOf(Instant instant) {
        return instant.atZone(settings.zone()).toLocalDate();
    }

    private static LocalDate weekOf(LocalDate date) {
        return date.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
    }
}
