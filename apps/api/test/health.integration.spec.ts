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

  it("GET /v1/health/ready checks dependencies", async () => {
    const response = await request(app.getHttpServer())
      .get("/v1/health/ready")
      .expect(200);

    expect(response.body.data.status).toBe("ready");
    expect(response.body.data.checks).toHaveLength(2);
  });
});
