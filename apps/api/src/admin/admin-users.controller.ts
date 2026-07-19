import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AdminUsersService } from "./admin-users.service";
import { CurrentUser, RequestMeta, type RequestUser } from "../auth/decorators/current-user.decorator";
import { AdminGuard } from "./guards/admin.guard";
import { AdminCreateUserDto, AdminUpdateStatusDto, AssignRoleDto } from "../auth/dto/auth.dto";

@Controller("admin/users")
@UseGuards(AdminGuard)
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get()
  async list(
    @CurrentUser() user: RequestUser,
    @Query("page") page = "1",
    @Query("pageSize") pageSize = "20",
    @Query("search") search?: string,
    @Query("accountStatus") accountStatus?: string,
  ) {
    const result = await this.adminUsersService.listUsers(user, {
      page: Number(page),
      pageSize: Number(pageSize),
      search,
      accountStatus,
    });
    return {
      items: result.items,
      pagination: {
        page: Number(page),
        pageSize: Number(pageSize),
        totalItems: result.totalItems,
        totalPages: Math.ceil(result.totalItems / Number(pageSize)),
      },
    };
  }

  @Get("roles")
  listRoles(@CurrentUser() user: RequestUser) {
    return this.adminUsersService.listRoles(user);
  }

  @Get(":userId")
  getUser(@CurrentUser() user: RequestUser, @Param("userId") userId: string) {
    return this.adminUsersService.getUser(user, userId);
  }

  @Post()
  createUser(
    @CurrentUser() user: RequestUser,
    @Body() dto: AdminCreateUserDto,
    @RequestMeta() ctx: { ipAddress?: string; userAgent?: string },
  ) {
    return this.adminUsersService.createUser(user, dto, ctx.ipAddress, ctx.userAgent);
  }

  @Patch(":userId/status")
  updateStatus(
    @CurrentUser() user: RequestUser,
    @Param("userId") userId: string,
    @Body() dto: AdminUpdateStatusDto,
    @RequestMeta() ctx: { ipAddress?: string; userAgent?: string },
  ) {
    return this.adminUsersService.updateStatus(
      user,
      userId,
      dto,
      ctx.ipAddress,
      ctx.userAgent,
    );
  }

  @Post(":userId/roles")
  assignRole(
    @CurrentUser() user: RequestUser,
    @Param("userId") userId: string,
    @Body() dto: AssignRoleDto,
    @RequestMeta() ctx: { ipAddress?: string; userAgent?: string },
  ) {
    return this.adminUsersService.assignRole(
      user,
      userId,
      dto,
      ctx.ipAddress,
      ctx.userAgent,
    );
  }

  @Delete(":userId/roles/:assignmentId")
  revokeRole(
    @CurrentUser() user: RequestUser,
    @Param("userId") userId: string,
    @Param("assignmentId") assignmentId: string,
    @RequestMeta() ctx: { ipAddress?: string; userAgent?: string },
  ) {
    return this.adminUsersService.revokeRole(
      user,
      userId,
      assignmentId,
      ctx.ipAddress,
      ctx.userAgent,
    );
  }
}
