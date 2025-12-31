import { Module } from '@nestjs/common';
import { AccountsModule } from './accounts/accounts.module';
import { SessionsModule } from './sessions/sessions.module';
import { DevicesModule } from './devices/devices.module';
import { ProfilesModule } from './profiles/profiles.module';

/**
 * Identity Module
 *
 * Aggregates all identity-related submodules:
 * - Accounts: User account management
 * - Sessions: Session lifecycle management
 * - Devices: Device registration and trust
 * - Profiles: User profile information
 */
@Module({
  imports: [AccountsModule, SessionsModule, DevicesModule, ProfilesModule],
  exports: [AccountsModule, SessionsModule, DevicesModule, ProfilesModule],
})
export class IdentityModule {}
