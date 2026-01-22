# Backend (NestJS) - 2026 Best Practices

> NestJS 11, Node.js 24, microservices | **Updated**: 2026-01-22

## NestJS Position (2026)

- **60k+ GitHub stars**, unrivaled enterprise leader
- 93% of organizations using or evaluating
- Future: Server Components (2025), WASM (2026), AI toolchain (2027)

## Architecture Best Practices

### Module Design

```typescript
// Think of modules as microservices within monolith
// Each module: single responsibility, clear boundaries

@Module({
  imports: [DatabaseModule, CacheModule],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService],
})
export class UsersModule {}
```

| Layer        | Responsibility     |
| ------------ | ------------------ |
| Controllers  | HTTP handling only |
| Services     | Business logic     |
| Repositories | Data access        |
| Modules      | Dependency wiring  |

### Dependency Injection

```typescript
// Recommended: Constructor injection
@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly cacheService: CacheService,
  ) {}
}
```

## Database Integration

| ORM     | Use Case        | Notes                   |
| ------- | --------------- | ----------------------- |
| Prisma  | Type safety, DX | Official adapter (2024) |
| TypeORM | Traditional ORM | Officially recommended  |
| Drizzle | Performance     | Rising alternative      |

### Transaction Pattern

```typescript
@Injectable()
export class OrderService {
  @Transactional() // Auto-rollback on error
  async createOrder(dto: CreateOrderDto) {
    const order = await this.orderRepo.create(dto);
    await this.inventoryService.reserve(dto.items);
    await this.paymentService.charge(dto.payment);
    return order;
  }
}
```

## Authentication

| Strategy    | Use Case                 |
| ----------- | ------------------------ |
| JWT         | Stateless, microservices |
| Session     | Traditional web apps     |
| OAuth       | Third-party auth         |
| Passport.js | Multi-strategy           |

```typescript
@Module({
  imports: [
    JwtModule.register({ secret: process.env.JWT_SECRET }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
})
export class AuthModule {}
```

## Performance Optimization

| Technique          | Impact                    |
| ------------------ | ------------------------- |
| Caching (Redis)    | 10-100x faster reads      |
| Compression (gzip) | 60-80% smaller responses  |
| Worker Threads     | CPU-bound task offloading |
| Connection pooling | Reduced DB overhead       |

### Worker Threads for CPU Tasks

```typescript
// Keep main thread for I/O
// Offload CPU-heavy work
import { Worker } from 'worker_threads';

const worker = new Worker('./heavy-computation.js');
worker.postMessage(data);
worker.on('message', (result) => resolve(result));
```

## API Patterns

| Internal         | External         | Rationale                  |
| ---------------- | ---------------- | -------------------------- |
| gRPC             | REST             | Type-safe, faster internal |
| Protocol Buffers | JSON             | Smaller payloads           |
| Streaming        | Request-Response | Real-time data             |

## Validation

```typescript
import { IsEmail, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}

// Controller auto-validates
@Post()
async create(@Body() dto: CreateUserDto) {}
```

## Anti-Patterns

| Don't                   | Do                 | Why                     |
| ----------------------- | ------------------ | ----------------------- |
| Logic in controllers    | Services           | Testability, reuse      |
| Direct DB in controller | Repository pattern | Separation of concerns  |
| Sync I/O                | Async/await        | Non-blocking            |
| Hardcoded config        | ConfigService      | Environment flexibility |

## Sources

- [NestJS Documentation](https://docs.nestjs.com/)
- [NestJS Best Practices](https://medium.com/@adnan172203/nestjs-best-practices-building-scalable-node-js-applications-like-a-pro-4a8474f5528a)
- [NestJS Performance Optimization](https://www.brilworks.com/blog/optimize-your-nest-js-app-performance/)
- [Node.js Best Practices 2026](https://www.technology.org/2025/12/22/building-modern-web-applications-node-js-innovations-and-best-practices-for-2026/)
