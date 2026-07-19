import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { SendEmailOptions } from "./email.service";

export interface CapturedEmail {
  id: string;
  to: string;
  subject: string;
  actionUrl: string;
  capturedAt: string;
}

@Injectable()
export class EmailCaptureStore {
  private readonly emails: CapturedEmail[] = [];

  capture(options: SendEmailOptions): CapturedEmail {
    const actionUrl = this.extractActionUrl(options.html) ?? this.extractActionUrl(options.text) ?? "";
    const captured: CapturedEmail = {
      id: randomUUID(),
      to: options.to,
      subject: options.subject,
      actionUrl,
      capturedAt: new Date().toISOString(),
    };
    this.emails.push(captured);
    return captured;
  }

  list(to?: string): CapturedEmail[] {
    if (!to) {
      return [...this.emails];
    }
    return this.emails.filter((email) => email.to.toLowerCase() === to.toLowerCase());
  }

  clear(): void {
    this.emails.length = 0;
  }

  private extractActionUrl(content: string): string | undefined {
    const match = /https?:\/\/[^\s"'<>]+/i.exec(content);
    return match?.[0];
  }
}
