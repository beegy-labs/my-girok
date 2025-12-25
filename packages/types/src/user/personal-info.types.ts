/**
 * Personal Info Types
 * Central personal information storage types
 */

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
  PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY',
}

export enum AccessorType {
  USER = 'USER',
  ADMIN = 'ADMIN',
  OPERATOR = 'OPERATOR',
  SYSTEM = 'SYSTEM',
}

export enum AccessAction {
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

export interface PersonalInfo {
  id: string;
  userId: string;
  name?: string;
  birthDate?: Date;
  gender?: Gender;
  phoneCountryCode?: string;
  phoneNumber?: string;
  countryCode?: string;
  region?: string;
  city?: string;
  address?: string;
  postalCode?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PersonalInfoAccessLog {
  id: string;
  personalInfoId: string;
  serviceId?: string;
  accessorType: AccessorType;
  accessorId: string;
  action: AccessAction;
  fields: string[];
  ipAddress?: string;
  userAgent?: string;
  accessedAt: Date;
}

export interface CreatePersonalInfoDto {
  name?: string;
  birthDate?: Date;
  gender?: Gender;
  phoneCountryCode?: string;
  phoneNumber?: string;
  countryCode?: string;
  region?: string;
  city?: string;
  address?: string;
  postalCode?: string;
}

export interface UpdatePersonalInfoDto extends Partial<CreatePersonalInfoDto> {}
