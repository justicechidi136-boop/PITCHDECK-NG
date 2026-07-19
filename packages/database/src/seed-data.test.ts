import { NIGERIAN_STATES, INNOVATION_SECTORS, SYSTEM_ROLES } from "./seed-data";

describe("@pitchdeck/database seed data", () => {
  it("defines 37 Nigerian states including FCT", () => {
    expect(NIGERIAN_STATES).toHaveLength(37);
    expect(NIGERIAN_STATES.some((s) => s.code === "FC")).toBe(true);
  });

  it("defines 16 innovation sectors", () => {
    expect(INNOVATION_SECTORS).toHaveLength(16);
  });

  it("defines 7 system roles", () => {
    expect(SYSTEM_ROLES).toHaveLength(7);
  });

  it("has unique state codes", () => {
    const codes = NIGERIAN_STATES.map((s) => s.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("has unique sector slugs", () => {
    const slugs = INNOVATION_SECTORS.map((s) => s.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
