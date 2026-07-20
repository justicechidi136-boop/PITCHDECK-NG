-- Stage 3: Innovator profiles, sponsor organizations, pitches, files, reviews

-- CreateEnum
CREATE TYPE "ProfileVisibility" AS ENUM ('PUBLIC', 'PRIVATE');
CREATE TYPE "OrganizationType" AS ENUM ('CORPORATE', 'ANGEL_NETWORK', 'VENTURE_CAPITAL', 'FOUNDATION', 'NGO', 'GOVERNMENT_AGENCY', 'UNIVERSITY', 'RESEARCH_INSTITUTION', 'INCUBATOR', 'ACCELERATOR', 'DIASPORA_GROUP', 'PHILANTHROPIST', 'OTHER');
CREATE TYPE "SponsorMembershipRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');
CREATE TYPE "SponsorMembershipStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'REMOVED');
CREATE TYPE "SponsorVerificationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'CHANGES_REQUESTED', 'VERIFIED', 'REJECTED', 'SUSPENDED');
CREATE TYPE "InnovationStage" AS ENUM ('IDEA', 'RESEARCH', 'PROTOTYPE', 'PILOT', 'EARLY_REVENUE', 'GROWTH', 'SCALING');
CREATE TYPE "PitchStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED', 'WITHDRAWN', 'ARCHIVED');
CREATE TYPE "FileUploadStatus" AS ENUM ('PENDING_UPLOAD', 'UPLOADED', 'PENDING_SCAN', 'AVAILABLE', 'REJECTED', 'DELETED');
CREATE TYPE "FileScanStatus" AS ENUM ('PENDING', 'SCANNING', 'CLEAN', 'INFECTED', 'FAILED', 'SKIPPED');
CREATE TYPE "DocumentPurpose" AS ENUM ('PITCH_DECK', 'PITCH_BUSINESS_PLAN', 'PITCH_FINANCIAL_MODEL', 'PITCH_PROTOTYPE_IMAGE', 'PITCH_SUPPORTING_EVIDENCE', 'SPONSOR_REGISTRATION_CERT', 'SPONSOR_PROOF_OF_ADDRESS', 'SPONSOR_TAX_EVIDENCE', 'SPONSOR_LETTER_OF_AUTHORITY');
CREATE TYPE "ReviewAssignmentStatus" AS ENUM ('ASSIGNED', 'ACCEPTED', 'DECLINED', 'COMPLETED', 'REVOKED');
CREATE TYPE "ConflictStatus" AS ENUM ('NOT_DECLARED', 'NO_CONFLICT', 'POTENTIAL_CONFLICT', 'CONFIRMED_CONFLICT');
CREATE TYPE "ReviewRecommendation" AS ENUM ('APPROVE', 'REQUEST_CHANGES', 'REJECT');

-- Extend AuditAction enum
ALTER TYPE "AuditAction" ADD VALUE 'PROFILE_UPDATE';
ALTER TYPE "AuditAction" ADD VALUE 'ORGANIZATION_CREATE';
ALTER TYPE "AuditAction" ADD VALUE 'ORGANIZATION_UPDATE';
ALTER TYPE "AuditAction" ADD VALUE 'MEMBERSHIP_CHANGE';
ALTER TYPE "AuditAction" ADD VALUE 'VERIFICATION_SUBMIT';
ALTER TYPE "AuditAction" ADD VALUE 'VERIFICATION_DECISION';
ALTER TYPE "AuditAction" ADD VALUE 'FILE_UPLOAD_INIT';
ALTER TYPE "AuditAction" ADD VALUE 'FILE_UPLOAD_COMPLETE';
ALTER TYPE "AuditAction" ADD VALUE 'FILE_REJECTED';
ALTER TYPE "AuditAction" ADD VALUE 'FILE_ACCESS';
ALTER TYPE "AuditAction" ADD VALUE 'PITCH_CREATE';
ALTER TYPE "AuditAction" ADD VALUE 'PITCH_UPDATE';
ALTER TYPE "AuditAction" ADD VALUE 'PITCH_SUBMIT';
ALTER TYPE "AuditAction" ADD VALUE 'PITCH_WITHDRAW';
ALTER TYPE "AuditAction" ADD VALUE 'PITCH_CHANGE_REQUEST';
ALTER TYPE "AuditAction" ADD VALUE 'PITCH_RESUBMIT';
ALTER TYPE "AuditAction" ADD VALUE 'REVIEWER_ASSIGN';
ALTER TYPE "AuditAction" ADD VALUE 'REVIEWER_REVOKE';
ALTER TYPE "AuditAction" ADD VALUE 'CONFLICT_DECLARE';
ALTER TYPE "AuditAction" ADD VALUE 'REVIEW_SUBMIT';
ALTER TYPE "AuditAction" ADD VALUE 'PITCH_APPROVE';
ALTER TYPE "AuditAction" ADD VALUE 'PITCH_REJECT';
ALTER TYPE "AuditAction" ADD VALUE 'DISCOVERY_SUSPEND';

