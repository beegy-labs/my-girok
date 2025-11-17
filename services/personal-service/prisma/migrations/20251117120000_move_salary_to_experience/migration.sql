-- Move salary fields from Resume to Experience

-- Add salary fields to experiences table
ALTER TABLE "experiences" ADD COLUMN "salary" INTEGER;
ALTER TABLE "experiences" ADD COLUMN "salary_unit" TEXT;
ALTER TABLE "experiences" ADD COLUMN "show_salary" BOOLEAN DEFAULT false;

-- Remove salary fields from resumes table
ALTER TABLE "resumes" DROP COLUMN IF EXISTS "final_salary";
ALTER TABLE "resumes" DROP COLUMN IF EXISTS "salary_unit";
ALTER TABLE "resumes" DROP COLUMN IF EXISTS "show_salary";
