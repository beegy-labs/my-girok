import { IsString, IsEmail, IsOptional, IsArray, ValidateNested, IsBoolean, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSkillDto {
  @ApiProperty({ example: 'Frontend' })
  @IsString()
  category!: string;

  @ApiProperty({ example: ['React', 'TypeScript', 'Next.js'] })
  @IsArray()
  @IsString({ each: true })
  items!: string[];

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

export class CreateExperienceTaskDto {
  @ApiProperty({ example: 'Implemented microservices architecture' })
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

  @ApiPropertyOptional({ type: [CreateExperienceTaskDto], description: 'Child tasks (recursive structure)' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateExperienceTaskDto)
  children?: CreateExperienceTaskDto[];
}

export class CreateExperienceRoleDto {
  @ApiProperty({ example: 'Backend Development Lead' })
  @IsString()
  title!: string;

  @ApiPropertyOptional({ example: 'Senior Developer' })
  @IsOptional()
  @IsString()
  position?: string;

  @ApiPropertyOptional({ example: 'Led backend team and managed microservices architecture' })
  @IsOptional()
  @IsString()
  responsibilities?: string;

  @ApiProperty({ type: [CreateExperienceTaskDto], description: 'Hierarchical task tree for this role' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateExperienceTaskDto)
  tasks!: CreateExperienceTaskDto[];

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

  @ApiProperty({ type: [CreateExperienceRoleDto], description: 'List of roles/positions at this company (unlimited)' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateExperienceRoleDto)
  roles!: CreateExperienceRoleDto[];

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
