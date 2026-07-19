-- AlterTable: registration profile fields on users
ALTER TABLE "users" ADD COLUMN "state_id" UUID;
ALTER TABLE "users" ADD COLUMN "terms_accepted_at" TIMESTAMPTZ(6);

CREATE INDEX "users_state_id_idx" ON "users"("state_id");

ALTER TABLE "users" ADD CONSTRAINT "users_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "states"("id") ON DELETE SET NULL ON UPDATE CASCADE;
