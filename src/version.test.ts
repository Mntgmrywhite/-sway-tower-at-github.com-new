import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { APP_VERSION } from "./native/native";

// The app has one version: package.json's. The Settings sheet shows it and the review ask is
// "once per version" by it (src/native/rate.ts), while the App Store shows the Xcode project's
// MARKETING_VERSION. Keep them the same, or the sheet and the store disagree.

describe("the app version", () => {
  it("is the same in package.json and the Xcode project", () => {
    const pbxproj = readFileSync(new URL("../ios/App/App.xcodeproj/project.pbxproj", import.meta.url), "utf8");
    const marketing = [...pbxproj.matchAll(/MARKETING_VERSION = ([^;]+);/g)].map((m) => m[1]!.trim());
    expect(marketing.length).toBeGreaterThan(0);
    for (const v of marketing) expect(v).toBe(APP_VERSION);
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
