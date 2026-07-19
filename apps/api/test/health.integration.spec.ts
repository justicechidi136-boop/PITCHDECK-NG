import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PRISMA_CLIENT } from "../src/database/database.module";
import { REDIS_CLIENT } from "../src/redis/redis.module";

describe("Health endpoints (integration)", () => {
  let app: INestApplication;

  const mockPrisma = {
    $queryRaw: jest.fn().mockResolvedValue([{ "?column?": 1 }]),
  };

  const mockRedis = {
    status: "ready",
    connect: jest.fn().mockResolvedValue(undefined),
    ping: jest.fn().mockResolvedValue("PONG"),
    quit: jest.fn().mockResolvedValue(undefined),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PRISMA_CLIENT)
      .useValue(mockPrisma)
      .overrideProvider(REDIS_CLIENT)
      .useValue(mockRedis)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.setGlobalPrefix("v1");
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    mockPrisma.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);
    mockRedis.status = "ready";
    mockRedis.ping.mockResolvedValue("PONG");
  });

  it("GET /v1/health returns success envelope", async () => {
    const response = await request(app.getHttpServer()).get("/v1/health").expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe("ok");
    expect(response.headers["x-request-id"]).toBeDefined();
  });

  it("GET /v1/health/live returns liveness", async () => {
    const response = await request(app.getHttpServer())
      .get("/v1/health/live")
      .expect(200);

    expect(response.body.data.alive).toBe(true);
  });

  it("GET /v1/health/ready returns ready when dependencies are up", async () => {
    const response = await request(app.getHttpServer())
      .get("/v1/health/ready")
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe("ready");
    expect(response.body.data.checks).toHaveLength(2);
    expect(response.body.data.checks.every((check: { status: string }) => check.status === "up")).toBe(
      true,
    );
  });

  it("GET /v1/health/ready returns not_ready when Redis is unavailable", async () => {
    mockRedis.ping.mockRejectedValueOnce(new Error("Redis unavailable"));

    const response = await request(app.getHttpServer())
      .get("/v1/health/ready")
      .expect(503);

    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe("not_ready");
    expect(response.body.data.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "redis", status: "down" }),
      ]),
    );
  });

  it("GET /v1/health/ready returns not_ready when PostgreSQL is unavailable", async () => {
    mockPrisma.$queryRaw.mockRejectedValueOnce(new Error("PostgreSQL unavailable"));

    const response = await request(app.getHttpServer())
      .get("/v1/health/ready")
      .expect(503);

    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe("not_ready");
    expect(response.body.data.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "postgresql", status: "down" }),
      ]),
    );
  });
});
