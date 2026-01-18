import { Request } from 'express';
import { AdminPayload } from '../../admin/types/admin.types';

/**
 * Request with employee attached
 * Note: Employees are also admins, so we use AdminPayload
 */
export interface EmployeeRequest extends Request {
  employee: AdminPayload;
}
