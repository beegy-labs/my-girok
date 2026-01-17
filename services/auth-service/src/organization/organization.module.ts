import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';

// Services
import { JobGradeService } from './services/job-grade.service';
import { OrgUnitService } from './services/org-unit.service';
import { LegalEntityService } from './services/legal-entity.service';
import { OfficeService } from './services/office.service';
import { BuildingService } from './services/building.service';
import { FloorService } from './services/floor.service';
import { PartnerCompanyService } from './services/partner-company.service';

// Controllers
import { JobGradeController } from './controllers/job-grade.controller';
import { OrgUnitController } from './controllers/org-unit.controller';
import { LegalEntityController } from './controllers/legal-entity.controller';
import { OfficeController } from './controllers/office.controller';
import { BuildingController } from './controllers/building.controller';
import { FloorController } from './controllers/floor.controller';
import { PartnerCompanyController } from './controllers/partner-company.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [
    JobGradeController,
    OrgUnitController,
    LegalEntityController,
    OfficeController,
    BuildingController,
    FloorController,
    PartnerCompanyController,
  ],
  providers: [
    JobGradeService,
    OrgUnitService,
    LegalEntityService,
    OfficeService,
    BuildingService,
    FloorService,
    PartnerCompanyService,
  ],
  exports: [
    JobGradeService,
    OrgUnitService,
    LegalEntityService,
    OfficeService,
    BuildingService,
    FloorService,
    PartnerCompanyService,
  ],
})
export class OrganizationModule {}
