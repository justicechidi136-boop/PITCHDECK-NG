import { Controller, Delete, Get, NotFoundException, Query } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Public } from "../auth/decorators/public.decorator";
import { EmailCaptureStore } from "../email/email-capture.store";
import type { EnvConfig } from "../config/env.schema";

@Controller("test/emails")
export class TestEmailController {
  constructor(
    private readonly emailCaptureStore: EmailCaptureStore,
    private readonly configService: ConfigService<EnvConfig, true>,
  ) {}

  @Public()
  @Get()
  list(@Query("to") to?: string) {
    this.assertEnabled();
    return { emails: this.emailCaptureStore.list(to) };
  }

  @Public()
  @Delete()
  clear() {
    this.assertEnabled();
    this.emailCaptureStore.clear();
    return { cleared: true };
  }

  private assertEnabled(): void {
    const enabled = this.configService.get("ENABLE_TEST_ENDPOINTS", { infer: true });
    if (!enabled) {
      throw new NotFoundException();
    }
  }
}
