import {
  Injectable,
} from "@nestjs/common";
import { Inject } from "@nestjs/common";
import type { PrismaClient } from "@prisma/client";
import { AuditAction } from "@pitchdeck/contracts";
import {
  calculateProfileCompleteness,
  type InnovatorProfileDto,
  type CompletenessResult,
  ProfileVisibility,
} from "@pitchdeck/contracts";
import { PRISMA_CLIENT } from "../database/database.module";
import type { AuthenticatedUser } from "../rbac/rbac.service";
import { AuditService } from "../audit/audit.service";
import { Stage3ScopeService } from "../stage3/stage3-scope.service";

@Injectable()
export class InnovatorService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    private readonly scope: Stage3ScopeService,
    private readonly audit: AuditService,
  ) {}

  async getProfile(user: AuthenticatedUser): Promise<InnovatorProfileDto | null> {
    this.scope.assertInnovator(user);
    const profile = await this.prisma.innovatorProfile.findUnique({
      where: { userId: user.id },
      include: { sectors: true, state: true },
    });
    if (!profile) {
      return null;
    }
    return this.toDto(profile);
  }

  async upsertProfile(
    user: AuthenticatedUser,
    input: Record<string, unknown>,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<InnovatorProfileDto> {
    this.scope.assertInnovator(user);
    const dbUser = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    const sectorIds = (input.sectorIds as string[] | undefined) ?? [];

    const data = {
      displayName: input.displayName as string | undefined,
      headline: input.headline as string | undefined,
      biography: input.biography as string | undefined,
      organizationName: input.organizationName as string | undefined,
      isIndependent: input.isIndependent as boolean | undefined,
      city: input.city as string | undefined,
      stateId: input.stateId as string | undefined,
      websiteUrl: (input.websiteUrl as string) || null,
      linkedinUrl: (input.linkedinUrl as string) || null,
      portfolioUrl: (input.portfolioUrl as string) || null,
      yearsOfExperience: input.yearsOfExperience as number | undefined,
      innovationInterests: input.innovationInterests as string | undefined,
      visibility: input.visibility as never,
    };

    const completeness = calculateProfileCompleteness({
      ...data,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      sectorIds,
    });

    const profile = await this.prisma.$transaction(async (tx) => {
      const upserted = await tx.innovatorProfile.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          ...data,
          completionPercent: completeness.completionPercent,
        },
        update: {
          ...data,
          completionPercent: completeness.completionPercent,
        },
        include: { sectors: true, state: true },
      });

      if (sectorIds.length > 0) {
        await tx.innovatorProfileSector.deleteMany({ where: { profileId: upserted.id } });
        await tx.innovatorProfileSector.createMany({
          data: sectorIds.map((sectorId) => ({ profileId: upserted.id, sectorId })),
        });
      }

      return tx.innovatorProfile.findUniqueOrThrow({
        where: { id: upserted.id },
        include: { sectors: true, state: true },
      });
    });

    await this.audit.log({
      action: AuditAction.PROFILE_UPDATE,
      entityType: "InnovatorProfile",
      entityId: profile.id,
      actorId: user.id,
      metadata: { completionPercent: completeness.completionPercent },
      ipAddress,
      userAgent,
    });

    return this.toDto(profile);
  }

  async getCompleteness(user: AuthenticatedUser): Promise<CompletenessResult> {
    this.scope.assertInnovator(user);
    const profile = await this.prisma.innovatorProfile.findUnique({
      where: { userId: user.id },
      include: { sectors: true },
    });
    const dbUser = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    return calculateProfileCompleteness({
      displayName: profile?.displayName,
      headline: profile?.headline,
      biography: profile?.biography,
      organizationName: profile?.organizationName,
      isIndependent: profile?.isIndependent,
      stateId: profile?.stateId,
      sectorIds: profile?.sectors.map((s) => s.sectorId),
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
    });
  }

  async getProfileCompletionForUser(userId: string): Promise<number> {
    const profile = await this.prisma.innovatorProfile.findUnique({
      where: { userId },
    });
    return profile?.completionPercent ?? 0;
  }

  private toDto(profile: {
    id: string;
    userId: string;
    displayName: string | null;
    headline: string | null;
    biography: string | null;
    organizationName: string | null;
    isIndependent: boolean;
    city: string | null;
    stateId: string | null;
    countryCode: string;
    websiteUrl: string | null;
    linkedinUrl: string | null;
    portfolioUrl: string | null;
    yearsOfExperience: number | null;
    innovationInterests: string | null;
    visibility: string;
    completionPercent: number;
    createdAt: Date;
    updatedAt: Date;
    sectors: Array<{ sectorId: string }>;
    state?: { code: string } | null;
  }): InnovatorProfileDto {
    return {
      id: profile.id,
      userId: profile.userId,
      displayName: profile.displayName ?? undefined,
      headline: profile.headline ?? undefined,
      biography: profile.biography ?? undefined,
      organizationName: profile.organizationName ?? undefined,
      isIndependent: profile.isIndependent,
      city: profile.city ?? undefined,
      stateId: profile.stateId ?? undefined,
      stateCode: profile.state?.code,
      countryCode: profile.countryCode,
      websiteUrl: profile.websiteUrl ?? undefined,
      linkedinUrl: profile.linkedinUrl ?? undefined,
      portfolioUrl: profile.portfolioUrl ?? undefined,
      yearsOfExperience: profile.yearsOfExperience ?? undefined,
      innovationInterests: profile.innovationInterests ?? undefined,
      visibility: profile.visibility as ProfileVisibility,
      completionPercent: profile.completionPercent,
      sectorIds: profile.sectors.map((s) => s.sectorId),
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
    };
  }
}
