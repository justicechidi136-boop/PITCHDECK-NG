import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Transporter } from "nodemailer";
import nodemailer from "nodemailer";
import type { EnvConfig } from "../config/env.schema";
import { EmailCaptureStore } from "./email-capture.store";

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

@Injectable()
export class EmailService {
  private readonly provider: "log" | "smtp" | "capture";
  private readonly from: string;
  private readonly nodeEnv: string;
  private transporter: Transporter | null = null;

  constructor(
    private readonly configService: ConfigService<EnvConfig, true>,
    private readonly emailCaptureStore: EmailCaptureStore,
  ) {
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
    if (this.provider === "capture") {
      this.emailCaptureStore.capture(options);
      return;
    }

    if (this.provider === "log") {
      const logPayload =
        this.nodeEnv === "production"
          ? { to: options.to, subject: options.subject }
          : { to: options.to, subject: options.subject, text: options.text };
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

  buildPitchSubmittedEmail(pitchTitle: string, pitchUrl: string): Pick<SendEmailOptions, "subject" | "html" | "text"> {
    return {
      subject: "Pitch submitted — PitchDeck Nigeria",
      text: `Your pitch "${pitchTitle}" was submitted. View status: ${pitchUrl}`,
      html: `<p>Your pitch <strong>${pitchTitle}</strong> was submitted successfully.</p><p><a href="${pitchUrl}">View pitch status</a></p>`,
    };
  }

  buildPitchChangesRequestedEmail(pitchTitle: string, reason: string, pitchUrl: string): Pick<SendEmailOptions, "subject" | "html" | "text"> {
    return {
      subject: "Changes requested on your pitch",
      text: `${reason}\n\nEdit: ${pitchUrl}`,
      html: `<p>Changes were requested for <strong>${pitchTitle}</strong>.</p><p>${reason}</p><p><a href="${pitchUrl}">Edit pitch</a></p>`,
    };
  }

  buildPitchApprovedEmail(pitchTitle: string): Pick<SendEmailOptions, "subject" | "html" | "text"> {
    return {
      subject: "Pitch approved — PitchDeck Nigeria",
      text: `Your pitch "${pitchTitle}" has been approved.`,
      html: `<p>Your pitch <strong>${pitchTitle}</strong> has been approved and may appear in sponsor discovery.</p>`,
    };
  }

  buildPitchRejectedEmail(pitchTitle: string, reason: string): Pick<SendEmailOptions, "subject" | "html" | "text"> {
    return {
      subject: "Pitch decision — PitchDeck Nigeria",
      text: `Your pitch "${pitchTitle}" was not approved. ${reason}`,
      html: `<p>Your pitch <strong>${pitchTitle}</strong> was not approved.</p><p>${reason}</p>`,
    };
  }

  buildReviewerAssignedEmail(pitchTitle: string, adminUrl: string): Pick<SendEmailOptions, "subject" | "html" | "text"> {
    return {
      subject: "Review assignment — PitchDeck Nigeria",
      text: `You were assigned to review "${pitchTitle}". ${adminUrl}`,
      html: `<p>You were assigned to review <strong>${pitchTitle}</strong>.</p><p><a href="${adminUrl}">Open reviewer workspace</a></p>`,
    };
  }

  buildSponsorVerifiedEmail(orgName: string): Pick<SendEmailOptions, "subject" | "html" | "text"> {
    return {
      subject: "Organisation verified — PitchDeck Nigeria",
      text: `Your organisation "${orgName}" has been verified.`,
      html: `<p>Your organisation <strong>${orgName}</strong> is now verified. You may browse approved pitches in discovery.</p>`,
    };
  }

  buildMembershipAddedEmail(orgName: string): Pick<SendEmailOptions, "subject" | "html" | "text"> {
    return {
      subject: "Added to sponsor organisation",
      text: `You were added to ${orgName} on PitchDeck Nigeria.`,
      html: `<p>You were added to <strong>${orgName}</strong>.</p>`,
    };
  }
}
