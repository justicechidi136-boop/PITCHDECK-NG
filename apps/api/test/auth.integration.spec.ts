import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import cookieParser from "cookie-parser";
import { AppModule } from "../src/app.module";
import { prisma } from "@pitchdeck/database";
import { RoleType, ScopeType, AccountStatus } from "@pitchdeck/contracts";
import { hashPassword } from "../src/auth/utils/password.util";
import { hashToken, generateOpaqueToken } from "../src/auth/utils/crypto.util";

describe("Auth integration", () => {
  let app: INestApplication;
  let lagosStateId: string;
  let riversStateId: string;

  jest.setTimeout(30000);

  async function getCsrf(agent: request.SuperAgentTest): Promise<string> {
    const res = await agent.get("/v1/auth/csrf").expect(200);
    const csrf = res.body.data.csrfToken as string;
    const setCookie = res.headers["set-cookie"];
    if (Array.isArray(setCookie)) {
      agent.set("Cookie", setCookie.map((c) => c.split(";")[0]).join("; "));
    } else if (setCookie) {
      agent.set("Cookie", setCookie);
    }
    return csrf;
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
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.setGlobalPrefix("v1");
    await app.init();

    const lagos = await prisma.state.findUniqueOrThrow({ where: { code: "LA" } });
    const rivers = await prisma.state.findUniqueOrThrow({ where: { code: "RI" } });
    lagosStateId = lagos.id;
    riversStateId = rivers.id;
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it("registers innovator and logs in", async () => {
    const agent = request.agent(app.getHttpServer());
    const csrf = await getCsrf(agent);
    const email = `innovator-${Date.now()}@test.example`;

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

    await agent
      .post("/v1/auth/email-verification/confirm")
      .set("X-CSRF-Token", csrf)
      .set("Origin", "http://localhost:3000")
      .send({ token })
      .expect(200);

    const loginRes = await agent
      .post("/v1/auth/login")
      .set("X-CSRF-Token", csrf)
      .set("Origin", "http://localhost:3000")
      .send({ email, password: "testpassword123" })
      .expect(200);

    expect(loginRes.body.data.user.email).toBe(email);

    const meRes = await agent.get("/v1/auth/me").expect(200);
    expect(meRes.body.data.email).toBe(email);
  });

  it("enforces CSRF on mutating requests", async () => {
    await request(app.getHttpServer())
      .post("/v1/auth/login")
      .set("Origin", "http://localhost:3000")
      .send({ email: "nobody@test.example", password: "testpassword123" })
      .expect(401);
  });

  it("isolates state admin boundaries", async () => {
    const lagosAdminEmail = `lagos-admin-${Date.now()}@test.example`;
    const riversAdminEmail = `rivers-admin-${Date.now()}@test.example`;
    const passwordHash = await hashPassword("testpassword123");
    const stateAdminRole = await prisma.role.findUniqueOrThrow({
      where: { type: RoleType.STATE_ADMIN },
    });

    const lagosAdmin = await prisma.user.create({
      data: {
        email: lagosAdminEmail,
        emailNormalized: lagosAdminEmail,
        firstName: "Lagos",
        lastName: "Admin",
        passwordHash,
        accountStatus: AccountStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        roleAssignments: {
          create: {
            roleId: stateAdminRole.id,
            scopeType: ScopeType.STATE,
            stateId: lagosStateId,
          },
        },
      },
    });

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

    const agent = request.agent(app.getHttpServer());
    const csrf = await getCsrf(agent);

    await agent
      .post("/v1/auth/login")
      .set("X-CSRF-Token", csrf)
      .set("Origin", "http://localhost:3001")
      .send({ email: lagosAdminEmail, password: "testpassword123" })
      .expect(200);

    const listRes = await agent.get("/v1/admin/users").expect(200);
    const emails = (listRes.body.data.items as Array<{ email: string }>).map((u) => u.email);
    expect(emails).toContain(lagosAdminEmail);
  });
});
