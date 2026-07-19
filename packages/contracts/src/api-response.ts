import { z } from "zod";

export const apiMetaSchema = z.object({
  requestId: z.string().uuid(),
  timestamp: z.string().datetime(),
});

export type ApiMeta = z.infer<typeof apiMetaSchema>;

export const paginationSchema = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  totalItems: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

export type Pagination = z.infer<typeof paginationSchema>;

export const apiSuccessSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    meta: apiMetaSchema,
  });

export const apiErrorDetailSchema = z.object({
  code: z.string(),
  message: z.string(),
  field: z.string().optional(),
});

export type ApiErrorDetail = z.infer<typeof apiErrorDetailSchema>;

export const apiErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.array(apiErrorDetailSchema).optional(),
  }),
  meta: apiMetaSchema,
});

export type ApiError = z.infer<typeof apiErrorSchema>;

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta: ApiMeta;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[];
  };
  meta: ApiMeta;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export function createSuccessResponse<T>(
  data: T,
  meta: ApiMeta,
): ApiSuccessResponse<T> {
  return { success: true, data, meta };
}

export function createErrorResponse(
  code: string,
  message: string,
  meta: ApiMeta,
  details?: ApiErrorDetail[],
): ApiErrorResponse {
  return {
    success: false,
    error: { code, message, details },
    meta,
  };
}