-- CreateTable
CREATE TABLE "innovator_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "display_name" VARCHAR(150),
    "headline" VARCHAR(200),
    "biography" VARCHAR(3000),
    "organization_name" VARCHAR(200),
    "is_independent" BOOLEAN NOT NULL DEFAULT false,
    "city" VARCHAR(100),
    "state_id" UUID,
    "country_code" VARCHAR(2) NOT NULL DEFAULT 'NG',
    "website_url" VARCHAR(500),
    "linkedin_url" VARCHAR(500),
    "portfolio_url" VARCHAR(500),
    "years_of_experience" INTEGER,
    "innovation_interests" VARCHAR(1000),
    "visibility" "ProfileVisibility" NOT NULL DEFAULT 'PRIVATE',
    "completion_percent" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "innovator_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "innovator_profile_sectors" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "sector_id" UUID NOT NULL,

    CONSTRAINT "innovator_profile_sectors_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sponsor_organizations" (
    "id" UUID NOT NULL,
    "legal_name" VARCHAR(200) NOT NULL,
    "display_name" VARCHAR(200) NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "organization_type" "OrganizationType" NOT NULL,
    "description" VARCHAR(3000),
    "website_url" VARCHAR(500),
    "country_code" VARCHAR(2) NOT NULL DEFAULT 'NG',
    "state_id" UUID,
    "city" VARCHAR(100),
    "registration_number" VARCHAR(100),
    "year_established" INTEGER,
    "funding_interest" VARCHAR(2000),
    "min_funding_amount" DECIMAL(18,2),
    "max_funding_amount" DECIMAL(18,2),
    "preferred_stages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preferred_state_codes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "verification_status" "SponsorVerificationStatus" NOT NULL DEFAULT 'DRAFT',
    "verification_submitted_at" TIMESTAMPTZ(6),
    "verified_at" TIMESTAMPTZ(6),
    "verified_by_id" UUID,
    "decision_reason" VARCHAR(2000),
    "suspended_at" TIMESTAMPTZ(6),
    "suspended_reason" VARCHAR(2000),
    "lock_version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "sponsor_organizations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sponsor_organization_sectors" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "sector_id" UUID NOT NULL,

    CONSTRAINT "sponsor_organization_sectors_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sponsor_organization_memberships" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "SponsorMembershipRole" NOT NULL,
    "status" "SponsorMembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "added_by_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "sponsor_organization_memberships_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sponsor_verification_events" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "from_status" "SponsorVerificationStatus",
    "to_status" "SponsorVerificationStatus" NOT NULL,
    "reason" VARCHAR(2000),
    "actor_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sponsor_verification_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pitches" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "slug" VARCHAR(220) NOT NULL,
    "short_summary" VARCHAR(500),
    "problem_statement" VARCHAR(5000),
    "proposed_solution" VARCHAR(5000),
    "target_users" VARCHAR(2000),
    "innovation_stage" "InnovationStage",
    "primary_sector_id" UUID,
    "state_id" UUID,
    "geographic_reach" VARCHAR(1000),
    "business_model" VARCHAR(3000),
    "competitive_advantage" VARCHAR(3000),
    "current_traction" VARCHAR(3000),
    "team_description" VARCHAR(3000),
    "social_impact" VARCHAR(3000),
    "scalability" VARCHAR(3000),
    "risks_and_mitigations" VARCHAR(3000),
    "ip_status" VARCHAR(1000),
    "funding_amount_requested" DECIMAL(18,2),
    "funding_currency" VARCHAR(3) NOT NULL DEFAULT 'NGN',
    "use_of_funds" VARCHAR(3000),
    "expected_milestones" VARCHAR(3000),
    "development_timeline" VARCHAR(2000),
    "terms_accepted" BOOLEAN NOT NULL DEFAULT false,
    "status" "PitchStatus" NOT NULL DEFAULT 'DRAFT',
    "current_draft_version" INTEGER NOT NULL DEFAULT 1,
    "last_submitted_version" INTEGER,
    "lock_version" INTEGER NOT NULL DEFAULT 0,
    "submitted_at" TIMESTAMPTZ(6),
    "approved_at" TIMESTAMPTZ(6),
    "rejected_at" TIMESTAMPTZ(6),
    "withdrawn_at" TIMESTAMPTZ(6),
    "discovery_suspended" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "pitches_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pitch_sectors" (
    "id" UUID NOT NULL,
    "pitch_id" UUID NOT NULL,
    "sector_id" UUID NOT NULL,

    CONSTRAINT "pitch_sectors_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pitch_submissions" (
    "id" UUID NOT NULL,
    "pitch_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "submitted_by_id" UUID NOT NULL,
    "submitted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "snapshot" JSONB NOT NULL,
    "profile_completion_at_submit" INTEGER NOT NULL,
    "validation_version" INTEGER NOT NULL DEFAULT 1,
    "review_status" "PitchStatus" NOT NULL,
    "decision_at" TIMESTAMPTZ(6),
    "superseded_at" TIMESTAMPTZ(6),

    CONSTRAINT "pitch_submissions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pitch_submission_documents" (
    "id" UUID NOT NULL,
    "submission_id" UUID NOT NULL,
    "file_asset_id" UUID NOT NULL,
    "purpose" "DocumentPurpose" NOT NULL,

    CONSTRAINT "pitch_submission_documents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "file_assets" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "pitch_id" UUID,
    "organization_id" UUID,
    "purpose" "DocumentPurpose" NOT NULL,
    "storage_provider" VARCHAR(50) NOT NULL DEFAULT 'minio',
    "bucket" VARCHAR(100) NOT NULL,
    "object_key" VARCHAR(500) NOT NULL,
    "original_filename" VARCHAR(255) NOT NULL,
    "display_filename" VARCHAR(255) NOT NULL,
    "declared_mime_type" VARCHAR(100) NOT NULL,
    "detected_mime_type" VARCHAR(100),
    "size_bytes" BIGINT,
    "checksum_sha256" VARCHAR(64),
    "upload_status" "FileUploadStatus" NOT NULL DEFAULT 'PENDING_UPLOAD',
    "scan_status" "FileScanStatus" NOT NULL DEFAULT 'PENDING',
    "scan_message" VARCHAR(500),
    "intent_expires_at" TIMESTAMPTZ(6),
    "finalized_at" TIMESTAMPTZ(6),
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "file_assets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pitch_review_assignments" (
    "id" UUID NOT NULL,
    "submission_id" UUID NOT NULL,
    "reviewer_id" UUID NOT NULL,
    "assigned_by_id" UUID NOT NULL,
    "status" "ReviewAssignmentStatus" NOT NULL DEFAULT 'ASSIGNED',
    "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_at" TIMESTAMPTZ(6),
    "accepted_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "revoked_at" TIMESTAMPTZ(6),
    "revocation_reason" VARCHAR(1000),
    "conflict_status" "ConflictStatus" NOT NULL DEFAULT 'NOT_DECLARED',
    "conflict_explanation" VARCHAR(1000),

    CONSTRAINT "pitch_review_assignments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pitch_reviews" (
    "id" UUID NOT NULL,
    "assignment_id" UUID NOT NULL,
    "submission_id" UUID NOT NULL,
    "reviewer_id" UUID NOT NULL,
    "recommendation" "ReviewRecommendation" NOT NULL,
    "strengths" VARCHAR(3000),
    "risks" VARCHAR(3000),
    "questions" VARCHAR(3000),
    "required_changes" VARCHAR(3000),
    "confidential_notes" VARCHAR(3000),
    "applicant_visible_notes" VARCHAR(3000),
    "average_score" DECIMAL(4,2),
    "submitted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pitch_reviews_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pitch_review_scores" (
    "id" UUID NOT NULL,
    "review_id" UUID NOT NULL,
    "criterion" VARCHAR(100) NOT NULL,
    "score" INTEGER NOT NULL,

    CONSTRAINT "pitch_review_scores_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pitch_workflow_events" (
    "id" UUID NOT NULL,
    "pitch_id" UUID NOT NULL,
    "from_status" "PitchStatus",
    "to_status" "PitchStatus" NOT NULL,
    "reason" VARCHAR(2000),
    "actor_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pitch_workflow_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "innovator_profiles_user_id_key" ON "innovator_profiles"("user_id");
CREATE INDEX "innovator_profiles_state_id_idx" ON "innovator_profiles"("state_id");
CREATE UNIQUE INDEX "innovator_profile_sectors_profile_id_sector_id_key" ON "innovator_profile_sectors"("profile_id", "sector_id");

CREATE UNIQUE INDEX "sponsor_organizations_slug_key" ON "sponsor_organizations"("slug");
CREATE INDEX "sponsor_organizations_verification_status_idx" ON "sponsor_organizations"("verification_status");
CREATE INDEX "sponsor_organizations_state_id_idx" ON "sponsor_organizations"("state_id");
CREATE UNIQUE INDEX "sponsor_organization_sectors_organization_id_sector_id_key" ON "sponsor_organization_sectors"("organization_id", "sector_id");
CREATE UNIQUE INDEX "sponsor_organization_memberships_organization_id_user_id_key" ON "sponsor_organization_memberships"("organization_id", "user_id");
CREATE INDEX "sponsor_organization_memberships_user_id_idx" ON "sponsor_organization_memberships"("user_id");
CREATE INDEX "sponsor_verification_events_organization_id_idx" ON "sponsor_verification_events"("organization_id");

CREATE UNIQUE INDEX "pitches_slug_key" ON "pitches"("slug");
CREATE INDEX "pitches_owner_id_idx" ON "pitches"("owner_id");
CREATE INDEX "pitches_status_idx" ON "pitches"("status");
CREATE INDEX "pitches_state_id_idx" ON "pitches"("state_id");
CREATE INDEX "pitches_primary_sector_id_idx" ON "pitches"("primary_sector_id");
CREATE UNIQUE INDEX "pitch_sectors_pitch_id_sector_id_key" ON "pitch_sectors"("pitch_id", "sector_id");
CREATE UNIQUE INDEX "pitch_submissions_pitch_id_version_key" ON "pitch_submissions"("pitch_id", "version");
CREATE INDEX "pitch_submissions_pitch_id_idx" ON "pitch_submissions"("pitch_id");
CREATE UNIQUE INDEX "pitch_submission_documents_submission_id_file_asset_id_key" ON "pitch_submission_documents"("submission_id", "file_asset_id");
CREATE INDEX "file_assets_owner_id_idx" ON "file_assets"("owner_id");
CREATE INDEX "file_assets_pitch_id_idx" ON "file_assets"("pitch_id");
CREATE INDEX "file_assets_organization_id_idx" ON "file_assets"("organization_id");
CREATE INDEX "file_assets_upload_status_idx" ON "file_assets"("upload_status");
CREATE UNIQUE INDEX "pitch_review_assignments_submission_id_reviewer_id_key" ON "pitch_review_assignments"("submission_id", "reviewer_id");
CREATE INDEX "pitch_review_assignments_reviewer_id_idx" ON "pitch_review_assignments"("reviewer_id");
CREATE UNIQUE INDEX "pitch_reviews_assignment_id_key" ON "pitch_reviews"("assignment_id");
CREATE INDEX "pitch_reviews_submission_id_idx" ON "pitch_reviews"("submission_id");
CREATE UNIQUE INDEX "pitch_review_scores_review_id_criterion_key" ON "pitch_review_scores"("review_id", "criterion");
CREATE INDEX "pitch_workflow_events_pitch_id_idx" ON "pitch_workflow_events"("pitch_id");

-- AddForeignKey
ALTER TABLE "innovator_profiles" ADD CONSTRAINT "innovator_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "innovator_profiles" ADD CONSTRAINT "innovator_profiles_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "states"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "innovator_profile_sectors" ADD CONSTRAINT "innovator_profile_sectors_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "innovator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "innovator_profile_sectors" ADD CONSTRAINT "innovator_profile_sectors_sector_id_fkey" FOREIGN KEY ("sector_id") REFERENCES "sectors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sponsor_organizations" ADD CONSTRAINT "sponsor_organizations_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "states"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sponsor_organizations" ADD CONSTRAINT "sponsor_organizations_verified_by_id_fkey" FOREIGN KEY ("verified_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sponsor_organization_sectors" ADD CONSTRAINT "sponsor_organization_sectors_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "sponsor_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sponsor_organization_sectors" ADD CONSTRAINT "sponsor_organization_sectors_sector_id_fkey" FOREIGN KEY ("sector_id") REFERENCES "sectors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sponsor_organization_memberships" ADD CONSTRAINT "sponsor_organization_memberships_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "sponsor_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sponsor_organization_memberships" ADD CONSTRAINT "sponsor_organization_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sponsor_organization_memberships" ADD CONSTRAINT "sponsor_organization_memberships_added_by_id_fkey" FOREIGN KEY ("added_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sponsor_verification_events" ADD CONSTRAINT "sponsor_verification_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "sponsor_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sponsor_verification_events" ADD CONSTRAINT "sponsor_verification_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pitches" ADD CONSTRAINT "pitches_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pitches" ADD CONSTRAINT "pitches_primary_sector_id_fkey" FOREIGN KEY ("primary_sector_id") REFERENCES "sectors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pitches" ADD CONSTRAINT "pitches_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "states"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pitch_sectors" ADD CONSTRAINT "pitch_sectors_pitch_id_fkey" FOREIGN KEY ("pitch_id") REFERENCES "pitches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pitch_sectors" ADD CONSTRAINT "pitch_sectors_sector_id_fkey" FOREIGN KEY ("sector_id") REFERENCES "sectors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pitch_submissions" ADD CONSTRAINT "pitch_submissions_pitch_id_fkey" FOREIGN KEY ("pitch_id") REFERENCES "pitches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pitch_submissions" ADD CONSTRAINT "pitch_submissions_submitted_by_id_fkey" FOREIGN KEY ("submitted_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pitch_submission_documents" ADD CONSTRAINT "pitch_submission_documents_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "pitch_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pitch_submission_documents" ADD CONSTRAINT "pitch_submission_documents_file_asset_id_fkey" FOREIGN KEY ("file_asset_id") REFERENCES "file_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "file_assets" ADD CONSTRAINT "file_assets_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "file_assets" ADD CONSTRAINT "file_assets_pitch_id_fkey" FOREIGN KEY ("pitch_id") REFERENCES "pitches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "file_assets" ADD CONSTRAINT "file_assets_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "sponsor_organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pitch_review_assignments" ADD CONSTRAINT "pitch_review_assignments_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "pitch_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pitch_review_assignments" ADD CONSTRAINT "pitch_review_assignments_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pitch_review_assignments" ADD CONSTRAINT "pitch_review_assignments_assigned_by_id_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pitch_reviews" ADD CONSTRAINT "pitch_reviews_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "pitch_review_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pitch_reviews" ADD CONSTRAINT "pitch_reviews_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "pitch_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pitch_reviews" ADD CONSTRAINT "pitch_reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pitch_review_scores" ADD CONSTRAINT "pitch_review_scores_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "pitch_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pitch_workflow_events" ADD CONSTRAINT "pitch_workflow_events_pitch_id_fkey" FOREIGN KEY ("pitch_id") REFERENCES "pitches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pitch_workflow_events" ADD CONSTRAINT "pitch_workflow_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
