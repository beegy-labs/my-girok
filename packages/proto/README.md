# @my-girok/proto

Protocol Buffers definitions for inter-service communication in my-girok platform.

## Structure

```
packages/proto/
├── buf.yaml              # Buf configuration
├── buf.gen.yaml          # Code generation settings
├── identity/v1/          # Identity service protos
│   └── identity.proto
├── auth/v1/              # Auth service protos
│   └── auth.proto
└── legal/v1/             # Legal service protos
    └── legal.proto
```

## Services

### Identity Service (identity.v1)

Account, session, device, and profile management:

- `GetAccount` / `ValidateAccount` / `GetAccountByEmail`
- `ValidateSession` / `RevokeSession` / `RevokeAllSessions`
- `GetAccountDevices` / `TrustDevice` / `RevokeDevice`
- `GetProfile`

### Auth Service (auth.v1)

Permission, role, operator, and sanction management:

- `CheckPermission` / `CheckPermissions` / `GetOperatorPermissions`
- `GetRole` / `GetRolesByOperator`
- `GetOperator` / `ValidateOperator`
- `CheckSanction` / `GetActiveSanctions`

### Legal Service (legal.v1)

Consent, document, and compliance management:

- `CheckConsents` / `GetAccountConsents` / `GrantConsent` / `RevokeConsent`
- `GetCurrentDocument` / `GetDocumentVersion` / `ListDocuments`
- `GetLawRequirements` / `GetCountryCompliance`
- `CreateDsrRequest` / `GetDsrRequest` / `GetDsrDeadline`

## Usage

### Install dependencies

```bash
pnpm install
```

### Lint proto files

```bash
pnpm lint
```

### Format proto files

```bash
pnpm format
```

### Generate TypeScript types

```bash
pnpm generate
```

### Check breaking changes

```bash
pnpm breaking
```

## Versioning

Proto files use semantic versioning in their package paths (e.g., `identity.v1`).
When making breaking changes, create a new version (e.g., `identity.v2`).

## Style Guide

Follow the [Protocol Buffers Style Guide](https://protobuf.dev/programming-guides/style/):

- Use `snake_case` for field names
- Use `PascalCase` for message and enum names
- Use `SCREAMING_SNAKE_CASE` for enum values
- Prefix enum values with the enum name

## References

- [Buf Documentation](https://buf.build/docs/)
- [Protocol Buffers Language Guide](https://protobuf.dev/programming-guides/proto3/)
- [gRPC Documentation](https://grpc.io/docs/)
