import {
  PitchStatus,
  SponsorVerificationStatus,
  DocumentPurpose,
  REVIEW_CRITERIA,
  type CompletenessResult,
  type ReviewCriterion,
} from "@pitchdeck/contracts";

export const PITCH_MIN_PROFILE_COMPLETION_DEFAULT = 80;

export interface ProfileInput {
  displayName?: string | null;
  headline?: string | null;
  biography?: string | null;
  organizationName?: string | null;
  isIndependent?: boolean;
  stateId?: string | null;
  sectorIds?: string[];
  firstName?: string;
  lastName?: string;
}

export function calculateProfileCompleteness(input: ProfileInput): CompletenessResult {
  const missingRequired: string[] = [];
  const invalidSections: string[] = [];
  const blockingIssues: string[] = [];
  const recommendations: string[] = [];

  const checks: Array<{ key: string; weight: number; met: boolean; required?: boolean }> = [
    { key: "firstName", weight: 10, met: Boolean(input.firstName?.trim()), required: true },
    { key: "lastName", weight: 10, met: Boolean(input.lastName?.trim()), required: true },
    { key: "headline", weight: 15, met: Boolean(input.headline?.trim()), required: true },
    { key: "biography", weight: 20, met: Boolean(input.biography?.trim()), required: true },
    { key: "state", weight: 15, met: Boolean(input.stateId), required: true },
    {
      key: "sectors",
      weight: 15,
      met: Boolean(input.sectorIds && input.sectorIds.length > 0),
      required: true,
    },
    {
      key: "organization",
      weight: 15,
      met: Boolean(input.isIndependent || input.organizationName?.trim()),
      required: true,
    },
  ];

  let earned = 0;
  let total = 0;
  for (const check of checks) {
    total += check.weight;
    if (check.met) {
      earned += check.weight;
    } else if (check.required) {
      missingRequired.push(check.key);
      blockingIssues.push(`Missing required: ${check.key}`);
    }
  }

  if (!input.displayName?.trim()) {
    recommendations.push("Add a public display name");
  }

  return {
    completionPercent: Math.round((earned / total) * 100),
    missingRequired,
    invalidSections,
    blockingIssues,
    recommendations,
  };
}

export interface PitchInput {
  title?: string | null;
  shortSummary?: string | null;
  problemStatement?: string | null;
  proposedSolution?: string | null;
  targetUsers?: string | null;
  innovationStage?: string | null;
  primarySectorId?: string | null;
  stateId?: string | null;
  businessModel?: string | null;
  fundingAmountRequested?: string | null;
  useOfFunds?: string | null;
  termsAccepted?: boolean;
  hasPitchDeck?: boolean;
  profileCompletionPercent?: number;
  minProfileCompletion?: number;
}

export function calculatePitchCompleteness(input: PitchInput): CompletenessResult {
  const missingRequired: string[] = [];
  const blockingIssues: string[] = [];
  const recommendations: string[] = [];

  const requiredFields: Array<[string, boolean]> = [
    ["title", Boolean(input.title?.trim())],
    ["shortSummary", Boolean(input.shortSummary?.trim())],
    ["problemStatement", Boolean(input.problemStatement?.trim())],
    ["proposedSolution", Boolean(input.proposedSolution?.trim())],
    ["targetUsers", Boolean(input.targetUsers?.trim())],
    ["innovationStage", Boolean(input.innovationStage)],
    ["primarySector", Boolean(input.primarySectorId)],
    ["state", Boolean(input.stateId)],
    ["businessModel", Boolean(input.businessModel?.trim())],
    ["fundingAmount", Boolean(input.fundingAmountRequested && parseFloat(input.fundingAmountRequested) > 0)],
    ["useOfFunds", Boolean(input.useOfFunds?.trim())],
    ["termsAccepted", Boolean(input.termsAccepted)],
    ["pitchDeck", Boolean(input.hasPitchDeck)],
  ];

  let met = 0;
  for (const [key, ok] of requiredFields) {
    if (ok) {
      met += 1;
    } else {
      missingRequired.push(key);
      blockingIssues.push(`Missing required: ${key}`);
    }
  }

  const minProfile = input.minProfileCompletion ?? PITCH_MIN_PROFILE_COMPLETION_DEFAULT;
  if ((input.profileCompletionPercent ?? 0) < minProfile) {
    blockingIssues.push(`Profile completion below ${String(minProfile)}%`);
    missingRequired.push("profileCompletion");
  }

  const completionPercent = Math.round((met / requiredFields.length) * 100);

  if (!input.hasPitchDeck) {
    recommendations.push("Upload a pitch deck PDF");
  }

  return {
    completionPercent,
    missingRequired,
    invalidSections: [],
    blockingIssues,
    recommendations,
  };
}

const PITCH_TRANSITIONS: Record<PitchStatus, PitchStatus[]> = {
  [PitchStatus.DRAFT]: [PitchStatus.SUBMITTED],
  [PitchStatus.SUBMITTED]: [PitchStatus.UNDER_REVIEW, PitchStatus.WITHDRAWN],
  [PitchStatus.UNDER_REVIEW]: [
    PitchStatus.CHANGES_REQUESTED,
    PitchStatus.APPROVED,
    PitchStatus.REJECTED,
  ],
  [PitchStatus.CHANGES_REQUESTED]: [PitchStatus.SUBMITTED],
  [PitchStatus.APPROVED]: [PitchStatus.ARCHIVED],
  [PitchStatus.REJECTED]: [PitchStatus.ARCHIVED],
  [PitchStatus.WITHDRAWN]: [PitchStatus.ARCHIVED],
  [PitchStatus.ARCHIVED]: [],
};

