import { Suspense, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSuspenseQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock, Filter, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '@my-girok/ui-components';
import { attendanceApi, type AttendanceFilter } from '../../api/attendance';

/**
 * Loading fallback component
 */
function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={32} className="animate-spin text-theme-primary" />
    </div>
  );
}

/**
 * Attendance list data component using Suspense
 */
function AttendanceListData({
  filter,
  onPageChange,
}: {
  filter: AttendanceFilter;
  onPageChange: (page: number) => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data } = useSuspenseQuery({
    queryKey: ['attendance', filter],
    queryFn: () => attendanceApi.list(filter),
  });

  const { data: attendances, total } = data;

  const approveMutation = useMutation({
    mutationFn: ({ id, approved }: { id: string; approved: boolean }) =>
      attendanceApi.approveOvertime(id, approved),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
  });

  const handleApproveOvertime = (id: string, approved: boolean) => {
    approveMutation.mutate({ id, approved });
  };

  const limit = filter.limit || 20;
  const page = filter.page || 1;
  const totalPages = Math.ceil(total / limit);

  if (attendances.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-theme-text-tertiary">
        <Clock size={48} className="mb-4 opacity-50" />
        <p>{t('hr.attendance.noRecords')}</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="admin-table min-w-full">
          <thead>
            <tr>
              <th>{t('hr.attendance.date')}</th>
              <th>{t('hr.attendance.employee')}</th>
              <th>{t('hr.attendance.clockIn')}</th>
              <th>{t('hr.attendance.clockOut')}</th>
              <th>{t('hr.attendance.workHours')}</th>
              <th>{t('hr.attendance.overtime')}</th>
              <th>{t('common.status')}</th>
              <th>{t('common.actions')}</th>
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
                    {attendance.clockIn ? new Date(attendance.clockIn).toLocaleTimeString() : '-'}
                  </span>
                </td>
                <td>
                  <span className="text-sm text-theme-text-secondary">
                    {attendance.clockOut ? new Date(attendance.clockOut).toLocaleTimeString() : '-'}
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
                        {attendance.overtimeApproved
                          ? `✓ ${t('hr.attendance.approved')}`
                          : `⏳ ${t('hr.attendance.pending')}`}
                      </span>
                    )}
                  </div>
                </td>
                <td>
                  <Badge
                    variant={
                      attendance.status === 'PRESENT'
                        ? 'success'
                        : attendance.status === 'ABSENT'
                          ? 'error'
                          : attendance.status === 'LATE'
                            ? 'warning'
                            : attendance.status === 'HALF_DAY'
                              ? 'info'
                              : 'accent'
                    }
                  >
                    {t(`hr.attendance.status.${attendance.status}`)}
                  </Badge>
                </td>
                <td>
                  {attendance.overtimeHours &&
                    attendance.overtimeHours > 0 &&
                    !attendance.overtimeApproved && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleApproveOvertime(attendance.id, true)}
                          disabled={approveMutation.isPending}
                          className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded disabled:opacity-50"
                          title={t('hr.attendance.approveOvertime')}
                        >
                          <CheckCircle size={16} />
                        </button>
                        <button
                          onClick={() => handleApproveOvertime(attendance.id, false)}
                          disabled={approveMutation.isPending}
                          className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded disabled:opacity-50"
                          title={t('hr.attendance.rejectOvertime')}
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
            {t('common.page', { current: page, total: totalPages })}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1 text-sm border border-theme-border-default rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-theme-bg-hover"
            >
              {t('common.previous')}
            </button>
            <button
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 text-sm border border-theme-border-default rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-theme-bg-hover"
            >
              {t('common.next')}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Attendance page component
 */
export default function AttendancePage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const limit = 20;

  const filter: AttendanceFilter = {
    page,
    limit,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    status: statusFilter || undefined,
  };

  // Get total count for display
  const { data } = useSuspenseQuery({
    queryKey: ['attendance', filter],
    queryFn: () => attendanceApi.list(filter),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Clock size={24} className="text-theme-primary" />
            <h1 className="text-xl sm:text-2xl font-bold text-theme-text-primary">
              {t('hr.attendance.title')}
            </h1>
          </div>
          <p className="text-sm sm:text-base text-theme-text-secondary mt-1">
            {t('hr.attendance.description')}
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
            <option value="">{t('hr.attendance.allStatuses')}</option>
            <option value="PRESENT">{t('hr.attendance.status.PRESENT')}</option>
            <option value="ABSENT">{t('hr.attendance.status.ABSENT')}</option>
            <option value="LATE">{t('hr.attendance.status.LATE')}</option>
            <option value="HALF_DAY">{t('hr.attendance.status.HALF_DAY')}</option>
            <option value="ON_LEAVE">{t('hr.attendance.status.ON_LEAVE')}</option>
          </select>

          <div className="text-xs sm:text-sm text-theme-text-tertiary pt-2 border-t border-theme-border-default sm:pt-0 sm:border-t-0 sm:ml-auto">
            {t('hr.attendance.count', { count: data.total })}
          </div>
        </div>
      </div>

      {/* Table with Suspense */}
      <div className="bg-theme-bg-card border border-theme-border-default rounded-xl overflow-hidden">
        <Suspense fallback={<LoadingFallback />}>
          <AttendanceListData filter={filter} onPageChange={setPage} />
        </Suspense>
      </div>
    </div>
  );
}
