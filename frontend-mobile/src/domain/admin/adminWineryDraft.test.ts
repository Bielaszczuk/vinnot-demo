import { describe, expect, it } from "@jest/globals";
import type { AdminWinery } from "./admin.types";
import {
  adminWinerySection,
  draftCoordinates,
  toAdminWineryDraft,
  toAdminWineryPayload,
  validateAdminWineryDraft,
} from "./adminWineryDraft";

const winery: AdminWinery = {
  id: "winery-1",
  name: "Bodega Norte",
  countryName: "Argentina",
  countryId: "country-ar",
  regionName: "Mendoza",
  regionId: "region-mza",
  subregion: "Valle de Uco",
  description: null,
  descriptionEs: "Bodega de altura",
  descriptionEn: "High-altitude winery",
  address: "Ruta 89",
  latitude: -33.3712,
  longitude: -69.1517,
  email: "hola@norte.com",
  phone: "+5492614123456",
  website: "https://norte.com",
  logoUrl: "https://cdn.vinnot.com/logo.png",
  imageUrl: "https://cdn.vinnot.com/cover.jpg",
  establishedYear: 1902,
  winesCount: 3,
  createdAt: "2026-05-30T10:00:00.000Z",
};

describe("adminWineryDraft", () => {
  it("round-trips a stored winery into the same payload", () => {
    expect(toAdminWineryPayload(toAdminWineryDraft(winery))).toEqual({
      name: "Bodega Norte",
      countryId: "country-ar",
      regionId: "region-mza",
      subregion: "Valle de Uco",
      descriptionEs: "Bodega de altura",
      descriptionEn: "High-altitude winery",
      address: "Ruta 89",
      latitude: -33.3712,
      longitude: -69.1517,
      establishedYear: 1902,
      email: "hola@norte.com",
      phone: "+5492614123456",
      website: "https://norte.com",
      logoUrl: "https://cdn.vinnot.com/logo.png",
      imageUrl: "https://cdn.vinnot.com/cover.jpg",
    });
  });

  it("falls back to the legacy description and turns blanks into nulls", () => {
    const draft = toAdminWineryDraft({ ...winery, descriptionEs: null, description: "Legacy" });
    expect(draft.descriptionEs).toBe("Legacy");
    const empty = toAdminWineryPayload({ ...toAdminWineryDraft(), name: " Nueva ", countryId: "c" });
    expect(empty).toEqual({
      name: "Nueva",
      countryId: "c",
      regionId: null,
      subregion: null,
      descriptionEs: null,
      descriptionEn: null,
      address: null,
      latitude: null,
      longitude: null,
      establishedYear: null,
      email: null,
      phone: null,
      website: null,
      logoUrl: null,
      imageUrl: null,
    });
  });

  it("accepts coordinates typed with a comma", () => {
    const payload = toAdminWineryPayload({
      ...toAdminWineryDraft(winery),
      latitude: "-33,5",
      longitude: " -69,25 ",
    });
    expect(payload.latitude).toBe(-33.5);
    expect(payload.longitude).toBe(-69.25);
  });

  it("requires a name and a country", () => {
    expect(validateAdminWineryDraft(toAdminWineryDraft())).toEqual([
      { field: "name", code: "nameRequired" },
      { field: "countryId", code: "countryRequired" },
    ]);
  });

  it("rejects values the backend would refuse", () => {
    const long = (length: number) => "x".repeat(length);
    const errors = validateAdminWineryDraft(
      {
        ...toAdminWineryDraft(winery),
        name: long(256),
        descriptionEs: long(20001),
        descriptionEn: long(20001),
        subregion: long(101),
        address: long(501),
        phone: long(51),
        website: long(501),
        email: "not-an-email",
        latitude: "91",
        longitude: "abc",
        establishedYear: "2031",
      },
      2026,
    );
    expect(errors.map((error) => `${error.field}:${error.code}`)).toEqual([
      "name:nameTooLong",
      "descriptionEs:descriptionTooLong",
      "descriptionEn:descriptionTooLong",
      "establishedYear:yearInvalid",
      "subregion:subregionTooLong",
      "address:addressTooLong",
      "latitude:latitudeInvalid",
      "longitude:longitudeInvalid",
      "phone:phoneTooLong",
      "email:emailInvalid",
      "website:websiteTooLong",
    ]);
  });

  it("rejects a website that is not a web address and adds https:// when the scheme is missing", () => {
    const site = (value: string) =>
      validateAdminWineryDraft({ ...toAdminWineryDraft(winery), website: value }, 2026).map((error) => error.code);
    expect(site("bodega")).toEqual(["websiteInvalid"]);
    expect(site("ftp://bodega.com")).toEqual(["websiteInvalid"]);
    expect(site("mi bodega.com")).toEqual(["websiteInvalid"]);
    expect(site("www.bodega.com")).toEqual([]);
    expect(site("http://bodega.com.ar/vinos")).toEqual([]);
    expect(toAdminWineryPayload({ ...toAdminWineryDraft(winery), website: " www.bodega.com " }).website).toBe(
      "https://www.bodega.com",
    );
    expect(toAdminWineryPayload({ ...toAdminWineryDraft(winery), website: "" }).website).toBeNull();
  });

  it("rejects a phone with characters a phone number never has, and keeps imported formats", () => {
    const phone = (value: string) =>
      validateAdminWineryDraft({ ...toAdminWineryDraft(winery), phone: value }, 2026).map((error) => error.code);
    expect(phone("+542614567890bodega")).toEqual(["phoneInvalid"]);
    expect(phone("+54 261 412-3456")).toEqual([]);
    expect(phone("(0261) 412-3456")).toEqual([]);
  });

  it("checks the founding year range", () => {
    const year = (value: string) =>
      validateAdminWineryDraft({ ...toAdminWineryDraft(winery), establishedYear: value }, 2026);
    expect(year("999")).toEqual([{ field: "establishedYear", code: "yearInvalid" }]);
    expect(year("1000")).toEqual([]);
    expect(year("2026")).toEqual([]);
    expect(year("")).toEqual([]);
    expect(validateAdminWineryDraft({ ...toAdminWineryDraft(winery), establishedYear: "1902" })).toEqual([]);
  });

  it("puts every field in its form section", () => {
    expect(["name", "descriptionEn", "establishedYear"].map(adminWinerySection)).toEqual([
      "identity",
      "identity",
      "identity",
    ]);
    expect(["countryId", "regionId", "address", "latitude", "longitude", "subregion"].map(adminWinerySection)).toEqual(
      Array(6).fill("location"),
    );
    expect(["phone", "email", "website"].map(adminWinerySection)).toEqual(Array(3).fill("contact"));
    expect(["logoUrl", "imageUrl"].map(adminWinerySection)).toEqual(["images", "images"]);
  });

  it("gives the map a point only when both coordinates are valid", () => {
    expect(draftCoordinates({ latitude: "-33.1", longitude: "-69" })).toEqual({ latitude: -33.1, longitude: -69 });
    expect(draftCoordinates({ latitude: "", longitude: "-69" })).toEqual({ latitude: null, longitude: null });
    expect(draftCoordinates({ latitude: "x", longitude: "-69" })).toEqual({ latitude: null, longitude: null });
    expect(draftCoordinates({ latitude: "95", longitude: "-69" })).toEqual({ latitude: null, longitude: null });
  });
});
