import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createErrorResponse } from "@pitchdeck/contracts";
import type { Request, Response } from "express";
import type { EnvConfig } from "../../config/env.schema";

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(private readonly configService: ConfigService<EnvConfig, true>) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { requestId?: string }>();
    const requestId = request.requestId ?? crypto.randomUUID();
    const isProduction =
      this.configService.get("NODE_ENV", { infer: true }) === "production";

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = "INTERNAL_SERVER_ERROR";
    let message = "An unexpected error occurred";

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === "string") {
        message = exceptionResponse;
        const statusName = HttpStatus[status];
        code = typeof statusName === "string" ? statusName : code;
      } else if (typeof exceptionResponse === "object") {
        const body = exceptionResponse as Record<string, unknown>;
        message =
          typeof body.message === "string"
            ? body.message
            : Array.isArray(body.message)
              ? body.message.join(", ")
              : message;
        code =
          typeof body.error === "string"
            ? body.error
            : typeof HttpStatus[status] === "string"
              ? HttpStatus[status]
              : code;
      }
    } else if (exception instanceof Error) {
      message = isProduction ? message : exception.message;
      this.logger.error(exception.message, exception.stack);
    }

    response.status(status).json(
      createErrorResponse(code, message, {
        requestId,
        timestamp: new Date().toISOString(),
      }),
    );
  }
}
