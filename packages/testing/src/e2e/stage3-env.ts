/** Shared Playwright API env for object storage and ClamAV-backed E2E runs. */
export const stage3StorageEnv = {
  OBJECT_STORAGE_ENDPOINT:
    process.env.OBJECT_STORAGE_ENDPOINT ?? "http://localhost:19000",
  OBJECT_STORAGE_INTERNAL_ENDPOINT:
    process.env.OBJECT_STORAGE_INTERNAL_ENDPOINT ?? "http://localhost:19000",
  OBJECT_STORAGE_ACCESS_KEY:
    process.env.OBJECT_STORAGE_ACCESS_KEY ?? "pitchdeck_minio",
  OBJECT_STORAGE_SECRET_KEY:
    process.env.OBJECT_STORAGE_SECRET_KEY ?? "pitchdeck_minio_dev",
  OBJECT_STORAGE_BUCKET: process.env.OBJECT_STORAGE_BUCKET ?? "pitchdeck-uploads",
  OBJECT_STORAGE_FORCE_PATH_STYLE: "true",
  FILE_SCAN_MODE: process.env.FILE_SCAN_MODE ?? "clamav",
  CLAMAV_HOST: process.env.CLAMAV_HOST ?? "localhost",
  CLAMAV_PORT: process.env.CLAMAV_PORT ?? "3310",
  FILE_SCAN_TIMEOUT_SECONDS: process.env.FILE_SCAN_TIMEOUT_SECONDS ?? "120",
} as const;
