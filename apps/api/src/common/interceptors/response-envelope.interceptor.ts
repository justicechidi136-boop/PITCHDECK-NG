import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { createSuccessResponse, type ApiMeta } from "@pitchdeck/contracts";
import type { Request } from "express";

@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request & { requestId?: string }>();
    const requestId = request.requestId ?? crypto.randomUUID();
    const meta: ApiMeta = {
      requestId,
      timestamp: new Date().toISOString(),
    };

    return next.handle().pipe(
      map((data: unknown) => {
        if (
          data &&
          typeof data === "object" &&
          "success" in data &&
          !(data as { success: boolean }).success
        ) {
          return data;
        }
        return createSuccessResponse(data, meta);
      }),
    );
  }
}
