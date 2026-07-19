import { Module } from "@nestjs/common";
import { ObjectStorageService } from "./object-storage.service";
import { MalwareScannerService } from "./malware-scanner.service";

@Module({
  providers: [ObjectStorageService, MalwareScannerService],
  exports: [ObjectStorageService, MalwareScannerService],
})
export class StorageModule {}
