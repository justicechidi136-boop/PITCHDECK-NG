import { Controller, Get, Post, Delete, Body, Param } from "@nestjs/common";
import { FilesService } from "./files.service";
import { CurrentUser, type RequestUser } from "../auth/decorators/current-user.decorator";

@Controller("files")
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post("upload-intents")
  createIntent(@CurrentUser() user: RequestUser, @Body() body: Record<string, unknown>) {
    return this.filesService.createUploadIntent(user, body as never);
  }

  @Post(":fileId/complete")
  complete(@CurrentUser() user: RequestUser, @Param("fileId") fileId: string) {
    return this.filesService.completeUpload(user, fileId);
  }

  @Get(":fileId")
  get(@CurrentUser() user: RequestUser, @Param("fileId") fileId: string) {
    return this.filesService.getFile(user, fileId);
  }

  @Get(":fileId/download-url")
  downloadUrl(@CurrentUser() user: RequestUser, @Param("fileId") fileId: string) {
    return this.filesService.getDownloadUrl(user, fileId);
  }

  @Delete(":fileId")
  delete(@CurrentUser() user: RequestUser, @Param("fileId") fileId: string) {
    return this.filesService.deleteFile(user, fileId);
  }
}
