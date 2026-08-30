import { describe, expect, it } from "vitest";

import {
  formatDate,
  isIsoDate,
  startOfDay,
  startOfMonth,
  todayIso,
} from "@/lib/dates";

describe("isIsoDate", () => {
  it("przyjmuje prawdziwą datę w zapisie ISO", () => {
    expect(isIsoDate("2026-08-12")).toBe(true);
    expect(isIsoDate(" 2026-08-12 ")).toBe(true);
  });

  it("odrzuca dzień, którego nie ma w kalendarzu", () => {
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("2026-13-01")).toBe(false);
  });

  it("wymaga pełnego zapisu z zerami", () => {
    expect(isIsoDate("2026-8-12")).toBe(false);
    expect(isIsoDate("12.08.2026")).toBe(false);
    expect(isIsoDate("")).toBe(false);
    expect(isIsoDate(null)).toBe(false);
  });

  it("zna lata przestępne", () => {
    expect(isIsoDate("2028-02-29")).toBe(true);
    expect(isIsoDate("2026-02-29")).toBe(false);
  });
});

describe("todayIso", () => {
  it("bierze datę z zegara urządzenia, nie z UTC", () => {
    expect(todayIso(new Date(2026, 7, 12, 12, 0))).toBe("2026-08-12");
    // Pół godziny po północy to lokalnie już nowy dzień, choć w UTC bywa jeszcze wczoraj.
    expect(todayIso(new Date(2026, 0, 1, 0, 30))).toBe("2026-01-01");
  });
});

describe("formatDate", () => {
  it("pokazuje datę tak, jak stoi na fakturze", () => {
    expect(formatDate("2026-08-12")).toBe("12.08.2026");
  });

  it("brak daty pokazuje jako kreskę", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate("2026-02-30")).toBe("—");
  });
});

describe("startOfDay", () => {
  it("cofa do lokalnej północy tego samego dnia", () => {
    const start = startOfDay(new Date(2026, 7, 12, 23, 59, 59));
    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(7);
    expect(start.getDate()).toBe(12);
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
  });
});

describe("startOfMonth", () => {
  it("cofa do pierwszego dnia miesiąca", () => {
    const start = startOfMonth(new Date(2026, 7, 12, 23, 59, 59));
    expect(start.getMonth()).toBe(7);
    expect(start.getDate()).toBe(1);
    expect(start.getHours()).toBe(0);
  });
});
