# Shared Module

> **Status**: Structure Backup Only

## Overview

Common utilities, decorators, guards, and interceptors shared across HR modules.

## Sub-directories

| Directory    | Description                                  |
| ------------ | -------------------------------------------- |
| decorators   | Custom decorators (CurrentUser, Permissions) |
| guards       | Shared guards (AuthGuard, RoleGuard)         |
| interceptors | Response transformers, logging               |

## Planned Utilities

- `@CurrentEmployee()` - Get current employee from request
- `@RequirePermissions()` - Permission-based access control
- `LoggingInterceptor` - Request/response logging
- `TransformInterceptor` - Response transformation
