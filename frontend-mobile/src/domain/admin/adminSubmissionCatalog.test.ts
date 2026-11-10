import {
  defaultSubmissionReason,
  emptySubmissionDecisionDraft,
  submissionCatalogValues,
  toSubmissionDecisionPayload,
  validateSubmissionDecision,
} from "./adminSubmissionCatalog";

it("marks each submitted value as an existing catalog entry or a proposed new one", () => {
  expect(
    submissionCatalogValues({
      wineryName: "Catena Zapata",
      wineryId: "w",
      country: "Argentina",
      countryId: "c",
      region: "Valle Oculto",
      regionId: null,
      grapes: ["Malbec", "Uva Nueva"],
      proposedGrapes: ["Uva Nueva"],
    }),
  ).toEqual([
    { field: "winery", value: "Catena Zapata", proposed: false },
    { field: "country", value: "Argentina", proposed: false },
    { field: "region", value: "Valle Oculto", proposed: true },
    { field: "grape", value: "Malbec", proposed: false },
    { field: "grape", value: "Uva Nueva", proposed: true },
  ]);
});

it("skips empty values", () => {
  expect(
    submissionCatalogValues({
      wineryName: "Bodega",
      wineryId: null,
      country: null,
      countryId: null,
      region: null,
      regionId: null,
      grapes: [],
      proposedGrapes: [],
    }),
  ).toEqual([{ field: "winery", value: "Bodega", proposed: true }]);
});

describe("submission decision draft", () => {
  it("starts empty with the first preset of the decision", () => {
    expect(emptySubmissionDecisionDraft()).toEqual({
      decision: "APPROVE_NEW", reasonCode: "VERIFIED_LABEL", reasonNote: "", targetWine: null,
      wineName: "", wineryName: "", wineType: null, vintage: "", grapes: [], country: null,
      region: null, alcoholContent: "",
    });
    expect(defaultSubmissionReason("REJECT")).toBe("NOT_A_WINE");
  });

  it("asks for a note only under Other, a wine only for a merge and valid numbers only for an approval", () => {
    const draft = emptySubmissionDecisionDraft();
    expect(validateSubmissionDecision(draft)).toEqual([]);
    expect(validateSubmissionDecision({ ...draft, reasonCode: "OTHER", reasonNote: "  " })).toEqual([
      { field: "reasonNote", code: "reasonRequired" },
    ]);
    expect(validateSubmissionDecision({ ...draft, decision: "MERGE_EXISTING", reasonCode: "ALREADY_IN_CATALOG" }))
      .toEqual([{ field: "targetWine", code: "targetWineRequired" }]);
    expect(validateSubmissionDecision({ ...draft, vintage: "20x", alcoholContent: "140" })).toEqual([
      { field: "vintage", code: "vintageInvalid" },
      { field: "alcoholContent", code: "alcoholInvalid" },
    ]);
    expect(validateSubmissionDecision({ ...draft, vintage: "1799" })).toEqual([{ field: "vintage", code: "vintageInvalid" }]);
    // Hidden corrections never block another decision.
    expect(validateSubmissionDecision({ ...draft, decision: "REJECT", reasonCode: "NOT_A_WINE", vintage: "x" })).toEqual([]);
    expect(validateSubmissionDecision({ ...draft, vintage: "2019", alcoholContent: "13,5" })).toEqual([]);
  });

  it("keeps the previous payload of an approval without corrections", () => {
    expect(toSubmissionDecisionPayload(emptySubmissionDecisionDraft(), "Datos verificados")).toEqual({
      decision: "APPROVE_NEW",
      reason: "Datos verificados",
      targetWineId: undefined,
      wineName: undefined,
      wineryName: undefined,
      wineType: undefined,
      vintage: undefined,
      alcoholContent: undefined,
      country: undefined,
      region: undefined,
      grapes: undefined,
    });
  });

  it("sends typed corrections for an approval and the picked wine for a merge", () => {
    const corrected = {
      ...emptySubmissionDecisionDraft(),
      wineName: " Gran Reserva ", wineryName: "Catena Zapata", wineType: "RED", vintage: "2019",
      grapes: ["Malbec", "Cabernet Franc"], country: { id: "ar", name: "Argentina" },
      region: { id: "mza", name: "Mendoza" }, alcoholContent: "13,5",
    };
    expect(toSubmissionDecisionPayload(corrected, "ok")).toEqual({
      decision: "APPROVE_NEW", reason: "ok", targetWineId: undefined, wineName: "Gran Reserva",
      wineryName: "Catena Zapata", wineType: "RED", vintage: 2019, alcoholContent: 13.5,
      country: "Argentina", region: "Mendoza", grapes: ["Malbec", "Cabernet Franc"],
    });
    expect(toSubmissionDecisionPayload(
      { ...corrected, decision: "MERGE_EXISTING", targetWine: { id: "wine-1", name: "Malbec" } }, "dup",
    )).toEqual({
      decision: "MERGE_EXISTING", reason: "dup", targetWineId: "wine-1", wineName: undefined,
      wineryName: undefined, wineType: undefined, vintage: undefined, alcoholContent: undefined,
      country: undefined, region: undefined, grapes: undefined,
    });
  });
});
