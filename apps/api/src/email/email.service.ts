import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Transporter } from "nodemailer";
import nodemailer from "nodemailer";
import type { EnvConfig } from "../config/env.schema";

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

@Injectable()
export class EmailService {
  private readonly provider: "log" | "smtp";
  private readonly from: string;
  private readonly nodeEnv: string;
  private transporter: Transporter | null = null;

  constructor(private readonly configService: ConfigService<EnvConfig, true>) {
    this.provider = this.configService.get<EnvConfig["EMAIL_PROVIDER"]>("EMAIL_PROVIDER", "log");
    this.from = this.configService.get<string>("EMAIL_FROM", "noreply@pitchdeck.ng");
    this.nodeEnv = this.configService.get<string>("NODE_ENV", "development");

    if (this.provider === "smtp") {
      this.transporter = nodemailer.createTransport({
        host: this.configService.get<string>("SMTP_HOST"),
        port: this.configService.get<number>("SMTP_PORT"),
        secure: this.configService.get<boolean>("SMTP_SECURE"),
        auth: {
          user: this.configService.get<string>("SMTP_USER"),
          pass: this.configService.get<string>("SMTP_PASS"),
        },
      });
    }
  }

  async sendEmail(options: SendEmailOptions): Promise<void> {
    if (this.provider === "log") {
      const logPayload =
        this.nodeEnv === "production"
          ? { to: options.to, subject: options.subject }
          : options;
      console.info("[EmailService]", JSON.stringify(logPayload));
      return;
    }

    if (!this.transporter) {
      throw new Error("SMTP transporter not configured");
    }

    await this.transporter.sendMail({
      from: this.from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
  }

  buildVerificationEmail(verifyUrl: string): Pick<SendEmailOptions, "subject" | "html" | "text"> {
    return {
      subject: "Verify your PitchDeck Nigeria email",
      text: `Verify your email by visiting: ${verifyUrl}`,
      html: `<p>Welcome to PitchDeck Nigeria.</p><p><a href="${verifyUrl}">Verify your email</a></p>`,
    };
  }

  buildPasswordResetEmail(resetUrl: string): Pick<SendEmailOptions, "subject" | "html" | "text"> {
    return {
      subject: "Reset your PitchDeck Nigeria password",
      text: `Reset your password by visiting: ${resetUrl}`,
      html: `<p>Reset your password:</p><p><a href="${resetUrl}">Reset password</a></p>`,
    };
  }

  buildActivationEmail(activateUrl: string): Pick<SendEmailOptions, "subject" | "html" | "text"> {
    return {
      subject: "Activate your PitchDeck Nigeria admin account",
      text: `Activate your account by visiting: ${activateUrl}`,
      html: `<p>An admin account was created for you.</p><p><a href="${activateUrl}">Activate account</a></p>`,
    };
  }
}
