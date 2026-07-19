import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import cookieParser from "cookie-parser";
import { AppModule } from "../src/app.module";
import { prisma } from "@pitchdeck/database";
import { RoleType, AccountStatus, ScopeType } from "@pitchdeck/contracts";
import { hashToken, generateOpaqueToken } from "../src/auth/utils/crypto.util";
import { hashPassword } from "../src/auth/utils/password.util";

describe("Stage 3 integration", () => {
  let app: INestApplication;
  let lagosStateId: string;
  let riversStateId: string;
  let sectorId: string;

  jest.setTimeout(60000);

  async function getCsrf(agent: request.SuperAgentTest): Promise<string> {
    const res = await agent.get("/v1/auth/csrf").expect(200);
    const csrf = res.body.data.csrfToken as string;
    const setCookie = res.headers["set-cookie"];
    if (Array.isArray(setCookie)) {
      agent.set("Cookie", setCookie.map((c) => c.split(";")[0]).join("; "));
    }
    return csrf;
  }

  async function registerInnovator(email: string, stateCode = "LA") {
    const agent = request.agent(app.getHttpServer());
    let csrf = await getCsrf(agent);
    await agent
      .post("/v1/auth/register")
      .set("X-CSRF-Token", csrf)
      .set("Origin", "http://localhost:3000")
      .send({
        email,
        password: "testpassword123",
        firstName: "Test",
        lastName: "Innovator",
        role: RoleType.INNOVATOR,
        stateCode,
        acceptedTerms: true,
      })
      .expect(201);

    const user = await prisma.user.findUniqueOrThrow({
      where: { emailNormalized: email.toLowerCase() },
    });
    const token = generateOpaqueToken();
    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 3600_000),
      },
    });
    csrf = await getCsrf(agent);
    await agent
      .post("/v1/auth/email-verification/confirm")
      .set("X-CSRF-Token", csrf)
      .set("Origin", "http://localhost:3000")
      .send({ token })
      .expect(200);
    csrf = await getCsrf(agent);
    await agent
      .post("/v1/auth/login")
      .set("X-CSRF-Token", csrf)
      .set("Origin", "http://localhost:3000")
      .send({ email, password: "testpassword123" })
      .expect(200);
    (agent as request.SuperAgentTest & { csrfToken?: string }).csrfToken = await getCsrf(agent);
    return agent as request.SuperAgentTest & { csrfToken: string };
  }

  async function registerSponsor(email: string, stateCode = "LA") {
    const agent = request.agent(app.getHttpServer());
    let csrf = await getCsrf(agent);
    await agent
      .post("/v1/auth/register")
      .set("X-CSRF-Token", csrf)
      .set("Origin", "http://localhost:3000")
      .send({
        email,
        password: "testpassword123",
        firstName: "Sponsor",
        lastName: "User",
        role: RoleType.SPONSOR,
        stateCode,
        acceptedTerms: true,
      })
      .expect(201);

    const user = await prisma.user.findUniqueOrThrow({
      where: { emailNormalized: email.toLowerCase() },
    });
    const token = generateOpaqueToken();
    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 3600_000),
      },
    });
    csrf = await getCsrf(agent);
    await agent
      .post("/v1/auth/email-verification/confirm")
      .set("X-CSRF-Token", csrf)
      .set("Origin", "http://localhost:3000")
      .send({ token })
      .expect(200);
    csrf = await getCsrf(agent);
    await agent
      .post("/v1/auth/login")
      .set("X-CSRF-Token", csrf)
      .set("Origin", "http://localhost:3000")
      .send({ email, password: "testpassword123" })
      .expect(200);
    (agent as request.SuperAgentTest & { csrfToken?: string }).csrfToken = await getCsrf(agent);
    return agent as request.SuperAgentTest & { csrfToken: string };
  }

  function withCsrf(agent: request.SuperAgentTest & { csrfToken?: string }) {
    return {
      csrf: agent.csrfToken ?? "",
      origin: "http://localhost:3000",
    };
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

  it("innovator creates profile and pitch draft", async () => {
    const email = `stage3-innovator-${Date.now()}@test.example`;
    const agent = await registerInnovator(email);
    const { csrf, origin } = withCsrf(agent);

    await agent
      .put("/v1/innovator/profile")
      .set("X-CSRF-Token", csrf)
      .set("Origin", origin)
      .send({
        headline: "Headline",
        biography: "Bio text",
        organizationName: "Org",
        stateId: lagosStateId,
        sectorIds: [sectorId],
      })
      .expect(200);

    const pitchRes = await agent
      .post("/v1/pitches")
      .set("X-CSRF-Token", csrf)
      .set("Origin", origin)
      .send({ title: "Solar irrigation system" })
      .expect(201);

    expect(pitchRes.body.data.title).toBe("Solar irrigation system");
  });

  it("blocks another innovator from reading draft", async () => {
    const ownerEmail = `owner-${Date.now()}@test.example`;
    const otherEmail = `other-${Date.now()}@test.example`;
    const ownerAgent = await registerInnovator(ownerEmail);
    const otherAgent = await registerInnovator(otherEmail);
    const ownerHeaders = withCsrf(ownerAgent);

    const pitchRes = await ownerAgent
      .post("/v1/pitches")
      .set("X-CSRF-Token", ownerHeaders.csrf)
      .set("Origin", ownerHeaders.origin)
      .send({ title: "Private pitch" })
      .expect(201);

    const pitchId = pitchRes.body.data.id as string;

    await otherAgent.get(`/v1/pitches/${pitchId}`).set("Origin", "http://localhost:3000").expect(403);
  });

  it("rejects incomplete pitch submission", async () => {
    const email = `incomplete-${Date.now()}@test.example`;
    const agent = await registerInnovator(email);
    const headers = withCsrf(agent);
    const pitchRes = await agent
      .post("/v1/pitches")
      .set("X-CSRF-Token", headers.csrf)
      .set("Origin", headers.origin)
      .send({ title: "Incomplete pitch" })
      .expect(201);

    await agent
      .post(`/v1/pitches/${pitchRes.body.data.id}/submit`)
      .set("X-CSRF-Token", headers.csrf)
      .set("Origin", headers.origin)
      .send({})
      .expect(400);
  });

  it("sponsor creates organisation and final owner cannot be removed", async () => {
    const email = `sponsor-${Date.now()}@test.example`;
    const agent = await registerSponsor(email);
    const { csrf, origin } = withCsrf(agent);

    const orgRes = await agent
      .post("/v1/sponsor-organizations")
      .set("X-CSRF-Token", csrf)
      .set("Origin", origin)
      .send({ legalName: "Acme Ltd", displayName: "Acme", organizationType: "CORPORATE" })
      .expect(201);

    const members = await agent
      .get(`/v1/sponsor-organizations/${orgRes.body.data.id}/members`)
      .set("Origin", origin)
      .expect(200);

    const ownerMembership = members.body.data.find((m: { role: string }) => m.role === "OWNER");
    await agent
      .delete(`/v1/sponsor-organizations/${orgRes.body.data.id}/members/${ownerMembership.id}`)
      .set("X-CSRF-Token", csrf)
      .set("Origin", origin)
      .expect(403);
  });

  it("unverified sponsor cannot access discovery", async () => {
    const email = `unverified-sponsor-${Date.now()}@test.example`;
    const agent = await registerSponsor(email);

    await agent.get("/v1/discovery/pitches").set("Origin", "http://localhost:3000").expect(403);
  });

  it("stores Lagos and Rivers state on innovator profiles", async () => {
    const lagosEmail = `lagos-innovator-${Date.now()}@test.example`;
    const riversEmail = `rivers-innovator-${Date.now()}@test.example`;
    const lagosAgent = await registerInnovator(lagosEmail, "LA");
    const riversAgent = await registerInnovator(riversEmail, "RI");
    const lagosHeaders = withCsrf(lagosAgent);
    const riversHeaders = withCsrf(riversAgent);

    const lagosProfile = await lagosAgent
      .put("/v1/innovator/profile")
      .set("X-CSRF-Token", lagosHeaders.csrf)
      .set("Origin", lagosHeaders.origin)
      .send({ headline: "Lagos innovator", stateId: lagosStateId, sectorIds: [sectorId] })
      .expect(200);

    const riversProfile = await riversAgent
      .put("/v1/innovator/profile")
      .set("X-CSRF-Token", riversHeaders.csrf)
      .set("Origin", riversHeaders.origin)
      .send({ headline: "Rivers innovator", stateId: riversStateId, sectorIds: [sectorId] })
      .expect(200);

    expect(lagosProfile.body.data.stateCode).toBe("LA");
    expect(riversProfile.body.data.stateCode).toBe("RI");
  });

  it("enforces CSRF on stage 3 mutating routes", async () => {
    await request(app.getHttpServer())
      .post("/v1/pitches")
      .set("Origin", "http://localhost:3000")
      .send({ title: "No CSRF" })
      .expect(401);
  });

  it("rejects invalid MIME on upload intent", async () => {
    const email = `mime-${Date.now()}@test.example`;
    const agent = await registerInnovator(email);
    const headers = withCsrf(agent);
    const pitchRes = await agent
      .post("/v1/pitches")
      .set("X-CSRF-Token", headers.csrf)
      .set("Origin", headers.origin)
      .send({ title: "Upload MIME test" })
      .expect(201);

    await agent
      .post("/v1/files/upload-intents")
      .set("X-CSRF-Token", headers.csrf)
      .set("Origin", headers.origin)
      .send({
        purpose: "PITCH_DECK",
        originalFilename: "evil.html",
        declaredMimeType: "text/html",
        sizeBytes: 1024,
        pitchId: pitchRes.body.data.id,
      })
      .expect(400);
  });

  it("blocks cross-user file download access", async () => {
    const ownerEmail = `file-owner-${Date.now()}@test.example`;
    const otherEmail = `file-other-${Date.now()}@test.example`;
    const ownerAgent = await registerInnovator(ownerEmail);
    const otherAgent = await registerInnovator(otherEmail);
    const ownerHeaders = withCsrf(ownerAgent);

    const pitchRes = await ownerAgent
      .post("/v1/pitches")
      .set("X-CSRF-Token", ownerHeaders.csrf)
      .set("Origin", ownerHeaders.origin)
      .send({ title: "File access test" })
      .expect(201);

    const intentRes = await ownerAgent
      .post("/v1/files/upload-intents")
      .set("X-CSRF-Token", ownerHeaders.csrf)
      .set("Origin", ownerHeaders.origin)
      .send({
        purpose: "PITCH_DECK",
        originalFilename: "deck.pdf",
        declaredMimeType: "application/pdf",
        sizeBytes: 2048,
        pitchId: pitchRes.body.data.id,
      })
      .expect(201);

    const fileId = intentRes.body.data.fileId as string;

    await otherAgent
      .get(`/v1/files/${fileId}/download-url`)
      .set("Origin", "http://localhost:3000")
      .expect(403);
  });

  it("blocks out-of-state admin from pitch detail", async () => {
    const lagosInnovatorEmail = `lagos-pitch-${Date.now()}@test.example`;
    const innovatorAgent = await registerInnovator(lagosInnovatorEmail, "LA");
    const innovatorHeaders = withCsrf(innovatorAgent);

    const pitchRes = await innovatorAgent
      .post("/v1/pitches")
      .set("X-CSRF-Token", innovatorHeaders.csrf)
      .set("Origin", innovatorHeaders.origin)
      .send({ title: "Lagos scoped pitch" })
      .expect(201);

    const pitchId = pitchRes.body.data.id as string;
    const passwordHash = await hashPassword("testpassword123");
    const stateAdminRole = await prisma.role.findUniqueOrThrow({
      where: { type: RoleType.STATE_ADMIN },
    });

    const riversAdminEmail = `rivers-admin-pitch-${Date.now()}@test.example`;
    await prisma.user.create({
      data: {
        email: riversAdminEmail,
        emailNormalized: riversAdminEmail,
        firstName: "Rivers",
        lastName: "Admin",
        passwordHash,
        accountStatus: AccountStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        roleAssignments: {
          create: {
            roleId: stateAdminRole.id,
            scopeType: ScopeType.STATE,
            stateId: riversStateId,
          },
        },
      },
    });

    const adminAgent = request.agent(app.getHttpServer());
    let csrf = await getCsrf(adminAgent);
    await adminAgent
      .post("/v1/auth/login")
      .set("X-CSRF-Token", csrf)
      .set("Origin", "http://localhost:3001")
      .send({ email: riversAdminEmail, password: "testpassword123" })
      .expect(200);

    await adminAgent
      .get(`/v1/admin/pitches/${pitchId}`)
      .set("Origin", "http://localhost:3001")
      .expect(403);
  });
});
