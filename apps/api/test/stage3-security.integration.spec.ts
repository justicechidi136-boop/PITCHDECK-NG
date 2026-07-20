import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import cookieParser from "cookie-parser";
import { AppModule } from "../src/app.module";
import { prisma } from "@pitchdeck/database";
import {
  AccountStatus,
  ConflictStatus,
  DocumentPurpose,
  FileScanStatus,
  FileUploadStatus,
  PitchStatus,
  ReviewAssignmentStatus,
  RoleType,
  ScopeType,
  SponsorMembershipRole,
} from "@pitchdeck/contracts";
import { hashPassword } from "../src/auth/utils/password.util";

const PASSWORD = "testpassword123";

describe("Stage 3 security regression", () => {
  let app: INestApplication;
  let lagosStateId: string;
  let riversStateId: string;
  let sectorId: string;

  jest.setTimeout(60000);

  async function getCsrf(agent: request.SuperAgentTest): Promise<string> {
    const res = await agent.get("/v1/auth/csrf").expect(200);
    const setCookie = res.headers["set-cookie"];
    if (Array.isArray(setCookie)) {
      agent.set("Cookie", setCookie.map((c) => c.split(";")[0]).join("; "));
    }
    return res.body.data.csrfToken as string;
  }

  async function createUser(emailPrefix: string, role: RoleType, stateId?: string) {
    const email = `${emailPrefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@test.example`;
    const passwordHash = await hashPassword(PASSWORD);
    const roleRecord = await prisma.role.findUniqueOrThrow({ where: { type: role } });
    const user = await prisma.user.create({
      data: {
        email,
        emailNormalized: email.toLowerCase(),
        firstName: "Security",
        lastName: "User",
        passwordHash,
        accountStatus: AccountStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        stateId,
        termsAcceptedAt: new Date(),
        roleAssignments: {
          create: {
            roleId: roleRecord.id,
            scopeType: role === RoleType.STATE_ADMIN ? ScopeType.STATE : ScopeType.GLOBAL,
            stateId: role === RoleType.STATE_ADMIN ? stateId : undefined,
          },
        },
      },
    });
    return user;
  }

  async function login(user: { email: string }, origin = "http://localhost:3000") {
    const agent = request.agent(app.getHttpServer());
    const csrf = await getCsrf(agent);
    await agent
      .post("/v1/auth/login")
      .set("X-CSRF-Token", csrf)
      .set("Origin", origin)
      .send({ email: user.email, password: PASSWORD })
      .expect(200);
    const nextCsrf = await getCsrf(agent);
    return { agent, csrf: nextCsrf, origin };
  }

  async function createOrg(ownerId: string, displayName: string, stateId = lagosStateId) {
    const org = await prisma.sponsorOrganization.create({
      data: {
        legalName: `${displayName} Ltd`,
        displayName,
        slug: `${displayName.toLowerCase().replace(/\s+/g, "-")}-${Date.now().toString(36)}`,
        organizationType: "CORPORATE",
        stateId,
      },
    });
    const membership = await prisma.sponsorOrganizationMembership.create({
      data: {
        organizationId: org.id,
        userId: ownerId,
        role: SponsorMembershipRole.OWNER,
        addedById: ownerId,
      },
    });
    return { org, membership };
  }

  async function createSubmittedPitch(ownerId: string, stateId: string, title: string) {
    const pitch = await prisma.pitch.create({
      data: {
        ownerId,
        title,
        slug: `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString(36)}`,
        status: PitchStatus.UNDER_REVIEW,
        shortSummary: "Immutable summary",
        problemStatement: "Problem",
        proposedSolution: "Solution",
        targetUsers: "Users",
        innovationStage: "PROTOTYPE",
        primarySectorId: sectorId,
        stateId,
        businessModel: "Business model",
        fundingAmountRequested: "1000000",
        useOfFunds: "Build",
        termsAccepted: true,
        submittedAt: new Date(),
        lastSubmittedVersion: 1,
      },
    });
    const submission = await prisma.pitchSubmission.create({
      data: {
        pitchId: pitch.id,
        version: 1,
        submittedById: ownerId,
        snapshot: { title, shortSummary: "Approved snapshot" },
        profileCompletionAtSubmit: 100,
        reviewStatus: PitchStatus.UNDER_REVIEW,
      },
    });
    return { pitch, submission };
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.setGlobalPrefix("v1");
    await app.init();

    lagosStateId = (await prisma.state.findUniqueOrThrow({ where: { code: "LA" } })).id;
    riversStateId = (await prisma.state.findUniqueOrThrow({ where: { code: "RI" } })).id;
    sectorId = (await prisma.sector.findFirstOrThrow()).id;
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it("does not allow an organisation admin to remove a member from another organisation by direct ID", async () => {
    const ownerA = await createUser("org-a-owner", RoleType.SPONSOR, lagosStateId);
    const ownerB = await createUser("org-b-owner", RoleType.SPONSOR, lagosStateId);
    const memberA = await createUser("org-a-member", RoleType.SPONSOR, lagosStateId);
    const { org: orgA } = await createOrg(ownerA.id, "Org A");
    const { membership: membershipB } = await createOrg(ownerB.id, "Org B");
    const membershipA = await prisma.sponsorOrganizationMembership.create({
      data: {
        organizationId: orgA.id,
        userId: memberA.id,
        role: SponsorMembershipRole.MEMBER,
        addedById: ownerA.id,
      },
    });
    const auth = await login(ownerA);

    await auth.agent
      .delete(`/v1/sponsor-organizations/${orgA.id}/members/${membershipB.id}`)
      .set("X-CSRF-Token", auth.csrf)
      .set("Origin", auth.origin)
      .expect(404);

    await expect(
      prisma.sponsorOrganizationMembership.findUniqueOrThrow({ where: { id: membershipB.id } }),
    ).resolves.toMatchObject({ status: "ACTIVE" });

    await auth.agent
      .delete(`/v1/sponsor-organizations/${orgA.id}/members/${membershipA.id}`)
      .set("X-CSRF-Token", auth.csrf)
      .set("Origin", auth.origin)
      .expect(200);
  });

  it("blocks final-owner removal and removed organisation admins", async () => {
    const owner = await createUser("final-owner", RoleType.SPONSOR, lagosStateId);
    const admin = await createUser("removed-admin", RoleType.SPONSOR, lagosStateId);
    const member = await createUser("kept-member", RoleType.SPONSOR, lagosStateId);
    const { org, membership: ownerMembership } = await createOrg(owner.id, "Owner Guard");
    const adminMembership = await prisma.sponsorOrganizationMembership.create({
      data: { organizationId: org.id, userId: admin.id, role: SponsorMembershipRole.ADMIN, addedById: owner.id },
    });
    const memberMembership = await prisma.sponsorOrganizationMembership.create({
      data: { organizationId: org.id, userId: member.id, role: SponsorMembershipRole.MEMBER, addedById: owner.id },
    });
    const ownerAuth = await login(owner);

    await ownerAuth.agent
      .delete(`/v1/sponsor-organizations/${org.id}/members/${ownerMembership.id}`)
      .set("X-CSRF-Token", ownerAuth.csrf)
      .set("Origin", ownerAuth.origin)
      .expect(403);

    await ownerAuth.agent
      .delete(`/v1/sponsor-organizations/${org.id}/members/${adminMembership.id}`)
      .set("X-CSRF-Token", ownerAuth.csrf)
      .set("Origin", ownerAuth.origin)
      .expect(200);

    const adminAuth = await login(admin);
    await adminAuth.agent
      .delete(`/v1/sponsor-organizations/${org.id}/members/${memberMembership.id}`)
      .set("X-CSRF-Token", adminAuth.csrf)
      .set("Origin", adminAuth.origin)
      .expect(403);
  });

  it("scopes reviewer revocation to the assignment's actual pitch", async () => {
    const lagosAdmin = await createUser("lagos-admin", RoleType.STATE_ADMIN, lagosStateId);
    const riversAdmin = await createUser("rivers-admin", RoleType.STATE_ADMIN, riversStateId);
    const reviewer = await createUser("reviewer", RoleType.REVIEWER);
    const owner = await createUser("pitch-owner", RoleType.INNOVATOR, lagosStateId);
    const riversOwner = await createUser("rivers-owner", RoleType.INNOVATOR, riversStateId);
    const { pitch: lagosPitch, submission: lagosSubmission } = await createSubmittedPitch(owner.id, lagosStateId, "Lagos Pitch");
    const { pitch: riversPitch, submission: riversSubmission } = await createSubmittedPitch(riversOwner.id, riversStateId, "Rivers Pitch");
    const lagosAssignment = await prisma.pitchReviewAssignment.create({
      data: { submissionId: lagosSubmission.id, reviewerId: reviewer.id, assignedById: lagosAdmin.id },
    });
    const riversAssignment = await prisma.pitchReviewAssignment.create({
      data: { submissionId: riversSubmission.id, reviewerId: reviewer.id, assignedById: riversAdmin.id },
    });
    const lagosAuth = await login(lagosAdmin, "http://localhost:3001");

    await lagosAuth.agent
      .delete(`/v1/admin/pitches/${riversPitch.id}/reviewers/${riversAssignment.id}`)
      .set("X-CSRF-Token", lagosAuth.csrf)
      .set("Origin", lagosAuth.origin)
      .send({ reason: "Out of scope" })
      .expect(403);

    await lagosAuth.agent
      .delete(`/v1/admin/pitches/${lagosPitch.id}/reviewers/${riversAssignment.id}`)
      .set("X-CSRF-Token", lagosAuth.csrf)
      .set("Origin", lagosAuth.origin)
      .send({ reason: "Mismatched route" })
      .expect(404);

    await expect(
      prisma.pitchReviewAssignment.findUniqueOrThrow({ where: { id: riversAssignment.id } }),
    ).resolves.toMatchObject({ status: ReviewAssignmentStatus.ASSIGNED });

    await lagosAuth.agent
      .delete(`/v1/admin/pitches/${lagosPitch.id}/reviewers/${lagosAssignment.id}`)
      .set("X-CSRF-Token", lagosAuth.csrf)
      .set("Origin", lagosAuth.origin)
      .send({ reason: "Valid revoke" })
      .expect(200);

    await lagosAuth.agent
      .delete(`/v1/admin/pitches/${lagosPitch.id}/reviewers/${lagosAssignment.id}`)
      .set("X-CSRF-Token", lagosAuth.csrf)
      .set("Origin", lagosAuth.origin)
      .send({ reason: "Repeat" })
      .expect(400);
  });

  it("revoked reviewers immediately lose document and review access", async () => {
    const admin = await createUser("file-admin", RoleType.STATE_ADMIN, lagosStateId);
    const reviewer = await createUser("file-reviewer", RoleType.REVIEWER);
    const owner = await createUser("file-owner", RoleType.INNOVATOR, lagosStateId);
    const { pitch, submission } = await createSubmittedPitch(owner.id, lagosStateId, "File Pitch");
    const file = await prisma.fileAsset.create({
      data: {
        ownerId: owner.id,
        pitchId: pitch.id,
        purpose: DocumentPurpose.PITCH_DECK,
        bucket: "pitchdeck-uploads",
        objectKey: `test-${Date.now()}`,
        originalFilename: "deck.pdf",
        displayFilename: "deck.pdf",
        declaredMimeType: "application/pdf",
        detectedMimeType: "application/pdf",
        sizeBytes: 128,
        uploadStatus: FileUploadStatus.AVAILABLE,
        scanStatus: FileScanStatus.CLEAN,
        finalizedAt: new Date(),
      },
    });
    await prisma.pitchSubmissionDocument.create({
      data: { submissionId: submission.id, fileAssetId: file.id, purpose: DocumentPurpose.PITCH_DECK },
    });
    const assignment = await prisma.pitchReviewAssignment.create({
      data: { submissionId: submission.id, reviewerId: reviewer.id, assignedById: admin.id },
    });
    const reviewerAuth = await login(reviewer);
    await reviewerAuth.agent.get(`/v1/files/${file.id}`).set("Origin", reviewerAuth.origin).expect(200);

    const adminAuth = await login(admin, "http://localhost:3001");
    await adminAuth.agent
      .delete(`/v1/admin/pitches/${pitch.id}/reviewers/${assignment.id}`)
      .set("X-CSRF-Token", adminAuth.csrf)
      .set("Origin", adminAuth.origin)
      .send({ reason: "Security test" })
      .expect(200);

    await reviewerAuth.agent.get(`/v1/files/${file.id}`).set("Origin", reviewerAuth.origin).expect(403);
    await reviewerAuth.agent
      .post(`/v1/reviewer/assignments/${assignment.id}/conflict`)
      .set("X-CSRF-Token", reviewerAuth.csrf)
      .set("Origin", reviewerAuth.origin)
      .send({ status: ConflictStatus.NO_CONFLICT })
      .expect(404);
  });

  it("rejects Stage 3 unknown fields and malformed values before services", async () => {
    const innovator = await createUser("validation-innovator", RoleType.INNOVATOR, lagosStateId);
    const sponsor = await createUser("validation-sponsor", RoleType.SPONSOR, lagosStateId);
    const innovatorAuth = await login(innovator);
    const sponsorAuth = await login(sponsor);
    const { org } = await createOrg(sponsor.id, "Validation Org");
    const pitch = await prisma.pitch.create({
      data: {
        ownerId: innovator.id,
        title: "Validation Pitch",
        slug: `validation-${Date.now()}`,
      },
    });

    await innovatorAuth.agent
      .patch(`/v1/pitches/${pitch.id}`)
      .set("X-CSRF-Token", innovatorAuth.csrf)
      .set("Origin", innovatorAuth.origin)
      .send({ lockVersion: pitch.lockVersion, ownerId: sponsor.id })
      .expect(400);

    await innovatorAuth.agent
      .patch(`/v1/pitches/${pitch.id}`)
      .set("X-CSRF-Token", innovatorAuth.csrf)
      .set("Origin", innovatorAuth.origin)
      .send({ fundingAmountRequested: "-12.00", lockVersion: pitch.lockVersion })
      .expect(400);

    await sponsorAuth.agent
      .post(`/v1/sponsor-organizations/${org.id}/members`)
      .set("X-CSRF-Token", sponsorAuth.csrf)
      .set("Origin", sponsorAuth.origin)
      .send({ email: innovator.email, role: "OWNER_ADMIN" })
      .expect(400);

    await sponsorAuth.agent
      .get("/v1/discovery/pitches?pageSize=500")
      .set("Origin", sponsorAuth.origin)
      .expect(400);
  });
});
