import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { PrismaClient } from "@prisma/client";
import {
  AuditAction,
  DocumentPurpose,
  FileUploadStatus,
  FileScanStatus,
  SponsorMembershipRole,
  STAGE3_ERROR_CODES,
  getMaxBytesForPurpose,
  isMimeAllowed,
  sanitizeDisplayFilename,
  type FileAssetDto,
  type UploadIntentDto,
} from "@pitchdeck/contracts";
import { PRISMA_CLIENT } from "../database/database.module";
import type { EnvConfig } from "../config/env.schema";
import type { AuthenticatedUser } from "../rbac/rbac.service";
import { AuditService } from "../audit/audit.service";
import { RateLimitService } from "../rate-limit/rate-limit.service";
import { ObjectStorageService } from "../storage/object-storage.service";
import { MalwareScannerService } from "../storage/malware-scanner.service";
import { Stage3ScopeService } from "../stage3/stage3-scope.service";
import { RbacService } from "../rbac/rbac.service";

@Injectable()
export class FilesService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    private readonly storage: ObjectStorageService,
    private readonly scanner: MalwareScannerService,
    private readonly scope: Stage3ScopeService,
    private readonly rbac: RbacService,
    private readonly audit: AuditService,
    private readonly rateLimit: RateLimitService,
    private readonly configService: ConfigService<EnvConfig, true>,
  ) {}

  async createUploadIntent(
    user: AuthenticatedUser,
    input: {
      purpose: DocumentPurpose;
      originalFilename: string;
      declaredMimeType: string;
      sizeBytes: number;
      pitchId?: string;
      organizationId?: string;
    },
  ): Promise<UploadIntentDto> {
    const limit = await this.rateLimit.checkLimit(
      `upload-intent:${user.id}`,
      20,
      3600,
    );
    if (!limit.allowed) {
      throw new BadRequestException({
        code: STAGE3_ERROR_CODES.RATE_LIMITED,
        message: "Upload intent rate limit exceeded",
      });
    }

    if (!isMimeAllowed(input.purpose, input.declaredMimeType)) {
      throw new BadRequestException({
        code: STAGE3_ERROR_CODES.VALIDATION_FAILED,
        message: "MIME type not allowed for purpose",
      });
    }

    const maxBytes = getMaxBytesForPurpose(input.purpose);
    if (input.sizeBytes > maxBytes) {
      throw new BadRequestException({
        code: STAGE3_ERROR_CODES.VALIDATION_FAILED,
        message: "File exceeds maximum size",
      });
    }

    if (input.pitchId) {
      await this.scope.assertPitchOwner(input.pitchId, user.id);
    }
    if (input.organizationId) {
      await this.scope.assertOrgMember(input.organizationId, user.id, SponsorMembershipRole.ADMIN);
    }

    const objectKey = this.storage.generateObjectKey();
    const intentTtl = this.configService.get("UPLOAD_INTENT_TTL_MINUTES", { infer: true });
    const expiresAt = new Date(Date.now() + intentTtl * 60_000);

    const asset = await this.prisma.fileAsset.create({
      data: {
        ownerId: user.id,
        pitchId: input.pitchId,
        organizationId: input.organizationId,
        purpose: input.purpose,
        bucket: this.storage.getBucket(),
        objectKey,
        originalFilename: input.originalFilename,
        displayFilename: sanitizeDisplayFilename(input.originalFilename),
        declaredMimeType: input.declaredMimeType,
        uploadStatus: FileUploadStatus.PENDING_UPLOAD,
        scanStatus: FileScanStatus.PENDING,
        intentExpiresAt: expiresAt,
      },
    });

    const uploadUrl = await this.storage.createUploadUrl(
      objectKey,
      input.declaredMimeType,
      maxBytes,
    );

    await this.audit.log({
      action: AuditAction.FILE_UPLOAD_INIT,
      entityType: "FileAsset",
      entityId: asset.id,
      actorId: user.id,
    });

    return {
      fileId: asset.id,
      uploadUrl,
      expiresAt: expiresAt.toISOString(),
      maxBytes,
    };
  }

  async completeUpload(user: AuthenticatedUser, fileId: string): Promise<FileAssetDto> {
    const limit = await this.rateLimit.checkLimit(`upload-complete:${user.id}`, 30, 3600);
    if (!limit.allowed) {
      throw new BadRequestException({
        code: STAGE3_ERROR_CODES.RATE_LIMITED,
        message: "Upload completion rate limit exceeded",
      });
    }

    const asset = await this.prisma.fileAsset.findUnique({ where: { id: fileId } });
    if (!asset || asset.ownerId !== user.id) {
      throw new NotFoundException({
        code: STAGE3_ERROR_CODES.NOT_FOUND,
        message: "File not found",
      });
    }

    if (asset.intentExpiresAt && asset.intentExpiresAt < new Date()) {
      throw new BadRequestException({
        code: STAGE3_ERROR_CODES.VALIDATION_FAILED,
        message: "Upload intent expired",
      });
    }

    const head = await this.storage.headObject(asset.objectKey);
    if (!head || head.size === 0) {
      throw new BadRequestException({
        code: STAGE3_ERROR_CODES.VALIDATION_FAILED,
        message: "Object not found in storage",
      });
    }

    const maxBytes = getMaxBytesForPurpose(asset.purpose as DocumentPurpose);
    if (head.size > maxBytes) {
      await this.rejectFile(asset.id, "Size exceeds limit");
      throw new BadRequestException({
        code: STAGE3_ERROR_CODES.VALIDATION_FAILED,
        message: "Uploaded file exceeds maximum size",
      });
    }

    const detectedMime = head.contentType ?? asset.declaredMimeType;
    if (!isMimeAllowed(asset.purpose as DocumentPurpose, detectedMime)) {
      await this.rejectFile(asset.id, "MIME mismatch");
      throw new BadRequestException({
        code: STAGE3_ERROR_CODES.VALIDATION_FAILED,
        message: "Detected MIME type not allowed",
      });
    }

    await this.prisma.fileAsset.update({
      where: { id: fileId },
      data: {
        sizeBytes: BigInt(head.size),
        detectedMimeType: detectedMime,
        uploadStatus: FileUploadStatus.PENDING_SCAN,
        scanStatus: FileScanStatus.SCANNING,
      },
    });

    const scanResult = await this.scanner.scan(asset.objectKey);
    if (!scanResult.clean) {
      await this.rejectFile(asset.id, scanResult.message ?? "Scan failed");
      throw new BadRequestException({
        code: STAGE3_ERROR_CODES.FILE_REJECTED,
        message: "File rejected by scanner",
      });
    }

    const finalized = await this.prisma.fileAsset.update({
      where: { id: fileId },
      data: {
        uploadStatus: FileUploadStatus.AVAILABLE,
        scanStatus: FileScanStatus.CLEAN,
        finalizedAt: new Date(),
      },
    });

    await this.audit.log({
      action: AuditAction.FILE_UPLOAD_COMPLETE,
      entityType: "FileAsset",
      entityId: fileId,
      actorId: user.id,
    });

    return this.toDto(finalized);
  }

  async getFile(user: AuthenticatedUser, fileId: string): Promise<FileAssetDto> {
    await this.assertFileAccess(user, fileId);
    const asset = await this.prisma.fileAsset.findUniqueOrThrow({ where: { id: fileId } });
    return this.toDto(asset);
  }

  async getDownloadUrl(user: AuthenticatedUser, fileId: string): Promise<{ url: string; expiresIn: number }> {
    const limit = await this.rateLimit.checkLimit(`download:${user.id}`, 50, 3600);
    if (!limit.allowed) {
      throw new BadRequestException({
        code: STAGE3_ERROR_CODES.RATE_LIMITED,
        message: "Download rate limit exceeded",
      });
    }

    await this.assertFileAccess(user, fileId);
    const asset = await this.prisma.fileAsset.findUniqueOrThrow({ where: { id: fileId } });

    if (
      (asset.uploadStatus as FileUploadStatus) !== FileUploadStatus.AVAILABLE ||
      (asset.scanStatus as FileScanStatus) !== FileScanStatus.CLEAN
    ) {
      throw new ForbiddenException({
        code: STAGE3_ERROR_CODES.FILE_NOT_AVAILABLE,
        message: "File not available for download",
      });
    }

    const url = await this.storage.createDownloadUrl(
      asset.objectKey,
      asset.displayFilename,
      asset.detectedMimeType ?? asset.declaredMimeType,
    );

    const ttl = this.configService.get("OBJECT_STORAGE_SIGNED_URL_TTL_SECONDS", { infer: true });

    await this.audit.log({
      action: AuditAction.FILE_ACCESS,
      entityType: "FileAsset",
      entityId: fileId,
      actorId: user.id,
    });

    return { url, expiresIn: ttl };
  }

  async deleteFile(user: AuthenticatedUser, fileId: string): Promise<void> {
    const asset = await this.prisma.fileAsset.findUnique({ where: { id: fileId } });
    if (!asset || asset.ownerId !== user.id) {
      throw new NotFoundException({
        code: STAGE3_ERROR_CODES.NOT_FOUND,
        message: "File not found",
      });
    }
    await this.storage.deleteObject(asset.objectKey);
    await this.prisma.fileAsset.update({
      where: { id: fileId },
      data: { uploadStatus: FileUploadStatus.DELETED, deletedAt: new Date() },
    });
  }

  private async assertFileAccess(user: AuthenticatedUser, fileId: string): Promise<void> {
    const asset = await this.prisma.fileAsset.findUnique({ where: { id: fileId } });
    if (!asset) {
      throw new NotFoundException({
        code: STAGE3_ERROR_CODES.NOT_FOUND,
        message: "File not found",
      });
    }

    if (asset.ownerId === user.id) {
      return;
    }

    if (this.rbac.isAnyAdmin(user)) {
      if (asset.pitchId) {
        const pitch = await this.prisma.pitch.findUnique({ where: { id: asset.pitchId } });
        if (pitch && this.scope.canAdminAccessPitchState(user, pitch.stateId)) {
          return;
        }
      }
      if (asset.organizationId) {
        const org = await this.prisma.sponsorOrganization.findUnique({
          where: { id: asset.organizationId },
        });
        if (org && this.scope.canAdminAccessOrgState(user, org.stateId)) {
          return;
        }
      }
    }

    const assignment = await this.prisma.pitchReviewAssignment.findFirst({
      where: {
        reviewerId: user.id,
        status: { in: ["ASSIGNED", "ACCEPTED", "COMPLETED"] },
        submission: {
          documents: { some: { fileAssetId: fileId } },
        },
      },
    });
    if (assignment) {
      return;
    }

    throw new ForbiddenException({
      code: STAGE3_ERROR_CODES.FORBIDDEN,
      message: "File access denied",
    });
  }

  private async rejectFile(fileId: string, message: string): Promise<void> {
    await this.prisma.fileAsset.update({
      where: { id: fileId },
      data: {
        uploadStatus: FileUploadStatus.REJECTED,
        scanStatus: FileScanStatus.INFECTED,
        scanMessage: message,
      },
    });
    await this.audit.log({
      action: AuditAction.FILE_REJECTED,
      entityType: "FileAsset",
      entityId: fileId,
      metadata: { reason: message },
    });
  }

  private toDto(asset: {
    id: string;
    purpose: string;
    originalFilename: string;
    displayFilename: string;
    declaredMimeType: string;
    detectedMimeType: string | null;
    sizeBytes: bigint | null;
    uploadStatus: string;
    scanStatus: string;
    scanMessage: string | null;
    createdAt: Date;
    finalizedAt: Date | null;
  }): FileAssetDto {
    return {
      id: asset.id,
      purpose: asset.purpose as DocumentPurpose,
      originalFilename: asset.originalFilename,
      displayFilename: asset.displayFilename,
      declaredMimeType: asset.declaredMimeType,
      detectedMimeType: asset.detectedMimeType ?? undefined,
      sizeBytes: asset.sizeBytes?.toString(),
      uploadStatus: asset.uploadStatus as FileUploadStatus,
      scanStatus: asset.scanStatus as FileScanStatus,
      scanMessage: asset.scanMessage ?? undefined,
      createdAt: asset.createdAt.toISOString(),
      finalizedAt: asset.finalizedAt?.toISOString(),
    };
  }
}
