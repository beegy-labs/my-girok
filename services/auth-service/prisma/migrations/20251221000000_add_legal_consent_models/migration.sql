-- CreateEnum
CREATE TYPE "LegalDocumentType" AS ENUM ('TERMS_OF_SERVICE', 'PRIVACY_POLICY', 'MARKETING_POLICY', 'PERSONALIZED_ADS');

-- CreateEnum
CREATE TYPE "ConsentType" AS ENUM ('TERMS_OF_SERVICE', 'PRIVACY_POLICY', 'MARKETING_EMAIL', 'MARKETING_PUSH', 'MARKETING_PUSH_NIGHT', 'MARKETING_SMS', 'PERSONALIZED_ADS', 'THIRD_PARTY_SHARING');

-- AlterTable: Add locale/region fields to users for consent policy
ALTER TABLE "users" ADD COLUMN "region" TEXT;
ALTER TABLE "users" ADD COLUMN "locale" TEXT;
ALTER TABLE "users" ADD COLUMN "timezone" TEXT;

-- CreateTable: LegalDocument
CREATE TABLE "legal_documents" (
    "id" TEXT NOT NULL,
    "type" "LegalDocumentType" NOT NULL,
    "version" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'ko',
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "summary" TEXT,
    "effective_date" TIMESTAMPTZ(6) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "legal_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable: UserConsent
CREATE TABLE "user_consents" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "consent_type" "ConsentType" NOT NULL,
    "document_id" TEXT,
    "document_version" TEXT,
    "agreed" BOOLEAN NOT NULL DEFAULT true,
    "agreed_at" TIMESTAMPTZ(6) NOT NULL,
    "withdrawn_at" TIMESTAMPTZ(6),
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_consents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "legal_documents_type_version_locale_key" ON "legal_documents"("type", "version", "locale");

-- CreateIndex
CREATE INDEX "legal_documents_type_locale_is_active_idx" ON "legal_documents"("type", "locale", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "user_consents_user_id_consent_type_document_version_key" ON "user_consents"("user_id", "consent_type", "document_version");

-- CreateIndex
CREATE INDEX "user_consents_user_id_idx" ON "user_consents"("user_id");

-- CreateIndex
CREATE INDEX "user_consents_consent_type_idx" ON "user_consents"("consent_type");

-- CreateIndex
CREATE INDEX "user_consents_agreed_at_idx" ON "user_consents"("agreed_at");

-- AddForeignKey
ALTER TABLE "user_consents" ADD CONSTRAINT "user_consents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_consents" ADD CONSTRAINT "user_consents_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "legal_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
