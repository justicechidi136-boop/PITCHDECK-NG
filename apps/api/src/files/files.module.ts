import { Module } from "@nestjs/common";
import { FilesController } from "./files.controller";
import { FilesService } from "./files.service";
import { AuthModule } from "../auth/auth.module";
import { StorageModule } from "../storage/storage.module";
import { Stage3Module } from "../stage3/stage3.module";

@Module({
  imports: [AuthModule, StorageModule, Stage3Module],
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}
