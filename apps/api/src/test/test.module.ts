import { Module } from "@nestjs/common";
import { EmailModule } from "../email/email.module";
import { TestEmailController } from "./test-email.controller";

@Module({
  imports: [EmailModule],
  controllers: [TestEmailController],
})
export class TestModule {}
