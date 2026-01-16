import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { OrgUnitService } from './org-unit.service';
import { PrismaService } from '../../database/prisma.service';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { OrgUnitType } from '../dto/org-unit.dto';

describe('OrgUnitService', () => {
  let service: OrgUnitService;
  let prisma: PrismaService;

  const mockPrismaService = {
    organizationUnit: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };

  const mockOrgUnit = {
    id: '01936c5e-7b8a-7890-abcd-ef1234567890',
    code: 'ENG',
    name: 'Engineering',
    org_type: OrgUnitType.DEPARTMENT,
    parent_id: null,
    manager_admin_id: '01936c5e-7b8a-7890-abcd-ef1234567891',
    description: 'Engineering department',
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrgUnitService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<OrgUnitService>(OrgUnitService);
    prisma = module.get<PrismaService>(PrismaService);

    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an organization unit successfully', async () => {
      const dto = {
        code: 'ENG',
        name: 'Engineering',
        orgType: OrgUnitType.DEPARTMENT,
        description: 'Engineering department',
      };

      mockPrismaService.organizationUnit.findUnique.mockResolvedValue(null);
      mockPrismaService.organizationUnit.create.mockResolvedValue(mockOrgUnit);

      const result = await service.create(dto);

      expect(result.code).toBe(dto.code);
      expect(result.name).toBe(dto.name);
      expect(mockPrismaService.organizationUnit.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if code already exists', async () => {
      const dto = {
        code: 'ENG',
        name: 'Engineering',
        orgType: OrgUnitType.DEPARTMENT,
      };

      mockPrismaService.organizationUnit.findUnique.mockResolvedValue(mockOrgUnit);

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      expect(mockPrismaService.organizationUnit.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if parent does not exist', async () => {
      const dto = {
        code: 'BACKEND',
        name: 'Backend Team',
        orgType: OrgUnitType.TEAM,
        parentId: 'non-existent-id',
      };

      mockPrismaService.organizationUnit.findUnique
        .mockResolvedValueOnce(null) // code check
        .mockResolvedValueOnce(null); // parent check

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.organizationUnit.create).not.toHaveBeenCalled();
    });

    it('should create with parent successfully', async () => {
      const parentOrgUnit = { ...mockOrgUnit, id: 'parent-id' };
      const dto = {
        code: 'BACKEND',
        name: 'Backend Team',
        orgType: OrgUnitType.TEAM,
        parentId: 'parent-id',
      };

      const createdOrgUnit = {
        ...mockOrgUnit,
        code: 'BACKEND',
        name: 'Backend Team',
        org_type: OrgUnitType.TEAM,
        parent_id: 'parent-id',
      };

      mockPrismaService.organizationUnit.findUnique
        .mockResolvedValueOnce(null) // code check
        .mockResolvedValueOnce(parentOrgUnit); // parent check
      mockPrismaService.organizationUnit.create.mockResolvedValue(createdOrgUnit);

      const result = await service.create(dto);

      expect(result.code).toBe(dto.code);
      expect(result.parentId).toBe(dto.parentId);
    });
  });

  describe('findAll', () => {
    it('should return all organization units', async () => {
      const mockOrgUnits = [mockOrgUnit];
      mockPrismaService.organizationUnit.findMany.mockResolvedValue(mockOrgUnits);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0].code).toBe('ENG');
      expect(mockPrismaService.organizationUnit.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: [{ name: 'asc' }],
      });
    });

    it('should filter by org type', async () => {
      const mockOrgUnits = [mockOrgUnit];
      mockPrismaService.organizationUnit.findMany.mockResolvedValue(mockOrgUnits);

      const result = await service.findAll({
        orgType: OrgUnitType.DEPARTMENT,
      });

      expect(result).toHaveLength(1);
      expect(mockPrismaService.organizationUnit.findMany).toHaveBeenCalledWith({
        where: { org_type: OrgUnitType.DEPARTMENT },
        orderBy: [{ name: 'asc' }],
      });
    });
  });

  describe('findTree', () => {
    it('should build organization tree structure', async () => {
      const rootOrgUnit = {
        ...mockOrgUnit,
        id: 'root-id',
        parent_id: null,
      };

      const childOrgUnit = {
        ...mockOrgUnit,
        id: 'child-id',
        code: 'BACKEND',
        name: 'Backend Team',
        org_type: OrgUnitType.TEAM,
        parent_id: 'root-id',
      };

      mockPrismaService.organizationUnit.findMany.mockResolvedValue([rootOrgUnit, childOrgUnit]);

      const result = await service.findTree();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('root-id');
      expect(result[0].children).toHaveLength(1);
      expect(result[0].children[0].id).toBe('child-id');
    });
  });

  describe('findOne', () => {
    it('should return an organization unit by ID', async () => {
      mockPrismaService.organizationUnit.findUnique.mockResolvedValue(mockOrgUnit);

      const result = await service.findOne(mockOrgUnit.id);

      expect(result.id).toBe(mockOrgUnit.id);
      expect(result.code).toBe('ENG');
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrismaService.organizationUnit.findUnique.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findChildren', () => {
    it('should return children of an organization unit', async () => {
      const childOrgUnit = {
        ...mockOrgUnit,
        id: 'child-id',
        parent_id: mockOrgUnit.id,
      };

      mockPrismaService.organizationUnit.findUnique.mockResolvedValue(mockOrgUnit);
      mockPrismaService.organizationUnit.findMany.mockResolvedValue([childOrgUnit]);

      const result = await service.findChildren(mockOrgUnit.id);

      expect(result).toHaveLength(1);
      expect(result[0].parentId).toBe(mockOrgUnit.id);
    });

    it('should throw NotFoundException if parent not found', async () => {
      mockPrismaService.organizationUnit.findUnique.mockResolvedValue(null);

      await expect(service.findChildren('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update an organization unit successfully', async () => {
      const updateDto = {
        name: 'Engineering Division',
        description: 'Updated description',
      };

      const updatedOrgUnit = {
        ...mockOrgUnit,
        ...updateDto,
      };

      mockPrismaService.organizationUnit.findUnique.mockResolvedValue(mockOrgUnit);
      mockPrismaService.organizationUnit.update.mockResolvedValue(updatedOrgUnit);

      const result = await service.update(mockOrgUnit.id, updateDto);

      expect(result.name).toBe(updateDto.name);
      expect(result.description).toBe(updateDto.description);
    });

    it('should throw BadRequestException if trying to set self as parent', async () => {
      const updateDto = {
        parentId: mockOrgUnit.id,
      };

      mockPrismaService.organizationUnit.findUnique.mockResolvedValue(mockOrgUnit);

      await expect(service.update(mockOrgUnit.id, updateDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if circular reference is detected', async () => {
      // Setup: A -> B -> C
      // Attempt: Make A's parent = C (would create cycle: A -> B -> C -> A)
      const orgUnitA = {
        id: 'unit-a',
        code: 'A',
        name: 'Unit A',
        org_type: 'DEPARTMENT',
        parent_id: null,
        is_active: true,
      };

      const orgUnitB = {
        id: 'unit-b',
        code: 'B',
        name: 'Unit B',
        org_type: 'TEAM',
        parent_id: 'unit-a',
        is_active: true,
      };

      const orgUnitC = {
        id: 'unit-c',
        code: 'C',
        name: 'Unit C',
        org_type: 'SQUAD',
        parent_id: 'unit-b',
        is_active: true,
      };

      const updateDto = {
        parentId: 'unit-c', // Try to set C as parent of A
      };

      // Mock sequence:
      // 1. findOne(A) -> orgUnitA
      // 2. findUnique(C) -> orgUnitC (parent exists check)
      // 3. checkCircularReference starts:
      //    - findUnique(C) -> { parent_id: 'unit-b' }
      //    - findUnique(B) -> { parent_id: 'unit-a' }
      //    - Detects circular reference when it finds 'unit-a' in the chain
      mockPrismaService.organizationUnit.findUnique
        .mockResolvedValueOnce(orgUnitA) // findOne check
        .mockResolvedValueOnce(orgUnitC) // parent exists check
        .mockResolvedValueOnce({ parent_id: 'unit-b' }) // circular check: C's parent
        .mockResolvedValueOnce({ parent_id: 'unit-a' }); // circular check: B's parent -> detects A

      await expect(service.update('unit-a', updateDto)).rejects.toThrow(
        /Circular reference detected/,
      );
    });

    it('should allow valid parent update without circular reference', async () => {
      // Setup: A -> B, C (no relation)
      // Attempt: Make B's parent = C (valid)
      const orgUnitB = {
        id: 'unit-b',
        code: 'B',
        name: 'Unit B',
        org_type: 'TEAM',
        parent_id: 'unit-a',
        is_active: true,
      };

      const orgUnitC = {
        id: 'unit-c',
        code: 'C',
        name: 'Unit C',
        org_type: 'DEPARTMENT',
        parent_id: null,
        is_active: true,
      };

      const updateDto = {
        parentId: 'unit-c',
      };

      const updatedOrgUnit = {
        ...orgUnitB,
        parent_id: 'unit-c',
      };

      mockPrismaService.organizationUnit.findUnique
        .mockResolvedValueOnce(orgUnitB) // findOne check
        .mockResolvedValueOnce(orgUnitC) // parent exists check
        .mockResolvedValueOnce({ id: 'unit-c', parent_id: null }); // circular check: C has no parent
      mockPrismaService.organizationUnit.update.mockResolvedValue(updatedOrgUnit);

      const result = await service.update('unit-b', updateDto);

      expect(result.parentId).toBe('unit-c');
      expect(mockPrismaService.organizationUnit.update).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete an organization unit successfully', async () => {
      mockPrismaService.organizationUnit.findUnique.mockResolvedValue(mockOrgUnit);
      mockPrismaService.organizationUnit.findMany.mockResolvedValue([]);
      mockPrismaService.organizationUnit.delete.mockResolvedValue(mockOrgUnit);

      await service.remove(mockOrgUnit.id);

      expect(mockPrismaService.organizationUnit.delete).toHaveBeenCalledWith({
        where: { id: mockOrgUnit.id },
      });
    });

    it('should throw BadRequestException if org unit has children', async () => {
      const childOrgUnit = {
        ...mockOrgUnit,
        id: 'child-id',
        parent_id: mockOrgUnit.id,
      };

      mockPrismaService.organizationUnit.findUnique.mockResolvedValue(mockOrgUnit);
      mockPrismaService.organizationUnit.findMany.mockResolvedValue([childOrgUnit]);

      await expect(service.remove(mockOrgUnit.id)).rejects.toThrow(BadRequestException);
      expect(mockPrismaService.organizationUnit.delete).not.toHaveBeenCalled();
    });
  });
});
