import { Suspense, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSuspenseQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Filter, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '@my-girok/ui-components';
import { leaveApi, type LeaveRequestFilter, type ApproveLeaveRequestDto } from '../../api/leave';

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
 * Leave requests list data component using Suspense
 */
function LeaveRequestsListData({
  filter,
  onPageChange,
}: {
  filter: LeaveRequestFilter;
  onPageChange: (page: number) => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data } = useSuspenseQuery({
    queryKey: ['leave-requests', filter],
    queryFn: () => leaveApi.list(filter),
  });

  const { data: leaveRequests, total } = data;

  const approveMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: ApproveLeaveRequestDto }) =>
      leaveApi.approve(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
    },
  });

  const handleApprove = (id: string, approved: boolean, comment?: string) => {
    const dto: ApproveLeaveRequestDto = { approved, comment };
    approveMutation.mutate({ id, dto });
  };

  const limit = filter.limit || 20;
  const page = filter.page || 1;
  const totalPages = Math.ceil(total / limit);

  if (leaveRequests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-theme-text-tertiary">
        <Calendar size={48} className="mb-4 opacity-50" />
        <p>{t('hr.leave.noRequests')}</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="admin-table min-w-full">
          <thead>
            <tr>
              <th>{t('hr.leave.employee')}</th>
              <th>{t('hr.leave.leaveType')}</th>
              <th>{t('hr.leave.startDate')}</th>
              <th>{t('hr.leave.endDate')}</th>
              <th>{t('hr.leave.days')}</th>
              <th>{t('hr.leave.reason')}</th>
              <th>{t('common.status')}</th>
              <th>{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {leaveRequests.map((request) => (
              <tr key={request.id}>
                <td>
                  <span className="text-sm font-medium">{request.adminId}</span>
                </td>
                <td>
                  <Badge
                    variant={
                      request.leaveType === 'SICK'
                        ? 'error'
                        : request.leaveType === 'ANNUAL'
                          ? 'info'
                          : request.leaveType === 'UNPAID'
                            ? 'default'
                            : 'accent'
                    }
                  >
                    {t(`hr.leave.types.${request.leaveType}`)}
                  </Badge>
                </td>
                <td>
                  <span className="text-sm text-theme-text-secondary">{request.startDate}</span>
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
                  <Badge
                    variant={
                      request.status === 'APPROVED'
                        ? 'success'
                        : request.status === 'PENDING'
                          ? 'warning'
                          : request.status === 'REJECTED'
                            ? 'error'
                            : 'default'
                    }
                  >
                    {t(`hr.leave.status.${request.status}`)}
                  </Badge>
                </td>
                <td>
                  {request.status === 'PENDING' && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleApprove(request.id, true)}
                        disabled={approveMutation.isPending}
                        className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded disabled:opacity-50"
                        title={t('hr.leave.approve')}
                      >
                        <CheckCircle size={16} />
                      </button>
                      <button
                        onClick={() => handleApprove(request.id, false, 'Rejected')}
                        disabled={approveMutation.isPending}
                        className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded disabled:opacity-50"
                        title={t('hr.leave.reject')}
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
 * Leave page component
 */
export default function LeavePage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [leaveTypeFilter, setLeaveTypeFilter] = useState('');

  const limit = 20;

  const filter: LeaveRequestFilter = {
    page,
    limit,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    status: statusFilter || undefined,
    leaveType: leaveTypeFilter || undefined,
  };

  // Get total count for display
  const { data } = useSuspenseQuery({
    queryKey: ['leave-requests', filter],
    queryFn: () => leaveApi.list(filter),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Calendar size={24} className="text-theme-primary" />
            <h1 className="text-xl sm:text-2xl font-bold text-theme-text-primary">
              {t('hr.leave.title')}
            </h1>
          </div>
          <p className="text-sm sm:text-base text-theme-text-secondary mt-1">
            {t('hr.leave.description')}
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
            <option value="">{t('hr.leave.allStatuses')}</option>
            <option value="DRAFT">{t('hr.leave.status.DRAFT')}</option>
            <option value="PENDING">{t('hr.leave.status.PENDING')}</option>
            <option value="APPROVED">{t('hr.leave.status.APPROVED')}</option>
            <option value="REJECTED">{t('hr.leave.status.REJECTED')}</option>
            <option value="CANCELLED">{t('hr.leave.status.CANCELLED')}</option>
          </select>

          <select
            value={leaveTypeFilter}
            onChange={(e) => setLeaveTypeFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 bg-theme-bg-secondary border border-theme-border-default rounded-lg text-theme-text-primary text-sm"
          >
            <option value="">{t('hr.leave.allTypes')}</option>
            <option value="ANNUAL">{t('hr.leave.types.ANNUAL')}</option>
            <option value="SICK">{t('hr.leave.types.SICK')}</option>
            <option value="PERSONAL">{t('hr.leave.types.PERSONAL')}</option>
            <option value="MATERNITY">{t('hr.leave.types.MATERNITY')}</option>
            <option value="PATERNITY">{t('hr.leave.types.PATERNITY')}</option>
            <option value="UNPAID">{t('hr.leave.types.UNPAID')}</option>
            <option value="OTHER">{t('hr.leave.types.OTHER')}</option>
          </select>

          <div className="text-xs sm:text-sm text-theme-text-tertiary pt-2 border-t border-theme-border-default sm:pt-0 sm:border-t-0 sm:ml-auto">
            {t('hr.leave.count', { count: data.total })}
          </div>
        </div>
      </div>

      {/* Table with Suspense */}
      <div className="bg-theme-bg-card border border-theme-border-default rounded-xl overflow-hidden">
        <Suspense fallback={<LoadingFallback />}>
          <LeaveRequestsListData filter={filter} onPageChange={setPage} />
        </Suspense>
      </div>
    </div>
  );
}
