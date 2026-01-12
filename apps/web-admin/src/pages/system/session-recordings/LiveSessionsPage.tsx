/**
 * LiveSessionsPage
 *
 * Real-time monitoring of active user sessions
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Activity, Users, Eye, Clock, MapPin, Monitor, Loader2 } from 'lucide-react';
import { Card } from '../../../components/atoms/Card';
import { useRealTimeSessions } from '../../../hooks/useRealTimeSessions';

interface LiveSession {
  sessionId: string;
  actorId?: string;
  actorEmail?: string;
  serviceSlug: string;
  startedAt: string;
  currentPage: string;
  location: string;
  deviceType: string;
  browser: string;
  eventCount: number;
  lastEventAt: string;
}

export default function LiveSessionsPage() {
  const { t } = useTranslation();
  const { sessions, isConnected, connectionError } = useRealTimeSessions();
  const [filter, setFilter] = useState<{
    service?: string;
    deviceType?: string;
  }>({});

  const filteredSessions = sessions.filter((session) => {
    if (filter.service && session.serviceSlug !== filter.service) return false;
    if (filter.deviceType && session.deviceType !== filter.deviceType) return false;
    return true;
  });

  const stats = {
    total: sessions.length,
    webApp: sessions.filter((s) => s.serviceSlug === 'web-app').length,
    webAdmin: sessions.filter((s) => s.serviceSlug === 'web-admin').length,
    mobile: sessions.filter((s) => s.deviceType === 'mobile').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-theme-text-primary">
          {t('sessions.liveTitle', 'Live Sessions')}
        </h1>
        <p className="mt-1 text-sm text-theme-text-secondary">
          {t('sessions.liveDescription', 'Monitor active user sessions in real-time')}
        </p>
      </div>

      {/* Connection Status */}
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-3 h-3 rounded-full ${
                isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
              }`}
            />
            <span className="text-sm font-medium text-theme-text-primary">
              {isConnected
                ? t('sessions.liveConnected', 'Connected - Receiving real-time updates')
                : t('sessions.liveDisconnected', 'Disconnected')}
            </span>
          </div>
          {connectionError && (
            <span className="text-sm text-theme-status-error-text">{connectionError}</span>
          )}
        </div>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
              <Users className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-theme-text-primary">{stats.total}</div>
              <div className="text-sm text-theme-text-secondary">
                {t('sessions.activeSessions', 'Active Sessions')}
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Monitor className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-theme-text-primary">{stats.webApp}</div>
              <div className="text-sm text-theme-text-secondary">
                {t('sessions.webApp', 'Web App')}
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Activity className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-theme-text-primary">{stats.webAdmin}</div>
              <div className="text-sm text-theme-text-secondary">
                {t('sessions.webAdmin', 'Admin')}
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Monitor className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-theme-text-primary">{stats.mobile}</div>
              <div className="text-sm text-theme-text-secondary">
                {t('sessions.mobile', 'Mobile')}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex items-center gap-4">
          <select
            value={filter.service || ''}
            onChange={(e) => setFilter({ ...filter, service: e.target.value || undefined })}
            className="px-3 py-2 border border-theme-border-default rounded-lg bg-theme-background-primary text-theme-text-primary text-sm"
          >
            <option value="">{t('sessions.allServices', 'All Services')}</option>
            <option value="web-app">{t('sessions.webApp', 'Web App')}</option>
            <option value="web-admin">{t('sessions.webAdmin', 'Admin')}</option>
          </select>

          <select
            value={filter.deviceType || ''}
            onChange={(e) => setFilter({ ...filter, deviceType: e.target.value || undefined })}
            className="px-3 py-2 border border-theme-border-default rounded-lg bg-theme-background-primary text-theme-text-primary text-sm"
          >
            <option value="">{t('sessions.allDevices', 'All Devices')}</option>
            <option value="desktop">{t('sessions.desktop', 'Desktop')}</option>
            <option value="mobile">{t('sessions.mobile', 'Mobile')}</option>
            <option value="tablet">{t('sessions.tablet', 'Tablet')}</option>
          </select>
        </div>
      </Card>

      {/* Session List */}
      <Card>
        <h2 className="text-lg font-semibold text-theme-text-primary mb-4">
          {t('sessions.liveList', 'Active Sessions')} ({filteredSessions.length})
        </h2>

        {filteredSessions.length === 0 ? (
          <div className="text-center py-12 text-theme-text-tertiary">
            {t('sessions.noLiveSessions', 'No active sessions')}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSessions.map((session) => (
              <div
                key={session.sessionId}
                className="p-4 border border-theme-border-default rounded-lg hover:bg-theme-background-secondary transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4 text-theme-text-tertiary" />
                        <span className="font-medium text-theme-text-primary">
                          {session.actorEmail || session.actorId || 'Anonymous'}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 bg-theme-background-tertiary text-theme-text-secondary text-xs rounded">
                        {session.serviceSlug}
                      </span>
                      <span className="px-2 py-0.5 bg-theme-background-tertiary text-theme-text-secondary text-xs rounded">
                        {session.deviceType}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-theme-text-secondary">
                      <div className="flex items-center gap-2">
                        <Monitor className="w-4 h-4" />
                        <span>{session.browser}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span>{session.location}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>
                          {Math.floor(
                            (Date.now() - new Date(session.startedAt).getTime()) / 1000 / 60,
                          )}
                          m ago
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4" />
                        <span>{session.eventCount} events</span>
                      </div>
                    </div>

                    <div className="mt-2 text-sm text-theme-text-tertiary">
                      {t('sessions.currentPage', 'Current page')}: {session.currentPage}
                    </div>
                  </div>

                  <button className="px-3 py-2 text-sm border border-theme-border-default rounded-lg hover:bg-theme-background-tertiary transition-colors">
                    {t('sessions.viewSession', 'View')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
