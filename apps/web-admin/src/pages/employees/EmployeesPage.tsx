import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router';
import { Users, Search, Filter, Loader2, Pencil } from 'lucide-react';
import { employeeApi, Employee, EmployeeListResponse } from '../../api/employees';
import { useApiError } from '../../hooks/useApiError';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Filters
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>(undefined);

  // Pagination
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const { executeWithErrorHandling, isLoading: loading } = useApiError({
    context: 'EmployeesPage.fetchEmployees',
    retry: true,
  });

  const fetchEmployees = useCallback(async () => {
    const response = await executeWithErrorHandling(async () => {
      return await employeeApi.list({
        page,
        limit,
        search: search || undefined,
        department: department || undefined,
        active: activeFilter,
      });
    });
    if (response) {
      setEmployees(response.data);
      setTotal(response.total);
    }
  }, [page, search, department, activeFilter, executeWithErrorHandling]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchEmployees();
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Users size={24} className="text-theme-primary" />
            <h1 className="text-xl sm:text-2xl font-bold text-theme-text-primary">Employees</h1>
          </div>
          <p className="text-sm sm:text-base text-theme-text-secondary mt-1">
            Manage employee profiles, job information, and organizational data
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
                placeholder="Search by name or email..."
                className="w-full sm:w-64 pl-10 pr-4 py-2 bg-theme-bg-secondary border border-theme-border-default rounded-lg text-theme-text-primary text-sm"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-theme-primary text-btn-primary-text rounded-lg text-sm hover:opacity-90"
            >
              Search
            </button>
          </form>

          <input
            type="text"
            value={department}
            onChange={(e) => {
              setDepartment(e.target.value);
              setPage(1);
            }}
            placeholder="Filter by department..."
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
            <option value="">All Statuses</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>

          <div className="text-xs sm:text-sm text-theme-text-tertiary pt-2 border-t border-theme-border-default sm:pt-0 sm:border-t-0 sm:ml-auto">
            {total} employees
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-theme-bg-card border border-theme-border-default rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 size={32} className="animate-spin text-theme-primary" />
          </div>
        ) : employees.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-theme-text-tertiary">
            <Users size={48} className="mb-4 opacity-50" />
            <p>No employees found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="admin-table min-w-full">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Employee #</th>
                    <th>Department</th>
                    <th>Title</th>
                    <th>Status</th>
                    <th>Actions</th>
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
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            employee.active
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                          }`}
                        >
                          {employee.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <Link
                          to={`/hr/employees/${employee.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1 text-sm text-theme-primary hover:bg-theme-bg-hover rounded-lg transition-colors"
                        >
                          <Pencil size={14} />
                          View
                        </Link>
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
