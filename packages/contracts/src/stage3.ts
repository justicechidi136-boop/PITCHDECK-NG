import { z } from "zod";
import {
  ProfileVisibility,
  OrganizationType,
  InnovationStage,
  DocumentPurpose,
  ReviewRecommendation,
  REVIEW_CRITERIA,
} from "./stage3-enums.js";
import {
  SponsorMembershipRole,
  SponsorVerificationStatus,
  PitchStatus,
  ConflictStatus,
} from "./stage3-enums.js";
import type {
  FileUploadStatus,
  FileScanStatus,
  ReviewAssignmentStatus,
} from "./stage3-enums.js";

export * from "./stage3-enums.js";

export interface PaginatedMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface CompletenessResult {
  completionPercent: number;
  missingRequired: string[];
  invalidSections: string[];
  blockingIssues: string[];
  recommendations: string[];
}

export interface InnovatorProfileDto {
  id: string;
  userId: string;
  displayName?: string;
  headline?: string;
  biography?: string;
  organizationName?: string;
  isIndependent: boolean;
  city?: string;
  stateId?: string;
  stateCode?: string;
  countryCode: string;
  websiteUrl?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  yearsOfExperience?: number;
  innovationInterests?: string;
  visibility: ProfileVisibility;
  completionPercent: number;
  sectorIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PublicInnovatorProfileDto {
  displayName?: string;
  headline?: string;
  biography?: string;
  organizationName?: string;
  isIndependent: boolean;
  city?: string;
  stateCode?: string;
  countryCode: string;
  websiteUrl?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  sectorNames: string[];
}

export interface SponsorOrganizationDto {
  id: string;
  legalName: string;
  displayName: string;
  slug: string;
  organizationType: OrganizationType;
  description?: string;
  websiteUrl?: string;
  countryCode: string;
  stateId?: string;
  stateCode?: string;
  city?: string;
  registrationNumber?: string;
  yearEstablished?: number;
  fundingInterest?: string;
  minFundingAmount?: string;
  maxFundingAmount?: string;
  preferredStages: InnovationStage[];
  preferredStateCodes: string[];
  sectorIds: string[];
  verificationStatus: SponsorVerificationStatus;
  verificationSubmittedAt?: string;
  verifiedAt?: string;
  decisionReason?: string;
  lockVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface SponsorMembershipDto {
  id: string;
  organizationId: string;
  userId: string;
  userEmail: string;
  userName: string;
  role: SponsorMembershipRole;
  status: string;
  createdAt: string;
}

export interface PitchDto {
  id: string;
  ownerId: string;
  title: string;
  slug: string;
  shortSummary?: string;
  problemStatement?: string;
  proposedSolution?: string;
  targetUsers?: string;
  innovationStage?: InnovationStage;
  primarySectorId?: string;
  additionalSectorIds: string[];
  stateId?: string;
  stateCode?: string;
  geographicReach?: string;
  businessModel?: string;
  competitiveAdvantage?: string;
  currentTraction?: string;
  teamDescription?: string;
  socialImpact?: string;
  scalability?: string;
  risksAndMitigations?: string;
  ipStatus?: string;
  fundingAmountRequested?: string;
  fundingCurrency: string;
  useOfFunds?: string;
  expectedMilestones?: string;
  developmentTimeline?: string;
  termsAccepted: boolean;
  status: PitchStatus;
  currentDraftVersion: number;
  lastSubmittedVersion?: number;
  lockVersion: number;
  submittedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  withdrawnAt?: string;
  discoverySuspended: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PitchSubmissionDto {
  id: string;
  pitchId: string;
  version: number;
  submittedById: string;
  submittedAt: string;
  snapshot: Record<string, unknown>;
  profileCompletionAtSubmit: number;
  reviewStatus: PitchStatus;
  decisionAt?: string;
  documentIds: string[];
}

export interface FileAssetDto {
  id: string;
  purpose: DocumentPurpose;
  originalFilename: string;
  displayFilename: string;
  declaredMimeType: string;
  detectedMimeType?: string;
  sizeBytes?: string;
  uploadStatus: FileUploadStatus;
  scanStatus: FileScanStatus;
  scanMessage?: string;
  createdAt: string;
  finalizedAt?: string;
}

export interface UploadIntentDto {
  fileId: string;
  uploadUrl: string;
  expiresAt: string;
  maxBytes: number;
}

export interface ReviewAssignmentDto {
  id: string;
  submissionId: string;
  pitchId: string;
  pitchTitle: string;
  reviewerId: string;
  status: ReviewAssignmentStatus;
  conflictStatus: ConflictStatus;
  assignedAt: string;
  dueAt?: string;
  acceptedAt?: string;
  completedAt?: string;
}

export interface PitchReviewDto {
  id: string;
  assignmentId: string;
  recommendation: ReviewRecommendation;
  strengths?: string;
  risks?: string;
  questions?: string;
  requiredChanges?: string;
  applicantVisibleNotes?: string;
  averageScore?: number;
  scores: Array<{ criterion: string; score: number }>;
  submittedAt: string;
}

export interface DiscoveryPitchDto {
  id: string;
  pitchId: string;
  title: string;
  shortSummary?: string;
  problemStatement?: string;
  proposedSolution?: string;
  socialImpact?: string;
  currentTraction?: string;
  innovationStage?: InnovationStage;
  primarySectorName?: string;
  stateCode?: string;
  fundingAmountRequested?: string;
  fundingCurrency: string;
  approvedAt?: string;
  innovatorProfile?: PublicInnovatorProfileDto;
  documentIds: string[];
}

const uuidSchema = z.string().uuid();
const reasonSchema = z.string().min(1).max(2000);
const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
}).strict();

export const uuidParamSchema = z.object({
  id: uuidSchema,
}).strict();

export const updateInnovatorProfileSchema = z.object({
  displayName: z.string().min(1).max(150).optional(),
  headline: z.string().min(1).max(200).optional(),
  biography: z.string().min(1).max(3000).optional(),
  organizationName: z.string().max(200).optional(),
  isIndependent: z.boolean().optional(),
  city: z.string().max(100).optional(),
  stateId: z.string().uuid().optional(),
  websiteUrl: z.string().url().max(500).optional().or(z.literal("")),
  linkedinUrl: z.string().url().max(500).optional().or(z.literal("")),
  portfolioUrl: z.string().url().max(500).optional().or(z.literal("")),
  yearsOfExperience: z.number().int().min(0).max(80).optional(),
  innovationInterests: z.string().max(1000).optional(),
  visibility: z.nativeEnum(ProfileVisibility).optional(),
  sectorIds: z.array(z.string().uuid()).max(10).optional(),
}).strict();

export const createPitchSchema = z.object({
  title: z.string().min(3).max(200),
}).strict();

export const updatePitchSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  shortSummary: z.string().max(500).optional(),
  problemStatement: z.string().max(5000).optional(),
  proposedSolution: z.string().max(5000).optional(),
  targetUsers: z.string().max(2000).optional(),
  innovationStage: z.nativeEnum(InnovationStage).optional(),
  primarySectorId: z.string().uuid().optional(),
  additionalSectorIds: z.array(z.string().uuid()).max(5).optional(),
  stateId: z.string().uuid().optional(),
  geographicReach: z.string().max(1000).optional(),
  businessModel: z.string().max(3000).optional(),
  competitiveAdvantage: z.string().max(3000).optional(),
  currentTraction: z.string().max(3000).optional(),
  teamDescription: z.string().max(3000).optional(),
  socialImpact: z.string().max(3000).optional(),
  scalability: z.string().max(3000).optional(),
  risksAndMitigations: z.string().max(3000).optional(),
  ipStatus: z.string().max(1000).optional(),
  fundingAmountRequested: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  useOfFunds: z.string().max(3000).optional(),
  expectedMilestones: z.string().max(3000).optional(),
  developmentTimeline: z.string().max(2000).optional(),
  termsAccepted: z.boolean().optional(),
  lockVersion: z.number().int().min(0),
}).strict();

