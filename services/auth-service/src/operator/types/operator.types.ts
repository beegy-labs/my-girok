export interface OperatorPayload {
  sub: string;
  email: string;
  name: string;
  type: 'OPERATOR_ACCESS' | 'OPERATOR_REFRESH';
  adminId: string;
  serviceId: string;
  serviceSlug: string;
  countryCode: string;
  permissions: string[];
}

export interface OperatorWithRelations {
  id: string;
  email: string;
  password: string;
  name: string;
  adminId: string;
  serviceId: string;
  serviceSlug: string;
  serviceName: string;
  countryCode: string;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}

export interface OperatorPermissionRow {
  operatorId: string;
  resource: string;
  action: string;
}
