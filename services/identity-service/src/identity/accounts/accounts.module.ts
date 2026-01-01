import { Module } from '@nestjs/common';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';
import { ACCOUNTS_SERVICE } from '../../common/interfaces';

@Module({
  controllers: [AccountsController],
  providers: [
    AccountsService,
    // Provide via token for interface-based DI (enables future gRPC extraction)
    {
      provide: ACCOUNTS_SERVICE,
      useExisting: AccountsService,
    },
  ],
  exports: [AccountsService, ACCOUNTS_SERVICE],
})
export class AccountsModule {}
