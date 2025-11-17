-- Add key_achievements field to resumes table

ALTER TABLE "resumes" ADD COLUMN "key_achievements" TEXT[] DEFAULT '{}';
