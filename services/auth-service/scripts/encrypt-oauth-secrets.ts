#!/usr/bin/env ts-node

/**
 * Data Migration Script: Encrypt OAuth Secrets
 *
 * Purpose:
 * - Encrypts existing plaintext OAuth client secrets in the database
 * - Prevents double encryption by checking if secret is already encrypted
 * - Safe to run multiple times (idempotent)
 *
 * Usage:
 *   npx ts-node scripts/encrypt-oauth-secrets.ts
 *
 * Requirements:
 * - ENCRYPTION_KEY must be set in environment variables
 * - Database connection configured via DATABASE_URL
 */

import { PrismaClient } from '@prisma/client';
import { CryptoService } from '../src/common/crypto/crypto.service';

const prisma = new PrismaClient();
const crypto = new CryptoService();

/**
 * Check if a string is already encrypted (format: iv:authTag:encryptedData)
 */
function isEncrypted(value: string): boolean {
  const parts = value.split(':');
  return parts.length === 3;
}

async function main() {
  console.log('🔐 Starting OAuth secrets encryption migration...\n');

  // Check ENCRYPTION_KEY
  if (!process.env.ENCRYPTION_KEY) {
    console.error('❌ ERROR: ENCRYPTION_KEY not set in environment variables');
    console.error('Generate one with: openssl rand -base64 32');
    process.exit(1);
  }

  console.log('✅ ENCRYPTION_KEY found');
  console.log(`✅ Connected to database\n`);

  try {
    // Fetch all OAuth provider configs
    const configs = await prisma.oAuthProviderConfig.findMany();

    console.log(`📊 Found ${configs.length} OAuth provider configurations\n`);

    let encryptedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const config of configs) {
      const { provider, clientSecret } = config;

      if (!clientSecret) {
        console.log(`⏭️  ${provider}: No client secret to encrypt (skipped)`);
        skippedCount++;
        continue;
      }

      // Check if already encrypted
      if (isEncrypted(clientSecret)) {
        console.log(`✓  ${provider}: Already encrypted (skipped)`);
        skippedCount++;
        continue;
      }

      try {
        // Encrypt the plaintext secret
        const encryptedSecret = crypto.encrypt(clientSecret);

        // Update in database
        await prisma.oAuthProviderConfig.update({
          where: { provider },
          data: { clientSecret: encryptedSecret },
        });

        console.log(`🔒 ${provider}: Successfully encrypted`);
        encryptedCount++;
      } catch (error) {
        console.error(`❌ ${provider}: Encryption failed -`, error);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📈 Migration Summary:');
    console.log(`   • Encrypted: ${encryptedCount}`);
    console.log(`   • Skipped:   ${skippedCount}`);
    console.log(`   • Errors:    ${errorCount}`);
    console.log('='.repeat(60));

    if (errorCount > 0) {
      console.error('\n⚠️  Some secrets failed to encrypt. Check logs above.');
      process.exit(1);
    } else if (encryptedCount === 0) {
      console.log('\n✅ No secrets needed encryption. Database is up to date.');
    } else {
      console.log('\n✅ Migration completed successfully!');
    }
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