export const createOrganizationSchema = z.object({
  legalName: z.string().min(2).max(200),
  displayName: z.string().min(2).max(200),
  organizationType: z.nativeEnum(OrganizationType),
  description: z.string().max(3000).optional(),
  websiteUrl: z.string().url().max(500).optional().or(z.literal("")),
  stateId: z.string().uuid().optional(),
  city: z.string().max(100).optional(),
}).strict();

export const updateOrganizationSchema = z.object({
  legalName: z.string().min(2).max(200).optional(),
  displayName: z.string().min(2).max(200).optional(),
  description: z.string().max(3000).optional(),
  websiteUrl: z.string().url().max(500).optional().or(z.literal("")),
  stateId: uuidSchema.optional(),
  city: z.string().max(100).optional(),
  registrationNumber: z.string().max(100).optional(),
  yearEstablished: z.number().int().min(1800).max(2200).optional(),
  fundingInterest: z.string().max(2000).optional(),
  lockVersion: z.number().int().min(0),
}).strict();

export const addSponsorMemberSchema = z.object({
  email: z.string().email().max(255),
  role: z.nativeEnum(SponsorMembershipRole),
}).strict();

export const uploadIntentSchema = z.object({
  purpose: z.nativeEnum(DocumentPurpose),
  originalFilename: z.string().min(1).max(255),
  declaredMimeType: z.string().min(1).max(100),
  sizeBytes: z.number().int().positive(),
  pitchId: z.string().uuid().optional(),
  organizationId: z.string().uuid().optional(),
}).strict();

export const conflictDeclarationSchema = z.object({
  status: z.nativeEnum(ConflictStatus),
  explanation: z.string().max(1000).optional(),
}).strict();

export const submitReviewSchema = z.object({
  recommendation: z.nativeEnum(ReviewRecommendation),
  strengths: z.string().max(3000).optional(),
  risks: z.string().max(3000).optional(),
  questions: z.string().max(3000).optional(),
  requiredChanges: z.string().max(3000).optional(),
  confidentialNotes: z.string().max(3000).optional(),
  applicantVisibleNotes: z.string().max(3000).optional(),
  scores: z.array(
    z.object({
      criterion: z.enum(REVIEW_CRITERIA),
      score: z.number().int().min(1).max(5),
    }),
  ).length(REVIEW_CRITERIA.length),
}).strict();

export const discoveryFiltersSchema = z.object({
  sectorId: z.string().uuid().optional(),
  stateCode: z.string().max(10).optional(),
  innovationStage: z.nativeEnum(InnovationStage).optional(),
  minFunding: z.string().optional(),
  maxFunding: z.string().optional(),
  keyword: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
}).strict();

export const adminPitchFiltersSchema = paginationSchema.extend({
  status: z.nativeEnum(PitchStatus).optional(),
  stateId: uuidSchema.optional(),
}).strict();

export const adminSponsorOrganizationFiltersSchema = paginationSchema.extend({
  status: z.nativeEnum(SponsorVerificationStatus).optional(),
}).strict();

export const assignReviewerSchema = z.object({
  reviewerId: uuidSchema,
}).strict();

export const workflowReasonSchema = z.object({
  reason: reasonSchema,
}).strict();

export const optionalWorkflowReasonSchema = z.object({
  reason: reasonSchema.optional(),
}).strict();
