import { IsString, IsEmail, IsOptional, IsArray, ValidateNested, IsBoolean, IsInt, Min, IsEnum, IsDateString, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PaperSize {
  A4 = 'A4',
  LETTER = 'LETTER',
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

export enum MilitaryService {
  COMPLETED = 'COMPLETED',
  EXEMPTED = 'EXEMPTED',
  NOT_APPLICABLE = 'NOT_APPLICABLE',
}

export enum DegreeType {
  HIGH_SCHOOL = 'HIGH_SCHOOL',
  ASSOCIATE_2 = 'ASSOCIATE_2',
  ASSOCIATE_3 = 'ASSOCIATE_3',
  BACHELOR = 'BACHELOR',
  MASTER = 'MASTER',
  DOCTORATE = 'DOCTORATE',
}

export enum GpaFormat {
  SCALE_4_0 = 'SCALE_4_0',   // 4.0 scale (US: 3.8/4.0)
  SCALE_4_5 = 'SCALE_4_5',   // 4.5 scale (KR: 4.2/4.5)
  SCALE_100 = 'SCALE_100',   // 100-point scale (JP: 85/100)
}

export class SkillDescriptionDto {
  @ApiProperty({ example: 'React Hooks와 Context API를 활용한 전역 상태 관리' })
  @IsString()
  content!: string;

  @ApiProperty({ example: 1, description: 'Indentation depth (1-4)' })
  @IsInt()
  @Min(1)
  depth!: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @ApiPropertyOptional({ type: [SkillDescriptionDto], description: 'Child descriptions (recursive structure)' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SkillDescriptionDto)
  children?: SkillDescriptionDto[];
}

export class SkillItemDto {
  @ApiProperty({ example: 'React' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: '3년 실무 경험, React Hooks와 Context API를 활용한 상태 관리' })
  @IsOptional()
  @IsString()
  description?: string; // Legacy: 단순 텍스트 (backward compatibility)

  @ApiPropertyOptional({
    example: [
      { content: 'React Hooks와 Context API를 활용한 전역 상태 관리', depth: 1, order: 0, children: [] }
    ],
    type: [SkillDescriptionDto],
    description: 'Hierarchical descriptions (4 depth levels)'
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SkillDescriptionDto)
  descriptions?: SkillDescriptionDto[]; // 활용 경험/세부 설명 (hierarchical)
}

export class CreateSkillDto {
  @ApiProperty({ example: 'Frontend' })
  @IsString()
  category!: string;

  @ApiProperty({
    example: [
      { name: 'React', description: '3년 실무 경험' },
      { name: 'TypeScript', description: '2년 실무 경험' }
    ],
    type: [SkillItemDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SkillItemDto)
  items!: SkillItemDto[];

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  visible?: boolean;
}

export class CreateProjectAchievementDto {
  @ApiProperty({ example: 'Improved API response time by 40%' })
  @IsString()
  content!: string;

  @ApiProperty({ example: 1, description: 'Indentation depth (1-4)' })
  @IsInt()
  @Min(1)
  depth!: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @ApiPropertyOptional({ type: [CreateProjectAchievementDto], description: 'Child achievements (recursive structure)' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProjectAchievementDto)
  children?: CreateProjectAchievementDto[];
}

export class CreateExperienceProjectDto {
  @ApiProperty({ example: 'E-Commerce Platform Rebuild' })
  @IsString()
  name!: string;

  @ApiProperty({ example: '2023-01' })
  @IsString()
  startDate!: string;

  @ApiPropertyOptional({ example: '2023-12' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  endDate?: string | null;

  @ApiProperty({ example: 'Built modern e-commerce platform using microservices architecture' })
  @IsString()
  description!: string;

  @ApiPropertyOptional({ example: 'Lead Backend Developer' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  role?: string | null;

  @ApiPropertyOptional({ type: [CreateProjectAchievementDto], description: 'Hierarchical achievements (4 depth levels)' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProjectAchievementDto)
  achievements?: CreateProjectAchievementDto[];

  @ApiProperty({ example: ['NestJS', 'React', 'PostgreSQL'] })
  @IsArray()
  @IsString({ each: true })
  techStack!: string[];

  @ApiPropertyOptional({ example: 'https://myproject.com' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  url?: string | null;

  @ApiPropertyOptional({ example: 'https://github.com/user/project' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  githubUrl?: string | null;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

export class CreateExperienceDto {
  @ApiProperty({ example: 'Beegy Inc.' })
  @IsString()
  company!: string;

  @ApiProperty({ example: '2023-01' })
  @IsString()
  startDate!: string;

  @ApiPropertyOptional({ example: '2024-12' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  endDate?: string | null;

  @ApiPropertyOptional({ default: false, description: 'Currently working at this company' })
  @IsOptional()
  @IsBoolean()
  isCurrentlyWorking?: boolean;

  @ApiProperty({ example: 'Backend Team Lead' })
  @IsString()
  finalPosition!: string;

  @ApiProperty({ example: 'Senior Developer' })
  @IsString()
  jobTitle!: string;

  @ApiPropertyOptional({ example: 5000, description: 'Salary amount at this company' })
  @IsOptional()
  @IsInt()
  @Min(0)
  salary?: number;

  @ApiPropertyOptional({ example: '만원', description: 'Salary unit (e.g., "만원", "USD", "EUR", "JPY")' })
  @IsOptional()
  @IsString()
  salaryUnit?: string;

  @ApiPropertyOptional({ default: false, description: 'Show salary in preview' })
  @IsOptional()
  @IsBoolean()
  showSalary?: boolean;

  @ApiPropertyOptional({ type: [CreateExperienceProjectDto], description: 'List of projects at this company' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateExperienceProjectDto)
  projects?: CreateExperienceProjectDto[];

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  visible?: boolean;
}

// NOTE: CreateProjectDto was removed. Projects are now only handled as ExperienceProject within Experience.
// See CreateExperienceProjectDto above for the current structure.

export class CreateEducationDto {
  @ApiProperty({ example: 'Seoul National University' })
  @IsString()
  school!: string;

  @ApiProperty({ example: 'Computer Science' })
  @IsString()
  major!: string;

  @ApiPropertyOptional({ enum: DegreeType, example: DegreeType.BACHELOR })
  @IsOptional()
  @IsEnum(DegreeType)
  degree?: DegreeType;

  @ApiProperty({ example: '2015-03' })
  @IsString()
  startDate!: string;

  @ApiPropertyOptional({ example: '2019-02' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  endDate?: string | null;

  @ApiPropertyOptional({ example: '3.8/4.0' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  gpa?: string | null;

  @ApiPropertyOptional({ enum: GpaFormat, example: GpaFormat.SCALE_4_0 })
  @IsOptional()
  @IsEnum(GpaFormat)
  gpaFormat?: GpaFormat;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  visible?: boolean;
}

export class CreateCertificateDto {
  @ApiProperty({ example: 'AWS Certified Solutions Architect' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'Amazon Web Services' })
  @IsString()
  issuer!: string;

  @ApiProperty({ example: '2023-06' })
  @IsString()
  issueDate!: string;

  @ApiPropertyOptional({ example: '2026-06' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  expiryDate?: string | null;

  @ApiPropertyOptional({ example: 'ABC123XYZ' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  credentialId?: string | null;

  @ApiPropertyOptional({ example: 'https://aws.amazon.com/verify/ABC123' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  credentialUrl?: string | null;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  visible?: boolean;
}

export class CreateResumeDto {
  @ApiProperty({ example: '대기업용 이력서', description: 'Resume title (e.g., "대기업용", "스타트업용")' })
  @IsString()
  title!: string;

  @ApiPropertyOptional({ example: '네이버, 카카오 지원용 이력서', description: 'Brief description of resume purpose' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({ default: false, description: 'Set as default resume' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ enum: PaperSize, default: PaperSize.A4, description: 'Preferred paper size for PDF export' })
  @IsOptional()
  @IsEnum(PaperSize)
  paperSize?: PaperSize;

  @ApiProperty({ example: 'Hong Gildong' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'hong@example.com' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ example: '010-1234-5678' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  phone?: string | null;

  @ApiPropertyOptional({ example: '서울특별시 강남구', description: 'Address (City/District level)' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  address?: string | null;

  @ApiPropertyOptional({ example: 'https://github.com/hong' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  github?: string | null;

  @ApiPropertyOptional({ example: 'https://hong.dev' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  blog?: string | null;

  @ApiPropertyOptional({ example: 'https://linkedin.com/in/hong' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  linkedin?: string | null;

  @ApiPropertyOptional({ example: 'https://portfolio.hong.dev' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  portfolio?: string | null;

  @ApiPropertyOptional({ example: 'Experienced backend developer with 5+ years in microservices' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  summary?: string | null;

  @ApiPropertyOptional({
    example: ['API 응답 속도 40% 개선 (평균 500ms → 300ms)', 'MAU 200만 달성, 전월 대비 30% 성장'],
    description: 'Key achievements (3-5 major accomplishments)'
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keyAchievements?: string[];

  @ApiPropertyOptional({ example: 'https://cdn.example.com/profile.jpg' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  profileImage?: string | null;

  @ApiPropertyOptional({
    example: 'tmp/user123/abc-def-ghi.jpg',
    description: 'Temporary file key from temp-upload endpoint. File will be moved to permanent storage on save.'
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  profileImageTempKey?: string | null;

  @ApiPropertyOptional({ example: 1994, description: 'Birth year (e.g., 1994) - deprecated, use birthDate' })
  @IsOptional()
  @IsInt()
  @Min(1900)
  birthYear?: number;

  @ApiPropertyOptional({ example: '1994-03-15', description: 'Birth date (YYYY-MM-DD format) for accurate age calculation' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsDateString()
  birthDate?: string | null;

  @ApiPropertyOptional({ enum: Gender, description: 'Gender (MALE, FEMALE, OTHER)' })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({ enum: MilitaryService, description: 'Military service status (Korean-specific)' })
  @IsOptional()
  @IsEnum(MilitaryService)
  militaryService?: MilitaryService;

  @ApiPropertyOptional({ example: '병장 제대, 2020.01 - 2021.10', description: 'Military service details (Korean-specific)' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  militaryDischarge?: string | null;

  @ApiPropertyOptional({ example: '병장', description: 'Military rank (e.g., 병장, 상병)' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  militaryRank?: string | null;

  @ApiPropertyOptional({ example: '만기전역', description: 'Discharge type (e.g., 만기전역, 의병전역)' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  militaryDischargeType?: string | null;

  @ApiPropertyOptional({ example: '2020-01', description: 'Military service start date (YYYY-MM format)' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  militaryServiceStartDate?: string | null;

  @ApiPropertyOptional({ example: '2021-10', description: 'Military service end date (YYYY-MM format)' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  militaryServiceEndDate?: string | null;

  @ApiPropertyOptional({ example: '저는 백엔드 개발자로서...', description: 'Cover letter (Korean-specific)' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  coverLetter?: string | null;

  @ApiPropertyOptional({ example: '귀사의 비전과 저의 기술 역량이 잘 맞을 것으로 판단하여 지원하게 되었습니다...', description: 'Application reason (Korean-specific)' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  applicationReason?: string | null;

  @ApiPropertyOptional({ type: [CreateSkillDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSkillDto)
  skills?: CreateSkillDto[];

  @ApiPropertyOptional({ type: [CreateExperienceDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateExperienceDto)
  experiences?: CreateExperienceDto[];

  // NOTE: projects field removed - projects are now only handled as nested ExperienceProject within experiences

  @ApiPropertyOptional({ type: [CreateEducationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateEducationDto)
  educations?: CreateEducationDto[];

  @ApiPropertyOptional({ type: [CreateCertificateDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCertificateDto)
  certificates?: CreateCertificateDto[];
}
