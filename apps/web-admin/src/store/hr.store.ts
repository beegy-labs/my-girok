/**
 * HR Zustand Store
 * Centralized state management for HR features
 */

import { create } from 'zustand';
import { employeeApi, attendanceApi, leaveApi, delegationApi } from '../api';
import type {
  Employee,
  EmployeeListFilter,
  Attendance,
  AttendanceFilter,
  LeaveRequest,
  LeaveRequestFilter,
  Delegation,
  DelegationFilter,
} from '@my-girok/types';

/**
 * HR State Interface
 */
interface HrState {
  // Employees
  employees: Employee[];
  totalEmployees: number;
  isLoadingEmployees: boolean;
  employeesError: unknown | null;
  fetchEmployees: (filter: EmployeeListFilter) => Promise<void>;

  // Current Employee Detail
  currentEmployee: Employee | null;
  isLoadingCurrentEmployee: boolean;
  currentEmployeeError: unknown | null;
  fetchEmployeeById: (id: string) => Promise<void>;
  clearCurrentEmployee: () => void;

  // Attendance
  attendances: Attendance[];
  totalAttendances: number;
  isLoadingAttendances: boolean;
  attendancesError: unknown | null;
  fetchAttendances: (filter: AttendanceFilter) => Promise<void>;

  // Leave Requests
  leaveRequests: LeaveRequest[];
  totalLeaveRequests: number;
  isLoadingLeaveRequests: boolean;
  leaveRequestsError: unknown | null;
  fetchLeaveRequests: (filter: LeaveRequestFilter) => Promise<void>;

  // Delegations
  delegations: Delegation[];
  totalDelegations: number;
  isLoadingDelegations: boolean;
  delegationsError: unknown | null;
  fetchDelegations: (filter: DelegationFilter) => Promise<void>;
}

/**
 * HR Store
 * Centralized state management for all HR features
 */
export const useHrStore = create<HrState>((set) => ({
  // Employees State
  employees: [],
  totalEmployees: 0,
  isLoadingEmployees: false,
  employeesError: null,

  // Employees Actions
  fetchEmployees: async (filter) => {
    set({ isLoadingEmployees: true, employeesError: null });
    try {
      const response = await employeeApi.list(filter);
      set({
        employees: response.data,
        totalEmployees: response.total,
        isLoadingEmployees: false,
      });
    } catch (error) {
      set({ employeesError: error, isLoadingEmployees: false });
      throw error;
    }
  },

  // Current Employee State
  currentEmployee: null,
  isLoadingCurrentEmployee: false,
  currentEmployeeError: null,

  // Current Employee Actions
  fetchEmployeeById: async (id) => {
    set({ isLoadingCurrentEmployee: true, currentEmployeeError: null });
    try {
      const employee = await employeeApi.getById(id);
      set({
        currentEmployee: employee,
        isLoadingCurrentEmployee: false,
      });
    } catch (error) {
      set({ currentEmployeeError: error, isLoadingCurrentEmployee: false });
      throw error;
    }
  },

  clearCurrentEmployee: () => {
    set({ currentEmployee: null, currentEmployeeError: null });
  },

  // Attendance State
  attendances: [],
  totalAttendances: 0,
  isLoadingAttendances: false,
  attendancesError: null,

  // Attendance Actions
  fetchAttendances: async (filter) => {
    set({ isLoadingAttendances: true, attendancesError: null });
    try {
      const response = await attendanceApi.list(filter);
      set({
        attendances: response.data,
        totalAttendances: response.total,
        isLoadingAttendances: false,
      });
    } catch (error) {
      set({ attendancesError: error, isLoadingAttendances: false });
      throw error;
    }
  },

  // Leave Requests State
  leaveRequests: [],
  totalLeaveRequests: 0,
  isLoadingLeaveRequests: false,
  leaveRequestsError: null,

  // Leave Requests Actions
  fetchLeaveRequests: async (filter) => {
    set({ isLoadingLeaveRequests: true, leaveRequestsError: null });
    try {
      const response = await leaveApi.list(filter);
      set({
        leaveRequests: response.data,
        totalLeaveRequests: response.total,
        isLoadingLeaveRequests: false,
      });
    } catch (error) {
      set({ leaveRequestsError: error, isLoadingLeaveRequests: false });
      throw error;
    }
  },

  // Delegations State
  delegations: [],
  totalDelegations: 0,
  isLoadingDelegations: false,
  delegationsError: null,

  // Delegations Actions
  fetchDelegations: async (filter) => {
    set({ isLoadingDelegations: true, delegationsError: null });
    try {
      const response = await delegationApi.list(filter);
      set({
        delegations: response.data,
        totalDelegations: response.total,
        isLoadingDelegations: false,
      });
    } catch (error) {
      set({ delegationsError: error, isLoadingDelegations: false });
      throw error;
    }
  },
}));
