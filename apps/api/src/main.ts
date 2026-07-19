import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Logger } from "nestjs-pino";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module";
import type { EnvConfig } from "./config/env.schema";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const configService = app.get(ConfigService<EnvConfig, true>);
  const logger = app.get(Logger);

  app.useLogger(logger);
  app.use(helmet());
  app.use(cookieParser());

  const corsOrigins = configService
    .get("CORS_ORIGINS", { infer: true })
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const apiPrefix = configService.get("API_PREFIX", { infer: true });
  app.setGlobalPrefix(apiPrefix);

  const nodeEnv = configService.get("NODE_ENV", { infer: true });
  if (nodeEnv !== "production") {
    const swaggerConfig = new DocumentBuilder()
      .setTitle("PitchDeck Nigeria API")
      .setDescription("Platform API for connecting innovators with sponsors")
      .setVersion(configService.get("APP_VERSION", { infer: true }))
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(`${apiPrefix}/docs`, app, document);
  }

  app.enableShutdownHooks();

  const port = configService.get("PORT", { infer: true });
  await app.listen(port);
  logger.log(`API listening on http://localhost:${String(port)}/${apiPrefix}`);
}

bootstrap().catch((error: unknown) => {
  console.error("Failed to start API:", error);
  process.exit(1);
});
