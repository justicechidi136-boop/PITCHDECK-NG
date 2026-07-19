import {
  calculateProfileCompleteness,
  calculatePitchCompleteness,
  canTransitionPitch,
  canTransitionVerification,
  isMimeAllowed,
  getMaxBytesForPurpose,
  calculateReviewAverage,
  validateFundingAmount,
} from "./stage3-domain.js";
import { PitchStatus, SponsorVerificationStatus, DocumentPurpose } from "./stage3-enums.js";

describe("calculateProfileCompleteness", () => {
  it("returns 100% for complete profile", () => {
    const result = calculateProfileCompleteness({
      firstName: "Ada",
      lastName: "Lovelace",
      headline: "Innovator",
      biography: "Bio",
      stateId: "state-id",
      sectorIds: ["sector-id"],
      organizationName: "Org",
    });
    expect(result.completionPercent).toBe(100);
    expect(result.blockingIssues).toHaveLength(0);
  });

  it("flags missing required fields", () => {
    const result = calculateProfileCompleteness({ firstName: "Ada" });
    expect(result.blockingIssues.length).toBeGreaterThan(0);
    expect(result.missingRequired).toContain("headline");
  });
});

describe("calculatePitchCompleteness", () => {
  it("blocks submission without profile completion", () => {
    const result = calculatePitchCompleteness({
      title: "Test",
      shortSummary: "Summary",
      problemStatement: "Problem",
      proposedSolution: "Solution",
      targetUsers: "Users",
      innovationStage: "IDEA",
      primarySectorId: "s1",
      stateId: "st1",
      businessModel: "Model",
      fundingAmountRequested: "1000000",
      useOfFunds: "R&D",
      termsAccepted: true,
      hasPitchDeck: true,
      profileCompletionPercent: 50,
      minProfileCompletion: 80,
    });
    expect(result.blockingIssues).toContain("Profile completion below 80%");
  });
});

describe("pitch transitions", () => {
  it("allows DRAFT to SUBMITTED", () => {
    expect(canTransitionPitch(PitchStatus.DRAFT, PitchStatus.SUBMITTED)).toBe(true);
  });

  it("forbids DRAFT to APPROVED", () => {
    expect(canTransitionPitch(PitchStatus.DRAFT, PitchStatus.APPROVED)).toBe(false);
  });
});

describe("verification transitions", () => {
  it("allows DRAFT to SUBMITTED", () => {
    expect(canTransitionVerification(SponsorVerificationStatus.DRAFT, SponsorVerificationStatus.SUBMITTED)).toBe(true);
  });
});

describe("file validation", () => {
  it("allows PDF for pitch deck", () => {
    expect(isMimeAllowed(DocumentPurpose.PITCH_DECK, "application/pdf")).toBe(true);
  });

  it("rejects HTML for pitch deck", () => {
    expect(isMimeAllowed(DocumentPurpose.PITCH_DECK, "text/html")).toBe(false);
  });

  it("enforces document size limit", () => {
    expect(getMaxBytesForPurpose(DocumentPurpose.PITCH_DECK)).toBe(15_728_640);
  });
});

describe("review scoring", () => {
  it("calculates average score", () => {
    const avg = calculateReviewAverage([
      { criterion: "problemClarity", score: 4 },
      { criterion: "solutionQuality", score: 2 },
    ] as never);
    expect(avg).toBe(3);
  });
});

describe("funding validation", () => {
  it("accepts valid NGN amounts", () => {
    expect(validateFundingAmount("1500000.50")).toBe(true);
  });

  it("rejects zero", () => {
    expect(validateFundingAmount("0")).toBe(false);
  });
});
