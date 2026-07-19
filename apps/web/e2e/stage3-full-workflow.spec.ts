import { test, expect } from "@playwright/test";
import {
  ApiTestClient,
  DEFAULT_ADMIN_ORIGIN,
  clearCapturedEmails,
  createVerifiedUserWithRole,
  MINIMAL_PDF_BYTES,
  uploadFileViaIntent,
  uniqueEmail,
} from "@pitchdeck/testing/e2e";
import {
  ConflictStatus,
  InnovationStage,
  REVIEW_CRITERIA,
  ReviewRecommendation,
  RoleType,
} from "@pitchdeck/contracts";
import { prisma } from "@pitchdeck/database";

test.describe.configure({ mode: "serial" });
test.setTimeout(180_000);

test.beforeEach(async () => {
  await clearCapturedEmails();
});

test("full Stage 3 workflow: profile through sponsor discovery", async () => {
  const lagosState = await prisma.state.findUniqueOrThrow({ where: { code: "LA" } });
  const sector = await prisma.sector.findFirstOrThrow();

  const innovatorEmail = uniqueEmail("workflow-innovator");
  const innovator = new ApiTestClient();
  await innovator.registerAndLoginInnovator(innovatorEmail, "LA");

  await innovator.request("/innovator/profile", {
    method: "PUT",
    body: {
      headline: "Solar irrigation founder",
      biography: "Building affordable solar-powered irrigation for smallholder farmers across Nigeria.",
      organizationName: "GreenFlow Labs",
      stateId: lagosState.id,
      sectorIds: [sector.id],
    },
  });

  const pitchRes = await innovator.request("/pitches", {
    method: "POST",
    body: { title: "Solar Irrigation Platform" },
  });
  const pitchId = (pitchRes.data as { id: string }).id;

  await innovator.request(`/pitches/${pitchId}`, {
    method: "PATCH",
    body: {
      lockVersion: 0,
      shortSummary: "Affordable solar irrigation kits for Nigerian smallholders.",
      problemStatement: "Farmers lack reliable irrigation during dry seasons.",
      proposedSolution: "Modular solar pumps with pay-as-you-go financing.",
      targetUsers: "Smallholder farmers in Lagos and Ogun states.",
      innovationStage: InnovationStage.PILOT,
      primarySectorId: sector.id,
      stateId: lagosState.id,
      businessModel: "Hardware sales plus subscription maintenance.",
      fundingAmountRequested: "5000000",
      useOfFunds: "Manufacturing scale-up and field trials.",
      termsAccepted: true,
    },
  });

  const uploaded = await uploadFileViaIntent(innovator, {
    purpose: "PITCH_DECK",
    originalFilename: "deck.pdf",
    declaredMimeType: "application/pdf",
    bytes: MINIMAL_PDF_BYTES,
    pitchId,
  });
  expect(uploaded.uploadStatus).toBe("AVAILABLE");
  expect(uploaded.scanStatus).toBe("CLEAN");

  const submission = await innovator.request(`/pitches/${pitchId}/submit`, { method: "POST", body: {} });
  expect((submission.data as { version: number }).version).toBe(1);

  const lagosAdminEmail = uniqueEmail("workflow-lagos-admin");
  await createVerifiedUserWithRole({
    email: lagosAdminEmail,
    role: RoleType.STATE_ADMIN,
    stateCode: "LA",
  });
  const admin = new ApiTestClient(undefined, DEFAULT_ADMIN_ORIGIN);
  await admin.login(lagosAdminEmail);

  await admin.request(`/admin/pitches/${pitchId}/start-review`, { method: "POST", body: {} });

  const reviewerEmail = uniqueEmail("workflow-reviewer");
  const reviewerUser = await createVerifiedUserWithRole({
    email: reviewerEmail,
    role: RoleType.REVIEWER,
  });
  const assignmentRes = await admin.request(`/admin/pitches/${pitchId}/reviewers`, {
    method: "POST",
    body: { reviewerId: reviewerUser.userId },
  });
  const assignmentId = (assignmentRes.data as { id: string }).id;

  const reviewer = new ApiTestClient(undefined, DEFAULT_ADMIN_ORIGIN);
  await reviewer.login(reviewerEmail);
  await reviewer.request(`/reviewer/assignments/${assignmentId}/accept`, { method: "POST", body: {} });
  await reviewer.request(`/reviewer/assignments/${assignmentId}/conflict`, {
    method: "POST",
    body: { status: ConflictStatus.NO_CONFLICT },
  });

  await reviewer.request(`/reviewer/assignments/${assignmentId}/review`, {
    method: "POST",
    body: {
      recommendation: ReviewRecommendation.REQUEST_CHANGES,
      strengths: "Strong social impact thesis.",
      risks: "Supply chain risk.",
      questions: "What is current pilot retention?",
      requiredChanges: "Clarify unit economics.",
      confidentialNotes: "Internal note — must not leak.",
      applicantVisibleNotes: "Please clarify unit economics.",
      scores: REVIEW_CRITERIA.map((criterion) => ({ criterion, score: 4 })),
    },
  });

  await admin.request(`/admin/pitches/${pitchId}/request-changes`, {
    method: "POST",
    body: { reason: "Please update unit economics and resubmit." },
  });

  const pitchAfterChanges = await innovator.request(`/pitches/${pitchId}`);
  expect((pitchAfterChanges.data as { status: string }).status).toBe("CHANGES_REQUESTED");

  await innovator.request(`/pitches/${pitchId}`, {
    method: "PATCH",
    body: {
      lockVersion: (pitchAfterChanges.data as { lockVersion: number }).lockVersion,
      shortSummary: "Affordable solar irrigation kits with proven unit economics.",
    },
  });

  const resubmission = await innovator.request(`/pitches/${pitchId}/resubmit`, { method: "POST", body: {} });
  expect((resubmission.data as { version: number }).version).toBe(2);

  await admin.request(`/admin/pitches/${pitchId}/start-review`, { method: "POST", body: {} });
  await admin.request(`/admin/pitches/${pitchId}/approve`, { method: "POST", body: {} });
  const approved = await innovator.request(`/pitches/${pitchId}`);
  expect((approved.data as { status: string }).status).toBe("APPROVED");
  expect(JSON.stringify(approved.data)).not.toContain("confidentialNotes");

  const sponsorEmail = uniqueEmail("workflow-sponsor");
  const sponsor = new ApiTestClient();
  await sponsor.registerAndLoginSponsor(sponsorEmail, "LA");
  const org = await sponsor.request("/sponsor-organizations", {
    method: "POST",
    body: {
      legalName: "Impact Capital Ltd",
      displayName: "Impact Capital",
      organizationType: "CORPORATE",
      stateId: lagosState.id,
    },
  });
  const orgId = (org.data as { id: string }).id;

  await uploadFileViaIntent(sponsor, {
    purpose: "SPONSOR_REGISTRATION_CERT",
    originalFilename: "cert.pdf",
    declaredMimeType: "application/pdf",
    bytes: MINIMAL_PDF_BYTES,
    organizationId: orgId,
  });
  await sponsor.request(`/sponsor-organizations/${orgId}/verification/submit`, { method: "POST", body: {} });
  await admin.request(`/admin/sponsor-organizations/${orgId}/start-review`, { method: "POST", body: {} });
  await admin.request(`/admin/sponsor-organizations/${orgId}/verify`, { method: "POST", body: {} });

  const discovery = await sponsor.request("/discovery/pitches");
  const items = (discovery.data as { items: Array<{ pitchId: string; title: string }> }).items;
  expect(items.some((item) => item.pitchId === pitchId)).toBe(true);

  const detail = await sponsor.request(`/discovery/pitches/${pitchId}`);
  const detailJson = JSON.stringify(detail.data);
  expect(detailJson).not.toContain("objectKey");
  expect(detailJson).not.toContain("confidentialNotes");
  expect(detailJson).not.toContain(innovatorEmail);
});

test.afterAll(async () => {
  await prisma.$disconnect();
});
