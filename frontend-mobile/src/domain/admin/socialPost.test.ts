import { describe, expect, it } from "@jest/globals";
import {
  ARGENTINA_TIME_ZONE,
  PUBLISHING_ERRORS,
  SOCIAL_POST_ACTION_ERRORS,
  argentinaInstant,
  argentinaTime,
  toArgentinaDateTime,
  LEGAL_LINES,
  SOCIAL_POST_REJECT_REASONS,
  allowedActions,
  canRequestIllustration,
  canRetryPublication,
  canSwitchAutoApprove,
  captionHasLegalLine,
  copyDraftErrors,
  copyFromDraft,
  draftFromCopy,
  emptyCopyDraft,
  formatPillarFactor,
  isLanguagePending,
  isMediaPending,
  localizedName,
  metricEntries,
  parseHashtags,
  slidesFor,
  toSocialPostLanguage,
  wineDayYears,
  wineDaysOfCurrentAndNextMonth,
  type SocialPost,
  type SocialPostCopy,
  type SocialPostMedia,
  type WineDay,
} from "./socialPost";

const copy: SocialPostCopy = {
  hook: "Malbec day",
  slides: [
    { title: "Uno", body: "Cuerpo uno" },
    { title: "Dos", body: "Cuerpo dos" },
    { title: "Tres", body: "Cuerpo tres" },
  ],
  caption: `Brindemos.\n\n${LEGAL_LINES.es}`,
  hashtags: ["#vinnot", "#malbec", "#vino", "#argentina", "#wine"],
  altText: "Una copa",
  cta: "Seguinos",
  illustration: "a glass",
};

const media: SocialPostMedia = {
  status: "READY",
  source: "AI",
  error: null,
  illustrationReason: null,
  heroUrl: null,
  slides: {
    es: { instagram: ["ig-1", "ig-2"], tiktok: ["tt-1"], renderedFor: "hash-es" },
    en: null,
  },
  updatedAt: null,
};

function post(overrides: Partial<SocialPost> = {}): Pick<SocialPost, "status" | "copies" | "media"> {
  return { status: "PENDING_APPROVAL", copies: { es: copy, en: null }, media, ...overrides };
}

describe("social post languages", () => {
  it("maps the app language to the language of the copy, Spanish by default", () => {
    expect(toSocialPostLanguage("en-US")).toBe("en");
    expect(toSocialPostLanguage("EN")).toBe("en");
    expect(toSocialPostLanguage("es-AR")).toBe("es");
    expect(toSocialPostLanguage(undefined)).toBe("es");
  });

  it("shows a language without copy as pending", () => {
    expect(isLanguagePending(post(), "es")).toBe(false);
    expect(isLanguagePending(post(), "en")).toBe(true);
  });

  it("reads the rendered slides of one language and format, empty when that language is not rendered", () => {
    expect(slidesFor(media, "es", "INSTAGRAM")).toEqual(["ig-1", "ig-2"]);
    expect(slidesFor(media, "es", "TIKTOK")).toEqual(["tt-1"]);
    expect(slidesFor(media, "en", "INSTAGRAM")).toEqual([]);
    expect(slidesFor(null, "es", "INSTAGRAM")).toEqual([]);
  });

  it("names a pillar or wine day in the requested language", () => {
    const pillar = { nameEs: "Uvas", nameEn: "Grapes" };
    expect(localizedName(pillar, "es")).toBe("Uvas");
    expect(localizedName(pillar, "en")).toBe("Grapes");
  });
});

