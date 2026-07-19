import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  S3Client,
  HeadObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomBytes } from "node:crypto";
import type { EnvConfig } from "../config/env.schema";

@Injectable()
export class ObjectStorageService {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly signedUrlTtl: number;

  constructor(private readonly configService: ConfigService<EnvConfig, true>) {
    const endpoint = this.configService.get("OBJECT_STORAGE_INTERNAL_ENDPOINT", {
      infer: true,
    });
    const accessKey = this.configService.get("OBJECT_STORAGE_ACCESS_KEY", { infer: true });
    const secretKey = this.configService.get("OBJECT_STORAGE_SECRET_KEY", { infer: true });
    const region = this.configService.get("OBJECT_STORAGE_REGION", { infer: true });
    const forcePathStyle = this.configService.get("OBJECT_STORAGE_FORCE_PATH_STYLE", {
      infer: true,
    });

    this.bucket = this.configService.get("OBJECT_STORAGE_BUCKET", { infer: true });
    this.signedUrlTtl = this.configService.get("OBJECT_STORAGE_SIGNED_URL_TTL_SECONDS", {
      infer: true,
    });

    this.client = new S3Client({
      region,
      endpoint,
      forcePathStyle,
      credentials:
        accessKey && secretKey
          ? { accessKeyId: accessKey, secretAccessKey: secretKey }
          : {
              accessKeyId: "pitchdeck_minio",
              secretAccessKey: "pitchdeck_minio_dev",
            },
    });
  }

  generateObjectKey(): string {
    return randomBytes(32).toString("hex");
  }

  async createUploadUrl(objectKey: string, contentType: string, _maxBytes: number): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: objectKey,
      ContentType: contentType,
    });
    return getSignedUrl(this.client, command, { expiresIn: this.signedUrlTtl });
  }

  async createDownloadUrl(objectKey: string, filename: string, contentType: string): Promise<string> {
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: objectKey,
      ResponseContentDisposition: `attachment; filename="${filename.replace(/"/g, "")}"`,
      ResponseContentType: contentType,
    });
    return getSignedUrl(this.client, command, { expiresIn: this.signedUrlTtl });
  }

  async headObject(objectKey: string): Promise<{ size: number; contentType?: string } | null> {
    try {
      const result = await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: objectKey }),
      );
      return {
        size: result.ContentLength ?? 0,
        contentType: result.ContentType,
      };
    } catch {
      return null;
    }
  }

  async deleteObject(objectKey: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: objectKey }),
    );
  }

  async getObjectBuffer(objectKey: string): Promise<Buffer | null> {
    try {
      const result = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: objectKey }),
      );
      if (!result.Body) {
        return null;
      }
      const bytes = await result.Body.transformToByteArray();
      return Buffer.from(bytes);
    } catch {
      return null;
    }
  }

  getBucket(): string {
    return this.bucket;
  }
}
