-- CreateEnum
CREATE TYPE "CopyStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'PARTIAL', 'FAILED');

-- AlterTable
ALTER TABLE "resumes" ADD COLUMN "copy_status" "CopyStatus";
ALTER TABLE "resumes" ADD COLUMN "copy_job_id" TEXT;
ALTER TABLE "resumes" ADD COLUMN "copy_completed_at" TIMESTAMPTZ(6);
