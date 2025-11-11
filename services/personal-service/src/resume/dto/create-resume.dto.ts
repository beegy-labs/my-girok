import { IsString, IsEmail, IsOptional, IsArray, ValidateNested, IsBoolean, IsInt, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PaperSize {
  A4 = 'A4',
  LETTER = 'LETTER',
}

export enum MilitaryService {
  COMPLETED = 'COMPLETED',
  EXEMPTED = 'EXEMPTED',
  NOT_APPLICABLE = 'NOT_APPLICABLE',
}

export class SkillItemDto {
  @ApiProperty({ example: 'React' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: '3년 실무 경험, React Hooks와 Context API를 활용한 상태 관리' })
  @IsOptional()
  @IsString()
  description?: string;
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
  @IsString()
  endDate?: string;

  @ApiProperty({ example: 'Built modern e-commerce platform using microservices architecture' })
  @IsString()
  description!: string;

  @ApiPropertyOptional({ example: 'Lead Backend Developer' })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiProperty({ type: [CreateProjectAchievementDto], description: 'Hierarchical achievements (4 depth levels)' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProjectAchievementDto)
  achievements!: CreateProjectAchievementDto[];

  @ApiProperty({ example: ['NestJS', 'React', 'PostgreSQL'] })
  @IsArray()
  @IsString({ each: true })
  techStack!: string[];

  @ApiPropertyOptional({ example: 'https://myproject.com' })
  @IsOptional()
  @IsString()
  url?: string;

  @ApiPropertyOptional({ example: 'https://github.com/user/project' })
  @IsOptional()
  @IsString()
  githubUrl?: string;

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
  @IsString()
  endDate?: string;

  @ApiProperty({ example: 'Backend Team Lead' })
  @IsString()
  finalPosition!: string;

  @ApiProperty({ example: 'Senior Developer' })
  @IsString()
  jobTitle!: string;

  @ApiProperty({ type: [CreateExperienceProjectDto], description: 'List of projects at this company' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateExperienceProjectDto)
  projects!: CreateExperienceProjectDto[];

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

export class CreateProjectDto {
  @ApiProperty({ example: 'My-Girok Platform' })
  @IsString()
  name!: string;

  @ApiProperty({ example: '2024-01' })
  @IsString()
  startDate!: string;

  @ApiPropertyOptional({ example: '2024-12' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiProperty({ example: 'Personal productivity platform with microservices' })
  @IsString()
  description!: string;

  @ApiPropertyOptional({ example: 'Full-stack Developer' })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiProperty({ example: ['Built 3 microservices', 'Deployed on Kubernetes'] })
  @IsArray()
  @IsString({ each: true })
  achievements!: string[];

  @ApiProperty({ example: ['NestJS', 'React', 'PostgreSQL'] })
  @IsArray()
  @IsString({ each: true })
  techStack!: string[];

  @ApiPropertyOptional({ example: 'https://mygirok.dev' })
  @IsOptional()
  @IsString()
  url?: string;

  @ApiPropertyOptional({ example: 'https://github.com/user/project' })
  @IsOptional()
  @IsString()
  githubUrl?: string;

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

export class CreateEducationDto {
  @ApiProperty({ example: 'Seoul National University' })
  @IsString()
  school!: string;

  @ApiProperty({ example: 'Computer Science' })
  @IsString()
  major!: string;

  @ApiProperty({ example: 'Bachelor' })
  @IsString()
  degree!: string;

  @ApiProperty({ example: '2015-03' })
  @IsString()
  startDate!: string;

  @ApiPropertyOptional({ example: '2019-02' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ example: '3.8/4.0' })
  @IsOptional()
  @IsString()
  gpa?: string;

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
  @IsString()
  expiryDate?: string;

  @ApiPropertyOptional({ example: 'ABC123XYZ' })
  @IsOptional()
  @IsString()
  credentialId?: string;

  @ApiPropertyOptional({ example: 'https://aws.amazon.com/verify/ABC123' })
  @IsOptional()
  @IsString()
  credentialUrl?: string;

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
  @IsString()
  description?: string;

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
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: '서울특별시 강남구', description: 'Address (City/District level)' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'https://github.com/hong' })
  @IsOptional()
  @IsString()
  github?: string;

  @ApiPropertyOptional({ example: 'https://hong.dev' })
  @IsOptional()
  @IsString()
  blog?: string;

  @ApiPropertyOptional({ example: 'https://linkedin.com/in/hong' })
  @IsOptional()
  @IsString()
  linkedin?: string;

  @ApiPropertyOptional({ example: 'https://portfolio.hong.dev' })
  @IsOptional()
  @IsString()
  portfolio?: string;

  @ApiPropertyOptional({ example: 'Experienced backend developer with 5+ years in microservices' })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/profile.jpg' })
  @IsOptional()
  @IsString()
  profileImage?: string;

  @ApiPropertyOptional({ enum: MilitaryService, description: 'Military service status (Korean-specific)' })
  @IsOptional()
  @IsEnum(MilitaryService)
  militaryService?: MilitaryService;

  @ApiPropertyOptional({ example: '병장 제대, 2020.01 - 2021.10', description: 'Military service details (Korean-specific)' })
  @IsOptional()
  @IsString()
  militaryDischarge?: string;

  @ApiPropertyOptional({ example: '병장', description: 'Military rank (e.g., 병장, 상병)' })
  @IsOptional()
  @IsString()
  militaryRank?: string;

  @ApiPropertyOptional({ example: '만기전역', description: 'Discharge type (e.g., 만기전역, 의병전역)' })
  @IsOptional()
  @IsString()
  militaryDischargeType?: string;

  @ApiPropertyOptional({ example: '2020-01', description: 'Military service start date (YYYY-MM format)' })
  @IsOptional()
  @IsString()
  militaryServiceStartDate?: string;

  @ApiPropertyOptional({ example: '2021-10', description: 'Military service end date (YYYY-MM format)' })
  @IsOptional()
  @IsString()
  militaryServiceEndDate?: string;

  @ApiPropertyOptional({ example: '저는 백엔드 개발자로서...', description: 'Cover letter (Korean-specific)' })
  @IsOptional()
  @IsString()
  coverLetter?: string;

  @ApiPropertyOptional({ example: '입사 후에는 팀의 기술 리더로서...', description: 'Career goals after joining (Korean-specific)' })
  @IsOptional()
  @IsString()
  careerGoals?: string;

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

  @ApiPropertyOptional({ type: [CreateProjectDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProjectDto)
  projects?: CreateProjectDto[];

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
