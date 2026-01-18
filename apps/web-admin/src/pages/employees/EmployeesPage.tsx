import { Suspense, useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Users, Search, Filter, Loader2, Pencil } from 'lucide-react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Badge } from '@my-girok/ui-components';
import { employeeApi, type EmployeeListFilter } from '../../api/employees';

/**
 * Employee list data component (uses Suspense)
 */
function EmployeeListData({
  filter,
  onPageChange,
}: {
  filter: EmployeeListFilter;
  onPageChange: (page: number) => void;
}) {
  const { t } = useTranslation();

  const { data } = useSuspenseQuery({
    queryKey: ['employees', filter],
    queryFn: () => employeeApi.list(filter),
  });

  const { data: employees, total } = data;
  const limit = filter.limit || 20;
  const page = filter.page || 1;
  const totalPages = Math.ceil(total / limit);

  if (employees.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-theme-text-tertiary">
        <Users size={48} className="mb-4 opacity-50" />
        <p>{t('hr.employees.noEmployees')}</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="admin-table min-w-full">
          <thead>
            <tr>
              <th>{t('hr.employees.name')}</th>
              <th>{t('hr.employees.email')}</th>
              <th>{t('hr.employees.employeeNumber')}</th>
              <th>{t('hr.employees.department')}</th>
              <th>{t('hr.employees.title')}</th>
              <th>{t('common.status')}</th>
              <th>{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => (
              <tr key={employee.id}>
                <td>
                  <div className="font-medium text-theme-text-primary">
                    {employee.displayName || employee.userName || '-'}
                  </div>
                  {employee.givenName && employee.familyName && (
                    <div className="text-xs text-theme-text-tertiary">
                      {employee.givenName} {employee.familyName}
                    </div>
                  )}
                </td>
                <td>
                  <span className="text-sm text-theme-text-secondary">{employee.email}</span>
                </td>
                <td>
                  <span className="text-sm font-mono">{employee.employeeNumber || '-'}</span>
                </td>
                <td>
                  <span className="text-sm">{employee.department || '-'}</span>
                </td>
                <td>
                  <span className="text-sm">{employee.title || '-'}</span>
                </td>
                <td>
                  <Badge variant={employee.active ? 'success' : 'default'}>
                    {employee.active ? t('common.active') : t('common.inactive')}
                  </Badge>
                </td>
                <td>
                  <Link
                    to={`/hr/employees/${employee.id}`}
                    className="inline-flex items-center gap-1 px-3 py-1 text-sm text-theme-primary hover:bg-theme-bg-hover rounded-lg transition-colors"
                  >
                    <Pencil size={14} />
                    {t('common.view')}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <EmployeePagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
      )}
    </>
  );
}

/**
 * Pagination component
 */
function EmployeePagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const { t } = useTranslation();

  return (
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
  );
}

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
 * Employees Page (main component)
 */
export default function EmployeesPage() {
  const { t } = useTranslation();

  // Filters state
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>(undefined);
  const [page, setPage] = useState(1);

  const limit = 20;

  // Build filter object
  const filter: EmployeeListFilter = {
    page,
    limit,
    search: search || undefined,
    department: department || undefined,
    active: activeFilter,
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Users size={24} className="text-theme-primary" />
            <h1 className="text-xl sm:text-2xl font-bold text-theme-text-primary">
              {t('hr.employees.title')}
            </h1>
          </div>
          <p className="text-sm sm:text-base text-theme-text-secondary mt-1">
            {t('hr.employees.description')}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-theme-bg-card border border-theme-border-default rounded-xl p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
          <Filter size={18} className="text-theme-text-tertiary hidden sm:block" />

          <form
            onSubmit={handleSearch}
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto"
          >
            <div className="relative flex-1 sm:flex-none">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-text-tertiary"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('hr.employees.searchPlaceholder')}
                className="w-full sm:w-64 pl-10 pr-4 py-2 bg-theme-bg-secondary border border-theme-border-default rounded-lg text-theme-text-primary text-sm"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-theme-primary text-btn-primary-text rounded-lg text-sm hover:opacity-90"
            >
              {t('common.search')}
            </button>
          </form>

          <input
            type="text"
            value={department}
            onChange={(e) => {
              setDepartment(e.target.value);
              setPage(1);
            }}
            placeholder={t('hr.employees.filterDepartment')}
            className="w-full sm:w-auto px-3 py-2 bg-theme-bg-secondary border border-theme-border-default rounded-lg text-theme-text-primary text-sm"
          />

          <select
            value={activeFilter === undefined ? '' : activeFilter ? 'true' : 'false'}
            onChange={(e) => {
              setActiveFilter(e.target.value === '' ? undefined : e.target.value === 'true');
              setPage(1);
            }}
            className="w-full sm:w-auto px-3 py-2 bg-theme-bg-secondary border border-theme-border-default rounded-lg text-theme-text-primary text-sm"
          >
            <option value="">{t('hr.employees.allStatuses')}</option>
            <option value="true">{t('common.active')}</option>
            <option value="false">{t('common.inactive')}</option>
          </select>

          <Suspense
            fallback={<span className="text-xs sm:text-sm text-theme-text-tertiary">...</span>}
          >
            <EmployeeCount filter={filter} />
          </Suspense>
        </div>
      </div>

      {/* Table with Suspense */}
      <div className="bg-theme-bg-card border border-theme-border-default rounded-xl overflow-hidden">
        <Suspense fallback={<LoadingFallback />}>
          <EmployeeListData filter={filter} onPageChange={setPage} />
        </Suspense>
      </div>
    </div>
  );
}

/**
 * Employee count component (separate query for count display)
 */
function EmployeeCount({ filter }: { filter: EmployeeListFilter }) {
  const { t } = useTranslation();
  const { data } = useSuspenseQuery({
    queryKey: ['employees', filter],
    queryFn: () => employeeApi.list(filter),
  });

  return (
    <div className="text-xs sm:text-sm text-theme-text-tertiary pt-2 border-t border-theme-border-default sm:pt-0 sm:border-t-0 sm:ml-auto">
      {t('hr.employees.count', { count: data.total })}
    </div>
  );
}
