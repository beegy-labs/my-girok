/**
 * SharedSessionPage
 *
 * Public page for viewing shared session recordings
 */

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import apiClient from '../../api/client';

// TODO: Replace with @my-girok/tracking-sdk/react when available
const SessionPlayer = ({ events }: { events: unknown[] }) => (
  <div className="p-8 bg-theme-background-secondary rounded-lg text-center text-theme-text-secondary">
    Session Player (Coming Soon)
    <br />
    <span className="text-sm">{events?.length || 0} events recorded</span>
  </div>
);

interface SessionMetadata {
  sessionId: string;
  actorId?: string;
  actorEmail?: string;
  serviceSlug: string;
  startedAt: string;
  endedAt?: string;
  durationSeconds: number;
  totalEvents: number;
  pageViews: number;
  clicks: number;
  browser: string;
  os: string;
  deviceType: string;
  countryCode: string;
}

interface SessionData {
  sessionId: string;
  metadata: SessionMetadata;
  events: unknown[];
}

export default function SharedSessionPage() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSharedSession = async () => {
      if (!shareToken) {
        setError('Invalid share link');
        setLoading(false);
        return;
      }

      try {
        const response = await apiClient.get<SessionData>(`/recordings/shared/${shareToken}`);
        setSessionData(response.data);
      } catch (err) {
        console.error('Failed to load shared session:', err);
        setError('This share link is invalid or has expired');
      } finally {
        setLoading(false);
      }
    };

    fetchSharedSession();
  }, [shareToken]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-theme-background-primary">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-theme-text-secondary">Loading shared session...</p>
        </div>
      </div>
    );
  }

  if (error || !sessionData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-theme-background-primary">
        <div className="max-w-md w-full mx-4">
          <div className="bg-theme-background-secondary border border-theme-border-default rounded-lg p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-theme-text-primary mb-2">
              Unable to Load Session
            </h2>
            <p className="text-theme-text-secondary mb-4">
              {error || 'This share link is invalid or has expired'}
            </p>
            <p className="text-sm text-theme-text-tertiary">
              Share links may have an expiration time set by the administrator.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-theme-background-primary">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-theme-text-primary mb-2">Shared Session</h1>
          <div className="flex items-center gap-4 text-sm text-theme-text-secondary">
            <span>Service: {sessionData.metadata.serviceSlug}</span>
            <span>•</span>
            <span>
              Date:{' '}
              {new Date(sessionData.metadata.startedAt).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
            <span>•</span>
            <span>Duration: {Math.floor(sessionData.metadata.durationSeconds / 60)}m</span>
          </div>
        </div>

        {/* Session Player */}
        <div className="bg-theme-background-secondary border border-theme-border-default rounded-lg overflow-hidden">
          <SessionPlayer events={sessionData.events} />
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-theme-text-tertiary">
          <p>This is a read-only view of a shared session recording.</p>
        </div>
      </div>
    </div>
  );
}