describe("copy draft", () => {
  it("checks the legal line of each language", () => {
    expect(captionHasLegalLine(copy.caption, "es")).toBe(true);
    expect(captionHasLegalLine(copy.caption, "en")).toBe(false);
    expect(LEGAL_LINES.en).toBe("Drink responsibly. Not for sale to anyone under 18.");
  });

  it("parses hashtags typed with spaces, commas or line breaks and adds the missing #", () => {
    expect(parseHashtags("vinnot, #malbec\nvino  ")).toEqual(["#vinnot", "#malbec", "#vino"]);
  });

  it("round-trips a copy through the draft and appends the legal line of the edited language", () => {
    const draft = draftFromCopy(copy);
    expect(draft.hashtags).toBe("#vinnot #malbec #vino #argentina #wine");
    expect(copyFromDraft(draft, "es").caption).toBe(copy.caption);

    const english = copyFromDraft({ ...draft, caption: "  Cheers  " }, "en");
    expect(english.caption).toBe(`Cheers\n\n${LEGAL_LINES.en}`);
    expect(english).not.toHaveProperty("illustration");
  });

  it("starts an empty draft with the minimum slides and reports every missing field", () => {
    const draft = emptyCopyDraft();
    expect(draft.slides).toHaveLength(3);
    expect(copyDraftErrors(draft, "es")).toEqual([
      "HOOK_REQUIRED",
      "SLIDE_INCOMPLETE",
      "CAPTION_REQUIRED",
      "HASHTAGS_COUNT",
      "HASHTAGS_VINNOT",
      "CTA_REQUIRED",
    ]);
    expect(copyDraftErrors(draftFromCopy(copy), "es")).toEqual([]);
  });

  it("reports the copy limits", () => {
    const long = (length: number) => "x".repeat(length);
    const draft = {
      ...draftFromCopy(copy),
      hook: long(61),
      slides: [{ title: long(41), body: long(161) }],
      caption: long(600),
      hashtags: "#a #b",
      altText: long(201),
    };
    expect(copyDraftErrors(draft, "en")).toEqual([
      "HOOK_TOO_LONG",
      "SLIDES_COUNT",
      "SLIDE_TITLE_TOO_LONG",
      "SLIDE_BODY_TOO_LONG",
      "CAPTION_TOO_LONG",
      "HASHTAGS_COUNT",
      "HASHTAGS_VINNOT",
      "ALT_TEXT_TOO_LONG",
    ]);
  });
});

describe("review actions", () => {
  it("approves, rejects and edits a pending post in a language with copy, and regenerates it", () => {
    expect(allowedActions(post(), "es")).toEqual(["approve", "reject", "edit", "regenerate"]);
    expect(allowedActions(post(), "en")).toEqual(["approve", "reject", "regenerate"]);
  });

  it("regenerates an approved post too, so a missing language can be filled (it goes back to pending)", () => {
    expect(allowedActions(post({ status: "APPROVED" }), "es")).toEqual(["reject", "edit", "regenerate"]);
    expect(allowedActions(post({ status: "APPROVED" }), "en")).toEqual(["reject", "regenerate"]);
  });

  it("regenerates a rejected post and leaves draft, scheduled and published ones alone", () => {
    expect(allowedActions(post({ status: "REJECTED" }), "es")).toEqual(["regenerate"]);
    expect(allowedActions(post({ status: "DRAFT" }), "es")).toEqual([]);
    expect(allowedActions(post({ status: "SCHEDULED" }), "es")).toEqual([]);
    expect(allowedActions(post({ status: "PUBLISHED" }), "es")).toEqual([]);
  });

  it("asks for a new illustration while some language has copy and the post is not published", () => {
    expect(canRequestIllustration(post())).toBe(true);
    expect(canRequestIllustration(post({ copies: { es: null, en: null } }))).toBe(false);
    expect(canRequestIllustration(post({ status: "PUBLISHED" }))).toBe(false);
    expect(canRequestIllustration(post({ status: "SCHEDULED" }))).toBe(false);
    expect(canRequestIllustration(post({ status: "FAILED" }))).toBe(true);
  });

  it("knows when the slides are still rendering", () => {
    expect(isMediaPending(post({ media: { ...media, status: "PENDING" } }))).toBe(true);
    expect(isMediaPending(post())).toBe(false);
    expect(isMediaPending(undefined)).toBe(false);
  });

  it("offers one-tap reject reasons that end with Other", () => {
    expect(SOCIAL_POST_REJECT_REASONS.at(-1)).toBe("OTHER");
  });
});

describe("wine day calendar", () => {
  const day = (date: string, code = date): WineDay => ({
    code,
    nameEs: code,
    nameEn: code,
    kind: "GRAPE",
    priority: 1,
    countryCode: null,
    date,
  });

  it("asks for next year too when next month is January", () => {
    expect(wineDayYears(new Date(2026, 10, 3))).toEqual([2026]);
    expect(wineDayYears(new Date(2026, 11, 3))).toEqual([2026, 2027]);
  });

  it("keeps the days of this month and the next, sorted by date", () => {
    const days = [day("2026-12-04"), day("2026-11-07"), day("2027-01-02"), day("2026-10-30")];
    expect(wineDaysOfCurrentAndNextMonth(days, new Date(2026, 10, 3)).map((d) => d.date)).toEqual([
      "2026-11-07",
      "2026-12-04",
    ]);
    expect(wineDaysOfCurrentAndNextMonth(days, new Date(2026, 11, 3)).map((d) => d.date)).toEqual([
      "2026-12-04",
      "2027-01-02",
    ]);
  });
});

