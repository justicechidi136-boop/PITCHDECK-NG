import { Module } from "@nestjs/common";
import { EmailCaptureStore } from "./email-capture.store";
import { EmailService } from "./email.service";

@Module({
  providers: [EmailCaptureStore, EmailService],
  exports: [EmailCaptureStore, EmailService],
})
export class EmailModule {}
