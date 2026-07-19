import { Injectable, NotFoundException } from "@nestjs/common";
import { Inject } from "@nestjs/common";
import type { PrismaClient } from "@prisma/client";
import {
  PitchStatus,
  ProfileVisibility,
  STAGE3_ERROR_CODES,
  type InnovationStage,
  type DiscoveryPitchDto,
  type PaginatedMeta,
} from "@pitchdeck/contracts";
import { PRISMA_CLIENT } from "../database/database.module";
import type { AuthenticatedUser } from "../rbac/rbac.service";
import { Stage3ScopeService } from "../stage3/stage3-scope.service";
import { RateLimitService } from "../rate-limit/rate-limit.service";

@Injectable()
export class DiscoveryService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    private readonly scope: Stage3ScopeService,
    private readonly rateLimit: RateLimitService,
  ) {}

  async listPitches(
    user: AuthenticatedUser,
    filters: {
      sectorId?: string;
      stateCode?: string;
      innovationStage?: string;
      keyword?: string;
      page?: number;
      pageSize?: number;
    },
  ): Promise<{ items: DiscoveryPitchDto[]; pagination: PaginatedMeta }> {
    await this.scope.assertVerifiedSponsorMember(user.id);

    const limit = await this.rateLimit.checkLimit(`discovery:${user.id}`, 100, 3600);
    if (!limit.allowed) {
      throw new NotFoundException({ code: STAGE3_ERROR_CODES.RATE_LIMITED, message: "Rate limited" });
    }

    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const state = filters.stateCode
      ? await this.prisma.state.findUnique({ where: { code: filters.stateCode } })
      : null;

    const where = {
      status: PitchStatus.APPROVED,
      discoverySuspended: false,
      ...(filters.sectorId ? { primarySectorId: filters.sectorId } : {}),
      ...(state ? { stateId: state.id } : {}),
      ...(filters.innovationStage ? { innovationStage: filters.innovationStage as never } : {}),
      ...(filters.keyword
        ? {
            OR: [
              { title: { contains: filters.keyword, mode: "insensitive" as const } },
              { shortSummary: { contains: filters.keyword, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [total, pitches] = await Promise.all([
      this.prisma.pitch.count({ where }),
      this.prisma.pitch.findMany({
        where,
        include: {
          primarySector: true,
          state: true,
          owner: { include: { innovatorProfile: { include: { sectors: { include: { sector: true } }, state: true } } } },
          submissions: {
            where: { reviewStatus: PitchStatus.APPROVED },
            orderBy: { version: "desc" },
            take: 1,
            include: { documents: true },
          },
        },
        skip,
        take: pageSize,
        orderBy: { approvedAt: "desc" },
      }),
    ]);

    const items: DiscoveryPitchDto[] = pitches.map((pitch) => {
      const submission = pitch.submissions[0];
      const snapshot = (submission?.snapshot ?? {}) as Record<string, unknown>;
      const profile = pitch.owner.innovatorProfile;
      const snapshotString = (key: string): string | undefined => {
        const value = snapshot[key];
        return typeof value === "string" ? value : undefined;
      };
      const publicProfile =
        profile && (profile.visibility as ProfileVisibility) === ProfileVisibility.PUBLIC
          ? {
              displayName: profile.displayName ?? undefined,
              headline: profile.headline ?? undefined,
              biography: profile.biography ?? undefined,
              organizationName: profile.organizationName ?? undefined,
              isIndependent: profile.isIndependent,
              city: profile.city ?? undefined,
              stateCode: profile.state?.code,
              countryCode: profile.countryCode,
              sectorNames: profile.sectors.map((s) => s.sector.name),
            }
          : undefined;

      return {
        id: submission?.id ?? pitch.id,
        pitchId: pitch.id,
        title: snapshotString("title") ?? pitch.title,
        shortSummary: snapshotString("shortSummary") ?? pitch.shortSummary ?? undefined,
        problemStatement: snapshotString("problemStatement"),
        proposedSolution: snapshotString("proposedSolution"),
        socialImpact: snapshotString("socialImpact"),
        currentTraction: snapshotString("currentTraction"),
        innovationStage:
          (snapshotString("innovationStage") as InnovationStage | undefined) ??
          (pitch.innovationStage as InnovationStage | null) ??
          undefined,
        primarySectorName: pitch.primarySector?.name,
        stateCode: pitch.state?.code,
        fundingAmountRequested: snapshotString("fundingAmountRequested") ?? pitch.fundingAmountRequested?.toString(),
        fundingCurrency: pitch.fundingCurrency,
        approvedAt: pitch.approvedAt?.toISOString(),
        innovatorProfile: publicProfile,
        documentIds: submission?.documents.map((d) => d.fileAssetId) ?? [],
      };
    });

    return {
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async getPitch(user: AuthenticatedUser, pitchId: string): Promise<DiscoveryPitchDto> {
    await this.scope.assertVerifiedSponsorMember(user.id);
    const pitch = await this.prisma.pitch.findFirst({
      where: { id: pitchId, status: PitchStatus.APPROVED, discoverySuspended: false },
      include: {
        primarySector: true,
        state: true,
        owner: { include: { innovatorProfile: { include: { sectors: { include: { sector: true } }, state: true } } } },
        submissions: {
          where: { reviewStatus: PitchStatus.APPROVED },
          orderBy: { version: "desc" },
          take: 1,
          include: { documents: true },
        },
      },
    });
    if (!pitch) {
      throw new NotFoundException({
        code: STAGE3_ERROR_CODES.NOT_FOUND,
        message: "Pitch not found or not discoverable",
      });
    }
    const listed = await this.listPitches(user, { page: 1, pageSize: 1000 });
    const found = listed.items.find((i) => i.pitchId === pitchId);
    if (!found) {
      throw new NotFoundException({
        code: STAGE3_ERROR_CODES.NOT_FOUND,
        message: "Pitch not found",
      });
    }
    return found;
  }
}