describe("social publications", () => {
  it("offers a retry only for a publication that failed", () => {
    expect(canRetryPublication({ status: "FAILED" })).toBe(true);
    for (const status of ["QUEUED", "PUBLISHING", "PUBLISHED", "DRAFT_SENT"] as const) {
      expect(canRetryPublication({ status })).toBe(false);
    }
  });

  it("lists only the metrics the network gave, in a fixed order", () => {
    expect(
      metricEntries({ views: 1200, reach: null, likes: 0, comments: 4, saves: null, shares: 2, follows: null }),
    ).toEqual([
      { metric: "views", value: 1200 },
      { metric: "likes", value: 0 },
      { metric: "comments", value: 4 },
      { metric: "shares", value: 2 },
    ]);
    expect(metricEntries(null)).toEqual([]);
  });
});

describe("content pillar settings", () => {
  it("shows the performance factor as a multiplier with two decimals", () => {
    expect(formatPillarFactor(1.25)).toBe("×1.25");
    expect(formatPillarFactor(1)).toBe("×1.00");
    expect(formatPillarFactor(0.5)).toBe("×0.50");
  });

  it("lets auto-approval change only while the pillar is active", () => {
    expect(canSwitchAutoApprove({ active: true })).toBe(true);
    expect(canSwitchAutoApprove({ active: false })).toBe(false);
  });
});

describe("publishing error codes", () => {
  it("knows every code the backend reports, including a post no longer scheduled and publishing switched off", () => {
    expect(PUBLISHING_ERRORS).toEqual(expect.arrayContaining(["POST_NOT_SCHEDULED", "PUBLISHING_OFF", "MEDIA_NOT_PUBLIC"]));
    expect(PUBLISHING_ERRORS).toHaveLength(11);
  });
});

describe("Argentina schedule time", () => {
  it("names the zone the planner uses", () => {
    expect(ARGENTINA_TIME_ZONE).toBe("America/Argentina/Buenos_Aires");
  });

  it("reads an instant as the Argentina date and time, also when the UTC date is the next day", () => {
    expect(toArgentinaDateTime("2026-11-07T12:00:00Z")).toEqual({ date: "2026-11-07", time: "09:00" });
    expect(toArgentinaDateTime("2026-11-08T02:30:00.000Z")).toEqual({ date: "2026-11-07", time: "23:30" });
  });

  it("turns an Argentina date and time into an ISO instant, and refuses one that is not a real date and time", () => {
    expect(argentinaInstant({ date: "2026-11-10", time: "12:30" })).toBe("2026-11-10T15:30:00.000Z");
    expect(argentinaInstant({ date: "2026-11-07", time: "23:30" })).toBe("2026-11-08T02:30:00.000Z");
    expect(argentinaInstant({ date: "", time: "12:30" })).toBeNull();
    expect(argentinaInstant({ date: "2026-11-10", time: "25:99" })).toBeNull();
  });

  it("round-trips an instant through the Argentina date and time", () => {
    const instant = "2026-12-31T23:45:00.000Z";
    expect(argentinaInstant(toArgentinaDateTime(instant))).toBe(instant);
  });

  it("shows the Argentina time of an instant in 24-hour format", () => {
    expect(argentinaTime("2026-11-10T22:30:00Z")).toBe("19:30");
    expect(argentinaTime("2026-11-10T03:05:00Z")).toBe("00:05");
  });
});

describe("reschedule and publish now error codes", () => {
  it("knows each code the backend answers to both actions", () => {
    expect(SOCIAL_POST_ACTION_ERRORS).toEqual([
      "INVALID_POST_TRANSITION",
      "SOCIAL_POST_SCHEDULE_NOT_FUTURE",
      "SOCIAL_POST_DATE_TAKEN",
      "SOCIAL_POST_MEDIA_NOT_READY",
      "SOCIAL_PUBLISHING_OFF",
    ]);
  });
});
