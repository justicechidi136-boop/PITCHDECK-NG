import { Controller, Get, Post, Delete, Body, Param, ParseUUIDPipe } from "@nestjs/common";
import { uploadIntentSchema } from "@pitchdeck/contracts";
import { FilesService } from "./files.service";
import { CurrentUser, type RequestUser } from "../auth/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";

@Controller("files")
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post("upload-intents")
  createIntent(@CurrentUser() user: RequestUser, @Body(new ZodValidationPipe(uploadIntentSchema)) body: never) {
    return this.filesService.createUploadIntent(user, body);
  }

  @Post(":fileId/complete")
  complete(@CurrentUser() user: RequestUser, @Param("fileId", ParseUUIDPipe) fileId: string) {
    return this.filesService.completeUpload(user, fileId);
  }

  @Get(":fileId")
  get(@CurrentUser() user: RequestUser, @Param("fileId", ParseUUIDPipe) fileId: string) {
    return this.filesService.getFile(user, fileId);
  }

  @Get(":fileId/download-url")
  downloadUrl(@CurrentUser() user: RequestUser, @Param("fileId", ParseUUIDPipe) fileId: string) {
    return this.filesService.getDownloadUrl(user, fileId);
  }

  @Delete(":fileId")
  delete(@CurrentUser() user: RequestUser, @Param("fileId", ParseUUIDPipe) fileId: string) {
    return this.filesService.deleteFile(user, fileId);
  }
}
