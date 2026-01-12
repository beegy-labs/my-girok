import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { MousePointer2, Eye, ScrollText, Keyboard, AlertCircle, Play } from 'lucide-react';

// rrweb event types
enum EventType {
  DomContentLoaded = 0,
  Load = 1,
  FullSnapshot = 2,
  IncrementalSnapshot = 3,
  Meta = 4,
  Custom = 5,
  Plugin = 6,
}

// rrweb incremental source types
enum IncrementalSource {
  Mutation = 0,
  MouseMove = 1,
  MouseInteraction = 2,
  Scroll = 3,
  ViewportResize = 4,
  Input = 5,
  TouchMove = 6,
  MediaInteraction = 7,
  StyleSheetRule = 8,
  CanvasMutation = 9,
  Font = 10,
  Log = 11,
  Drag = 12,
  StyleDeclaration = 13,
  Selection = 14,
  AdoptedStyleSheet = 15,
}

interface RRWebEvent {
  type: EventType;
  data: {
    source?: IncrementalSource;
    type?: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  };
  timestamp: number;
}

interface TimelineEvent {
  type: 'click' | 'scroll' | 'input' | 'pageview' | 'error' | 'start';
  timestamp: number;
  label: string;
  detail?: string;
}

interface EventTimelineProps {
  events: unknown[];
  startTime: number;
  className?: string;
  onSeek?: (timestamp: number) => void;
}

function parseEvents(events: unknown[], startTime: number): TimelineEvent[] {
  const timeline: TimelineEvent[] = [];
  const rrwebEvents = events as RRWebEvent[];

  // Add session start
  timeline.push({
    type: 'start',
    timestamp: startTime,
    label: 'Session Started',
  });

  for (const event of rrwebEvents) {
    if (event.type === EventType.IncrementalSnapshot && event.data) {
      const source = event.data.source;

      switch (source) {
        case IncrementalSource.MouseInteraction:
          // type 2 = click, type 0 = mouseup, type 1 = mousedown
          if (event.data.type === 2) {
            timeline.push({
              type: 'click',
              timestamp: event.timestamp,
              label: 'Click',
            });
          }
          break;
        case IncrementalSource.Scroll:
          timeline.push({
            type: 'scroll',
            timestamp: event.timestamp,
            label: 'Scroll',
          });
          break;
        case IncrementalSource.Input:
          timeline.push({
            type: 'input',
            timestamp: event.timestamp,
            label: 'Input',
            detail: event.data.text ? `"${event.data.text.slice(0, 20)}..."` : undefined,
          });
          break;
      }
    } else if (event.type === EventType.Custom && event.data) {
      const tag = event.data.tag;
      if (tag === 'pageview') {
        timeline.push({
          type: 'pageview',
          timestamp: event.timestamp,
          label: 'Page View',
          detail: event.data.payload?.url,
        });
      } else if (tag === 'error') {
        timeline.push({
          type: 'error',
          timestamp: event.timestamp,
          label: 'Error',
          detail: event.data.payload?.message,
        });
      }
    }
  }

  // Sort by timestamp and dedupe consecutive scroll events
  const sorted = timeline.sort((a, b) => a.timestamp - b.timestamp);
  const deduped: TimelineEvent[] = [];
  let lastScrollTime = 0;

  for (const event of sorted) {
    if (event.type === 'scroll') {
      // Only keep scroll events that are at least 500ms apart
      if (event.timestamp - lastScrollTime > 500) {
        deduped.push(event);
        lastScrollTime = event.timestamp;
      }
    } else {
      deduped.push(event);
    }
  }

  return deduped;
}

function formatTime(ms: number, startTime: number): string {
  const elapsed = Math.max(0, ms - startTime);
  const seconds = Math.floor(elapsed / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

const eventIcons: Record<TimelineEvent['type'], React.ReactNode> = {
  click: <MousePointer2 className="w-4 h-4" />,
  scroll: <ScrollText className="w-4 h-4" />,
  input: <Keyboard className="w-4 h-4" />,
  pageview: <Eye className="w-4 h-4" />,
  error: <AlertCircle className="w-4 h-4" />,
  start: <Play className="w-4 h-4" />,
};

const eventColors: Record<TimelineEvent['type'], string> = {
  click: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  scroll: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  input: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  pageview: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  start: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
};

export const EventTimeline = memo<EventTimelineProps>(
  ({ events, startTime, className = '', onSeek }) => {
    const { t } = useTranslation();

    const timelineEvents = useMemo(() => parseEvents(events, startTime), [events, startTime]);

    if (timelineEvents.length === 0) {
      return (
        <div className={`text-center py-8 text-theme-text-tertiary ${className}`}>
          {t('sessionRecordings.noEvents', 'No events recorded')}
        </div>
      );
    }

    return (
      <div className={`space-y-2 ${className}`}>
        <h4 className="text-sm font-medium text-theme-text-primary mb-3">
          {t('sessionRecordings.eventTimeline', 'Event Timeline')} ({timelineEvents.length})
        </h4>
        <div className="max-h-64 overflow-y-auto space-y-1 pr-2">
          {timelineEvents.map((event, index) => (
            <button
              key={`${event.type}-${event.timestamp}-${index}`}
              onClick={() => onSeek?.(event.timestamp)}
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-theme-bg-secondary transition-colors text-left"
            >
              <span className="text-xs text-theme-text-tertiary w-12 flex-shrink-0">
                {formatTime(event.timestamp, startTime)}
              </span>
              <span className={`p-1.5 rounded-full flex-shrink-0 ${eventColors[event.type]}`}>
                {eventIcons[event.type]}
              </span>
              <span className="flex-1 min-w-0">
                <span className="text-sm text-theme-text-primary">{event.label}</span>
                {event.detail && (
                  <span className="block text-xs text-theme-text-tertiary truncate">
                    {event.detail}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  },
);

EventTimeline.displayName = 'EventTimeline';
