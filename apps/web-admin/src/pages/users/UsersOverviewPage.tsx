import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Search, ChevronLeft, ChevronRight, Loader2, Users, Globe, Monitor } from 'lucide-react';
import { analyticsApi, type UserOverviewItem } from '../../api/analytics';
import { Card } from '../../components/atoms/Card';
import { LocationBadge } from '../system/session-recordings/components/LocationBadge';
import { useApiError } from '../../hooks/useApiError';

// Pure helper function moved outside component for better performance
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString();
}

export default function UsersOverviewPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserOverviewItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [limit] = useState(50);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const { executeWithErrorHandling, isLoading: loading } = useApiError({
    context: 'UsersOverviewPage.fetchUsers',
    retry: true,
  });

  const fetchUsers = useCallback(async () => {
    const response = await executeWithErrorHandling(async () => {
      return await analyticsApi.getUsersOverview({
        page,
        limit,
        search: search || undefined,
      });
    });
    if (response) {
      setUsers(response.data);
      setTotal(response.total);
      setTotalPages(response.totalPages);
    }
  }, [page, limit, search, executeWithErrorHandling]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-theme-text-primary">
          {t('analytics.usersOverview', 'Users Overview')}
        </h1>
        <p className="text-sm text-theme-text-tertiary">
          {t('analytics.totalUsers', 'Total {{count}} users', { count: total })}
        </p>
      </div>

      {/* Search */}
      <Card>
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-theme-text-tertiary" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={t('analytics.searchUsers', 'Search users by email...')}
              className="w-full pl-10 pr-4 py-2 border border-theme-border-default rounded-lg bg-theme-bg-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            {t('common.search', 'Search')}
          </button>
        </div>
      </Card>

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-theme-text-tertiary" />
        </div>
      ) : users.length === 0 ? (
        <Card>
          <div className="text-center py-12 text-theme-text-tertiary">
            {t('analytics.noUsers', 'No users found')}
          </div>
        </Card>
      ) : (
        <>
          {/* Users Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {users.map((user) => (
              <Card
                key={user.userId}
                onClick={() => navigate(`/users/${user.userId}`)}
                className="cursor-pointer hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-12 h-12 bg-theme-bg-secondary rounded-full flex items-center justify-center flex-shrink-0">
                    <Users className="w-6 h-6 text-theme-text-tertiary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-theme-text-primary truncate">{user.email}</h3>
                    <p className="text-xs text-theme-text-tertiary">
                      {t('analytics.lastActive', 'Last active: {{date}}', {
                        date: formatDate(user.lastActive),
                      })}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-theme-text-secondary">
                      {t('analytics.sessions', 'Sessions')}
                    </span>
                    <span className="font-medium text-theme-text-primary">{user.sessionCount}</span>
                  </div>

                  <div className="pt-2 border-t border-theme-border-default">
                    <div className="flex items-center gap-2 mb-2">
                      <Globe className="w-4 h-4 text-theme-text-tertiary" />
                      <span className="text-xs text-theme-text-secondary">
                        {t('analytics.countries', 'Countries')}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {user.countries.slice(0, 5).map((country) => (
                        <LocationBadge key={country} countryCode={country} showText={false} />
                      ))}
                      {user.countries.length > 5 && (
                        <span className="text-xs text-theme-text-tertiary">
                          +{user.countries.length - 5}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-theme-border-default">
                    <div className="flex items-center gap-2 mb-2">
                      <Monitor className="w-4 h-4 text-theme-text-tertiary" />
                      <span className="text-xs text-theme-text-secondary">
                        {t('analytics.devices', 'Devices')}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {user.devices.map((device) => (
                        <span
                          key={device}
                          className="px-2 py-1 bg-theme-bg-secondary text-theme-text-primary text-xs rounded capitalize"
                        >
                          {device}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg border border-theme-border-default disabled:opacity-50 hover:bg-theme-bg-secondary"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="px-4 py-2 text-sm text-theme-text-secondary">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg border border-theme-border-default disabled:opacity-50 hover:bg-theme-bg-secondary"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
