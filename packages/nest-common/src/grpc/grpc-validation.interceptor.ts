/**
 * gRPC Validation Interceptor
 *
 * Provides request validation for gRPC endpoints using class-validator.
 * Ensures all incoming requests meet validation requirements before
 * reaching the handler.
 *
 * @example
 * ```typescript
 * @Controller()
 * export class IdentityGrpcController {
 *   @GrpcMethod('IdentityService', 'CreateAccount')
 *   @UseInterceptors(GrpcValidationInterceptor)
 *   async createAccount(@GrpcRequest() request: CreateAccountRequest) {
 *     // Request is already validated
 *   }
 * }
 * ```
 */

import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { RpcException } from '@nestjs/microservices';
import { validate, ValidationError } from 'class-validator';
import { plainToInstance, ClassConstructor } from 'class-transformer';

/**
 * Validation error details
 */
export interface ValidationErrorDetail {
  field: string;
  constraints: Record<string, string>;
  value?: unknown;
  children?: ValidationErrorDetail[];
}

/**
 * Format validation errors into a structured format
 */
function formatValidationErrors(errors: ValidationError[]): ValidationErrorDetail[] {
  return errors.map((error) => ({
    field: error.property,
    constraints: error.constraints ?? {},
    value: error.value,
    children: error.children?.length ? formatValidationErrors(error.children) : undefined,
  }));
}

/**
 * Create a gRPC validation error
 */
function createValidationError(errors: ValidationErrorDetail[]): RpcException {
  const message = errors
    .map((e) => {
      const constraints = Object.values(e.constraints).join(', ');
      return `${e.field}: ${constraints}`;
    })
    .join('; ');

  return new RpcException({
    code: GrpcStatus.INVALID_ARGUMENT,
    message: `Validation failed: ${message}`,
    details: JSON.stringify({ validationErrors: errors }),
  });
}

/**
 * Options for validation
 */
export interface GrpcValidationOptions {
  /** Skip validation for these methods */
  skipMethods?: string[];
  /** Transform plain objects to class instances */
  transform?: boolean;
  /** Enable whitelist mode (strip non-decorated properties) */
  whitelist?: boolean;
  /** Throw error on non-whitelisted properties */
  forbidNonWhitelisted?: boolean;
  /** Skip missing properties validation */
  skipMissingProperties?: boolean;
  /** Skip null validation */
  skipNullProperties?: boolean;
  /** Skip undefined validation */
  skipUndefinedProperties?: boolean;
  /** Custom validation groups */
  groups?: string[];
  /** Always validate (even if no decorator) */
  always?: boolean;
}

const DEFAULT_VALIDATION_OPTIONS: GrpcValidationOptions = {
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: false,
  skipMissingProperties: false,
  skipNullProperties: false,
  skipUndefinedProperties: false,
  always: true,
};

/**
 * gRPC Validation Interceptor
 *
 * Validates incoming gRPC requests using class-validator decorators.
 */
@Injectable()
export class GrpcValidationInterceptor implements NestInterceptor {
  private readonly logger = new Logger(GrpcValidationInterceptor.name);
  private readonly options: GrpcValidationOptions;

  constructor(options: GrpcValidationOptions = {}) {
    this.options = { ...DEFAULT_VALIDATION_OPTIONS, ...options };
  }

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const rpcContext = context.switchToRpc();
    const data = rpcContext.getData();
    const contextType = context.getType();

    // Only process gRPC/RPC requests
    if (contextType !== 'rpc') {
      return next.handle();
    }

    // Get method name for logging and skip checking
    const handler = context.getHandler();
    const methodName = handler.name;

    // Check if method should be skipped
    if (this.options.skipMethods?.includes(methodName)) {
      return next.handle();
    }

    // Skip if no data to validate
    if (!data || typeof data !== 'object') {
      return next.handle();
    }

    // Validate the request data
    const errors = await validate(data, {
      whitelist: this.options.whitelist,
      forbidNonWhitelisted: this.options.forbidNonWhitelisted,
      skipMissingProperties: this.options.skipMissingProperties,
      skipNullProperties: this.options.skipNullProperties,
      skipUndefinedProperties: this.options.skipUndefinedProperties,
      groups: this.options.groups,
      always: this.options.always,
    });

    if (errors.length > 0) {
      const formattedErrors = formatValidationErrors(errors);
      this.logger.warn(`Validation failed for ${methodName}`, {
        errors: formattedErrors,
      });
      return throwError(() => createValidationError(formattedErrors));
    }

    return next.handle();
  }
}

/**
 * Create a typed validation interceptor for a specific DTO class
 *
 * @example
 * ```typescript
 * @GrpcMethod('IdentityService', 'CreateAccount')
 * @UseInterceptors(createTypedValidationInterceptor(CreateAccountDto))
 * async createAccount(request: CreateAccountRequest) {
 *   // Request is validated and transformed to CreateAccountDto
 * }
 * ```
 */
