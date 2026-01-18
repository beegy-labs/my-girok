import { useEffect, useState, useCallback } from 'react';
import { Calendar, Filter, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { leaveApi, LeaveRequest, ApproveLeaveRequestDto } from '../../api/leave';
import { useApiError } from '../../hooks/useApiError';

export default function LeavePage() {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [leaveTypeFilter, setLeaveTypeFilter] = useState('');

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const { executeWithErrorHandling, isLoading: loading } = useApiError({
    context: 'LeavePage.fetchLeaveRequests',
    retry: true,
  });

  const fetchLeaveRequests = useCallback(async () => {
    const response = await executeWithErrorHandling(async () => {
      return await leaveApi.list({
        page,
        limit,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        status: statusFilter || undefined,
        leaveType: leaveTypeFilter || undefined,
      });
    });
    if (response) {
      setLeaveRequests(response.data);
      setTotal(response.total);
    }
  }, [page, startDate, endDate, statusFilter, leaveTypeFilter, executeWithErrorHandling]);

  useEffect(() => {
    fetchLeaveRequests();
  }, [fetchLeaveRequests]);

  const handleApprove = async (id: string, approved: boolean, comment?: string) => {
    const dto: ApproveLeaveRequestDto = { approved, comment };
    await executeWithErrorHandling(async () => {
      await leaveApi.approve(id, dto);
    });
    fetchLeaveRequests();
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Calendar size={24} className="text-theme-primary" />
            <h1 className="text-xl sm:text-2xl font-bold text-theme-text-primary">
              Leave Requests
            </h1>
          </div>
          <p className="text-sm sm:text-base text-theme-text-secondary mt-1">
            Manage employee leave requests and approvals
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-theme-bg-card border border-theme-border-default rounded-xl p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
          <Filter size={18} className="text-theme-text-tertiary hidden sm:block" />

          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            placeholder="Start Date"
            className="w-full sm:w-auto px-3 py-2 bg-theme-bg-secondary border border-theme-border-default rounded-lg text-theme-text-primary text-sm"
          />

          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            placeholder="End Date"
            className="w-full sm:w-auto px-3 py-2 bg-theme-bg-secondary border border-theme-border-default rounded-lg text-theme-text-primary text-sm"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 bg-theme-bg-secondary border border-theme-border-default rounded-lg text-theme-text-primary text-sm"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <select
            value={leaveTypeFilter}
            onChange={(e) => setLeaveTypeFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 bg-theme-bg-secondary border border-theme-border-default rounded-lg text-theme-text-primary text-sm"
          >
            <option value="">All Types</option>
            <option value="ANNUAL">Annual</option>
            <option value="SICK">Sick</option>
            <option value="PERSONAL">Personal</option>
            <option value="MATERNITY">Maternity</option>
            <option value="PATERNITY">Paternity</option>
            <option value="UNPAID">Unpaid</option>
            <option value="OTHER">Other</option>
          </select>

          <div className="text-xs sm:text-sm text-theme-text-tertiary pt-2 border-t border-theme-border-default sm:pt-0 sm:border-t-0 sm:ml-auto">
            {total} requests
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-theme-bg-card border border-theme-border-default rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 size={32} className="animate-spin text-theme-primary" />
          </div>
        ) : leaveRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-theme-text-tertiary">
            <Calendar size={48} className="mb-4 opacity-50" />
            <p>No leave requests found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="admin-table min-w-full">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Leave Type</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Days</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leaveRequests.map((request) => (
                    <tr key={request.id}>
                      <td>
                        <span className="text-sm font-medium">{request.adminId}</span>
                      </td>
                      <td>
                        <LeaveTypeBadge type={request.leaveType} />
                      </td>
                      <td>
                        <span className="text-sm text-theme-text-secondary">
                          {request.startDate}
                        </span>
                      </td>
                      <td>
                        <span className="text-sm text-theme-text-secondary">{request.endDate}</span>
                      </td>
                      <td>
                        <span className="text-sm font-mono">{request.days} days</span>
                      </td>
                      <td>
                        <span className="text-sm text-theme-text-secondary truncate max-w-xs block">
                          {request.reason || '-'}
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={request.status} />
                      </td>
                      <td>
                        {request.status === 'PENDING' && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleApprove(request.id, true)}
                              className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                              title="Approve"
                            >
                              <CheckCircle size={16} />
                            </button>
                            <button
                              onClick={() => handleApprove(request.id, false, 'Rejected')}
                              className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                              title="Reject"
                            >
                              <XCircle size={16} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-theme-border-default">
                <div className="text-sm text-theme-text-tertiary">
                  Page {page} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 text-sm border border-theme-border-default rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-theme-bg-hover"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1 text-sm border border-theme-border-default rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-theme-bg-hover"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function LeaveTypeBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    ANNUAL: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    SICK: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    PERSONAL: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    MATERNITY: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
    PATERNITY: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
    UNPAID: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
    OTHER: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${styles[type] || 'bg-gray-100 text-gray-800'}`}
    >
      {type}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
    PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    APPROVED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    CANCELLED: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}
    >
      {status}
    </span>
  );
}
