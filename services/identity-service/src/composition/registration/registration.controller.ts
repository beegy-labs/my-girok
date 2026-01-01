import { Controller, Post, Body, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiHeader } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { Idempotent, IDEMPOTENCY_KEY_HEADER } from '../../common/interceptors';
import { RegistrationService } from './registration.service';
import { RegisterUserDto, RegistrationResponseDto } from './dto/registration.dto';

@ApiTags('Registration')
@Controller('registration')
export class RegistrationController {
  constructor(private readonly registrationService: RegistrationService) {}

  @Post()
  @Public() // Explicitly mark as public for new user registration
  @Idempotent() // Support idempotent registration requests
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 86400000 } }) // 5 per day per IP
  @ApiOperation({
    summary: 'Register a new user',
    description: `
      Creates a new user account with profile and records consents.
      Uses saga pattern for distributed transaction with automatic rollback on failure.

      **Idempotency**: Send \`Idempotency-Key\` header (UUID format) to prevent duplicate registrations.
      If the same key is sent again, the original response will be returned.

      Required consents vary by country:
      - KR (PIPA): TERMS_OF_SERVICE, PRIVACY_POLICY
      - EU (GDPR): TERMS_OF_SERVICE, PRIVACY_POLICY
      - JP (APPI): TERMS_OF_SERVICE, PRIVACY_POLICY, CROSS_BORDER_TRANSFER
      - US (CCPA): TERMS_OF_SERVICE, PRIVACY_POLICY
    `,
  })
  @ApiHeader({
    name: IDEMPOTENCY_KEY_HEADER,
    description: 'Unique key to prevent duplicate requests (UUID format)',
    required: false,
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({ type: RegisterUserDto })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
    type: RegistrationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or missing required consents',
  })
  @ApiResponse({
    status: 409,
    description: 'Email already registered or idempotency key conflict',
  })
  async register(
    @Body() dto: RegisterUserDto,
    @Req() req: Request,
  ): Promise<RegistrationResponseDto> {
    const ipAddress = req.ip || req.socket?.remoteAddress;
    const userAgent = req.headers['user-agent'];

    return this.registrationService.register(dto, ipAddress, userAgent);
  }
}