export function createTypedValidationInterceptor<T extends object>(
  dtoClass: ClassConstructor<T>,
  options: GrpcValidationOptions = {},
): new () => NestInterceptor {
  const mergedOptions = { ...DEFAULT_VALIDATION_OPTIONS, ...options };

  @Injectable()
  class TypedGrpcValidationInterceptor implements NestInterceptor {
    private readonly logger = new Logger(`GrpcValidation:${dtoClass.name}`);

    async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
      const rpcContext = context.switchToRpc();
      const data = rpcContext.getData();
      const handler = context.getHandler();
      const methodName = handler.name;

      // Skip if method is in skip list
      if (mergedOptions.skipMethods?.includes(methodName)) {
        return next.handle();
      }

      // Skip if no data
      if (!data || typeof data !== 'object') {
        return next.handle();
      }

      // Transform to DTO instance
      const dtoInstance = plainToInstance(dtoClass, data);

      // Validate
      const errors = await validate(dtoInstance, {
        whitelist: mergedOptions.whitelist,
        forbidNonWhitelisted: mergedOptions.forbidNonWhitelisted,
        skipMissingProperties: mergedOptions.skipMissingProperties,
        skipNullProperties: mergedOptions.skipNullProperties,
        skipUndefinedProperties: mergedOptions.skipUndefinedProperties,
        groups: mergedOptions.groups,
        always: mergedOptions.always,
      });

      if (errors.length > 0) {
        const formattedErrors = formatValidationErrors(errors);
        this.logger.warn(`Validation failed for ${methodName}`, {
          dto: dtoClass.name,
          errors: formattedErrors,
        });
        return throwError(() => createValidationError(formattedErrors));
      }

      return next.handle();
    }
  }

  return TypedGrpcValidationInterceptor;
}

/**
 * Validation pipe for gRPC that can be used as a global pipe
 *
 * @example
 * ```typescript
 * @Module({
 *   providers: [
 *     {
 *       provide: APP_PIPE,
 *       useValue: new GrpcValidationPipe(),
 *     },
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
@Injectable()
export class GrpcValidationPipe {
  private readonly logger = new Logger(GrpcValidationPipe.name);
  private readonly options: GrpcValidationOptions;

  constructor(options: GrpcValidationOptions = {}) {
    this.options = { ...DEFAULT_VALIDATION_OPTIONS, ...options };
  }

  async transform<T extends object>(value: T): Promise<T> {
    if (!value || typeof value !== 'object') {
      return value;
    }

    const errors = await validate(value, {
      whitelist: this.options.whitelist,
      forbidNonWhitelisted: this.options.forbidNonWhitelisted,
      skipMissingProperties: this.options.skipMissingProperties,
      skipNullProperties: this.options.skipNullProperties,
      skipUndefinedProperties: this.options.skipUndefinedProperties,
      groups: this.options.groups,
      always: this.options.always,
    });

    if (errors.length > 0) {
      const formattedErrors = formatValidationErrors(errors);
      this.logger.warn('Validation failed', { errors: formattedErrors });
      throw createValidationError(formattedErrors);
    }

    return value;
  }
}

/**
 * Decorator to mark a method for validation with specific options
 *
 * @example
 * ```typescript
 * @GrpcMethod('IdentityService', 'CreateAccount')
 * @ValidateGrpcRequest({ whitelist: true, forbidNonWhitelisted: true })
 * async createAccount(request: CreateAccountRequest) {
 *   // Validation applied with custom options
 * }
 * ```
 */
export function ValidateGrpcRequest(options: GrpcValidationOptions = {}): MethodDecorator {
  return (_target, _propertyKey, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const data = args[0];

      if (data && typeof data === 'object') {
        const mergedOptions = { ...DEFAULT_VALIDATION_OPTIONS, ...options };
        const errors = await validate(data, {
          whitelist: mergedOptions.whitelist,
          forbidNonWhitelisted: mergedOptions.forbidNonWhitelisted,
          skipMissingProperties: mergedOptions.skipMissingProperties,
          skipNullProperties: mergedOptions.skipNullProperties,
          skipUndefinedProperties: mergedOptions.skipUndefinedProperties,
          groups: mergedOptions.groups,
          always: mergedOptions.always,
        });

        if (errors.length > 0) {
          const formattedErrors = formatValidationErrors(errors);
          throw createValidationError(formattedErrors);
        }
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * Common validation rules for gRPC requests
 */
export const GRPC_VALIDATION_RULES = {
  /** UUID v4 pattern */
  UUID_PATTERN: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,

  /** Email pattern */
  EMAIL_PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,

  /** ISO 3166-1 alpha-2 country code pattern */
  COUNTRY_CODE_PATTERN: /^[A-Z]{2}$/,

  /** ISO 639-1 language code pattern */
  LANGUAGE_CODE_PATTERN: /^[a-z]{2}(-[A-Z]{2})?$/,

  /** Maximum string length for common fields */
  MAX_STRING_LENGTH: 255,

  /** Maximum text length for descriptions */
  MAX_TEXT_LENGTH: 4000,

  /** Maximum array size for batch operations */
  MAX_BATCH_SIZE: 100,

  /** Minimum password length */
  MIN_PASSWORD_LENGTH: 8,

  /** Maximum password length */
  MAX_PASSWORD_LENGTH: 128,
};

/**
 * Helper function to validate a UUID
 */
export function isValidUuid(value: string): boolean {
  return GRPC_VALIDATION_RULES.UUID_PATTERN.test(value);
}

/**
 * Helper function to validate an email
 */
export function isValidEmail(value: string): boolean {
  return GRPC_VALIDATION_RULES.EMAIL_PATTERN.test(value);
}

/**
 * Helper function to validate a country code
 */
export function isValidCountryCode(value: string): boolean {
  return GRPC_VALIDATION_RULES.COUNTRY_CODE_PATTERN.test(value);
}
