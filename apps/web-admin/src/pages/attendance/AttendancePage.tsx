import { useEffect, useState, useCallback } from 'react';
import { Clock, Filter, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { attendanceApi, Attendance } from '../../api/attendance';
import { useApiError } from '../../hooks/useApiError';

export default function AttendancePage() {
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const { executeWithErrorHandling, isLoading: loading } = useApiError({
    context: 'AttendancePage.fetchAttendance',
    retry: true,
  });

  const fetchAttendances = useCallback(async () => {
    const response = await executeWithErrorHandling(async () => {
      return await attendanceApi.list({
        page,
        limit,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        status: statusFilter || undefined,
      });
    });
    if (response) {
      setAttendances(response.data);
      setTotal(response.total);
    }
  }, [page, startDate, endDate, statusFilter, executeWithErrorHandling]);

  useEffect(() => {
    fetchAttendances();
  }, [fetchAttendances]);

  const handleApproveOvertime = async (id: string, approved: boolean) => {
    await executeWithErrorHandling(async () => {
      await attendanceApi.approveOvertime(id, approved);
    });
    fetchAttendances();
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Clock size={24} className="text-theme-primary" />
            <h1 className="text-xl sm:text-2xl font-bold text-theme-text-primary">Attendance</h1>
          </div>
          <p className="text-sm sm:text-base text-theme-text-secondary mt-1">
            View and manage employee attendance records
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
            className="w-full sm:w-auto px-3 py-2 bg-theme-bg-secondary border border-theme-border-default rounded-lg text-theme-text-primary text-sm"
          />

          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 bg-theme-bg-secondary border border-theme-border-default rounded-lg text-theme-text-primary text-sm"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 bg-theme-bg-secondary border border-theme-border-default rounded-lg text-theme-text-primary text-sm"
          >
            <option value="">All Statuses</option>
            <option value="PRESENT">Present</option>
            <option value="ABSENT">Absent</option>
            <option value="LATE">Late</option>
            <option value="HALF_DAY">Half Day</option>
            <option value="ON_LEAVE">On Leave</option>
          </select>

          <div className="text-xs sm:text-sm text-theme-text-tertiary pt-2 border-t border-theme-border-default sm:pt-0 sm:border-t-0 sm:ml-auto">
            {total} records
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-theme-bg-card border border-theme-border-default rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 size={32} className="animate-spin text-theme-primary" />
          </div>
        ) : attendances.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-theme-text-tertiary">
            <Clock size={48} className="mb-4 opacity-50" />
            <p>No attendance records found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="admin-table min-w-full">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Employee</th>
                    <th>Clock In</th>
                    <th>Clock Out</th>
                    <th>Work Hours</th>
                    <th>Overtime</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {attendances.map((attendance) => (
                    <tr key={attendance.id}>
                      <td>
                        <span className="text-sm font-medium">{attendance.date}</span>
                      </td>
                      <td>
                        <span className="text-sm">{attendance.adminId}</span>
                      </td>
                      <td>
                        <span className="text-sm text-theme-text-secondary">
                          {attendance.clockIn
                            ? new Date(attendance.clockIn).toLocaleTimeString()
                            : '-'}
                        </span>
                      </td>
                      <td>
                        <span className="text-sm text-theme-text-secondary">
                          {attendance.clockOut
                            ? new Date(attendance.clockOut).toLocaleTimeString()
                            : '-'}
                        </span>
                      </td>
                      <td>
                        <span className="text-sm font-mono">
                          {attendance.workHours?.toFixed(1) || '-'} hrs
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono">
                            {attendance.overtimeHours?.toFixed(1) || '0'} hrs
                          </span>
                          {attendance.overtimeHours && attendance.overtimeHours > 0 && (
                            <span
                              className={`text-xs ${attendance.overtimeApproved ? 'text-green-600' : 'text-yellow-600'}`}
                            >
                              {attendance.overtimeApproved ? '✓ Approved' : '⏳ Pending'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <StatusBadge status={attendance.status} />
                      </td>
                      <td>
                        {attendance.overtimeHours &&
                          attendance.overtimeHours > 0 &&
                          !attendance.overtimeApproved && (
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleApproveOvertime(attendance.id, true)}
                                className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                                title="Approve Overtime"
                              >
                                <CheckCircle size={16} />
                              </button>
                              <button
                                onClick={() => handleApproveOvertime(attendance.id, false)}
                                className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                title="Reject Overtime"
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

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PRESENT: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    ABSENT: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    LATE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    HALF_DAY: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    ON_LEAVE: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}
    >
      {status.replace('_', ' ')}
    </span>
  );
}
