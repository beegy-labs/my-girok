-- AlterTable
ALTER TABLE "resumes" ADD COLUMN "final_salary" INTEGER,
ADD COLUMN "salary_unit" TEXT,
ADD COLUMN "show_salary" BOOLEAN DEFAULT false;
