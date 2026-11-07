import { expect, it, vi, afterEach } from "vitest";
import { galleryFilter, publicationInput } from "../shared/community";
import { privateWorkshop } from "./fixtures/workshop";
import {
  readCommunityIntent,
  saveCommunityIntent,
  clearCommunityIntent,
} from "../src/communityIntent";
afterEach(() => vi.unstubAllGlobals());
it("calculates publication characteristics from geometry rather than author-provided feature claims", () => {
  const p = publicationInput({
    document: privateWorkshop(),
    description: "Una descripción válida del recorrido.",
    difficulty: "hard",
    authorName: "Autor real",
    features: ["water", "moving"],
  });
  expect(p.features).toEqual([]);
  expect(p.stats).toMatchObject({ holes: 1, moving: 0 });
  expect(() =>
    publicationInput({
      document: privateWorkshop(),
      description: "corta",
      difficulty: "hard",
      authorName: "Autor real",
    }),
  ).toThrow(/Descripción/);
});
it("validates closed gallery filters and page bounds while preserving literal search text", () => {
  expect(galleryFilter(new URLSearchParams({ q: "' OR 1=1 --" })).q).toBe(
    "' OR 1=1 --",
  );
  for (const query of [
    "feature=__proto__",
    "feature=unknown",
    "page=0",
    "page=1.5",
    "difficulty=impossible",
    "authorId=not-a-uuid",
  ])
    expect(() => galleryFilter(new URLSearchParams(query))).toThrow(/Filtro/);
  expect(
    galleryFilter(new URLSearchParams("feature=water&feature=water")).features,
  ).toEqual(["water"]);
});
it("browses without local session storage and never treats unsent intent as a published creation", () => {
  vi.stubGlobal("sessionStorage", {
    getItem() {
      throw Error("blocked");
    },
    setItem() {
      throw Error("blocked");
    },
    removeItem() {
      throw Error("blocked");
    },
  });
  expect(readCommunityIntent("club-community-publish")).toBeNull();
  expect(saveCommunityIntent("club-community-publish", "1")).toBe(false);
  expect(() => clearCommunityIntent("club-community-target")).not.toThrow();
});