export function canTransitionPitch(from: PitchStatus, to: PitchStatus): boolean {
  return PITCH_TRANSITIONS[from].includes(to);
}

const VERIFICATION_TRANSITIONS: Record<SponsorVerificationStatus, SponsorVerificationStatus[]> = {
  [SponsorVerificationStatus.DRAFT]: [SponsorVerificationStatus.SUBMITTED],
  [SponsorVerificationStatus.SUBMITTED]: [
    SponsorVerificationStatus.UNDER_REVIEW,
    SponsorVerificationStatus.CHANGES_REQUESTED,
    SponsorVerificationStatus.REJECTED,
  ],
  [SponsorVerificationStatus.UNDER_REVIEW]: [
    SponsorVerificationStatus.VERIFIED,
    SponsorVerificationStatus.CHANGES_REQUESTED,
    SponsorVerificationStatus.REJECTED,
  ],
  [SponsorVerificationStatus.CHANGES_REQUESTED]: [SponsorVerificationStatus.SUBMITTED],
  [SponsorVerificationStatus.VERIFIED]: [SponsorVerificationStatus.SUSPENDED],
  [SponsorVerificationStatus.REJECTED]: [SponsorVerificationStatus.SUBMITTED],
  [SponsorVerificationStatus.SUSPENDED]: [SponsorVerificationStatus.SUBMITTED],
};

export function canTransitionVerification(
  from: SponsorVerificationStatus,
  to: SponsorVerificationStatus,
): boolean {
  return VERIFICATION_TRANSITIONS[from].includes(to);
}

export const PITCH_DOCUMENT_PURPOSES: DocumentPurpose[] = [
  DocumentPurpose.PITCH_DECK,
  DocumentPurpose.PITCH_BUSINESS_PLAN,
  DocumentPurpose.PITCH_FINANCIAL_MODEL,
  DocumentPurpose.PITCH_PROTOTYPE_IMAGE,
  DocumentPurpose.PITCH_SUPPORTING_EVIDENCE,
];

export const SPONSOR_DOCUMENT_PURPOSES: DocumentPurpose[] = [
  DocumentPurpose.SPONSOR_REGISTRATION_CERT,
  DocumentPurpose.SPONSOR_PROOF_OF_ADDRESS,
  DocumentPurpose.SPONSOR_TAX_EVIDENCE,
  DocumentPurpose.SPONSOR_LETTER_OF_AUTHORITY,
];

const MIME_ALLOWLIST: Record<DocumentPurpose, { mimes: string[]; maxBytes: number }> = {
  [DocumentPurpose.PITCH_DECK]: {
    mimes: ["application/pdf"],
    maxBytes: 15_728_640,
  },
  [DocumentPurpose.PITCH_BUSINESS_PLAN]: {
    mimes: ["application/pdf"],
    maxBytes: 15_728_640,
  },
  [DocumentPurpose.PITCH_FINANCIAL_MODEL]: {
    mimes: [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ],
    maxBytes: 15_728_640,
  },
  [DocumentPurpose.PITCH_PROTOTYPE_IMAGE]: {
    mimes: ["image/png", "image/jpeg"],
    maxBytes: 8_388_608,
  },
  [DocumentPurpose.PITCH_SUPPORTING_EVIDENCE]: {
    mimes: ["application/pdf"],
    maxBytes: 15_728_640,
  },
  [DocumentPurpose.SPONSOR_REGISTRATION_CERT]: {
    mimes: ["application/pdf"],
    maxBytes: 15_728_640,
  },
  [DocumentPurpose.SPONSOR_PROOF_OF_ADDRESS]: {
    mimes: ["application/pdf"],
    maxBytes: 15_728_640,
  },
  [DocumentPurpose.SPONSOR_TAX_EVIDENCE]: {
    mimes: ["application/pdf"],
    maxBytes: 15_728_640,
  },
  [DocumentPurpose.SPONSOR_LETTER_OF_AUTHORITY]: {
    mimes: ["application/pdf"],
    maxBytes: 15_728_640,
  },
};

export function getAllowedMimeTypes(purpose: DocumentPurpose): string[] {
  return MIME_ALLOWLIST[purpose].mimes;
}

export function getMaxBytesForPurpose(purpose: DocumentPurpose): number {
  return MIME_ALLOWLIST[purpose].maxBytes;
}

export function isMimeAllowed(purpose: DocumentPurpose, mime: string): boolean {
  return getAllowedMimeTypes(purpose).includes(mime);
}

export function sanitizeDisplayFilename(filename: string): string {
  const base = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200);
  return base || "document";
}

export function calculateReviewAverage(
  scores: Array<{ criterion: ReviewCriterion; score: number }>,
): number {
  if (scores.length === 0) {
    return 0;
  }
  const validCriteria = new Set<string>(REVIEW_CRITERIA);
  const filtered = scores.filter((s) => validCriteria.has(s.criterion));
  const sum = filtered.reduce((acc, s) => acc + s.score, 0);
  return Math.round((sum / filtered.length) * 100) / 100;
}

export function validateFundingAmount(amount: string): boolean {
  const parsed = parseFloat(amount);
  return !Number.isNaN(parsed) && parsed > 0 && /^\d+(\.\d{1,2})?$/.test(amount);
}
