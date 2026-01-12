import { record, type eventWithTime, type recordOptions } from 'rrweb';
import type {
  TrackingConfig,
  TrackingSDK,
  SessionMetadata,
  RecordingEventBatch,
  CustomEvent,
  PageViewEvent,
  RecordingState,
  ActorInfo,
} from './types.js';
import { generateSessionId, getDeviceInfo, generateFingerprint } from './utils.js';

/**
 * Session Recording Tracker
 * Uses rrweb to record DOM mutations and replay them later
 */
export class Tracker implements TrackingSDK {
  private config: TrackingConfig | null = null;
  private sessionId: string | null = null;
  private sessionMetadata: SessionMetadata | null = null;
  private events: eventWithTime[] = [];
  private sequenceNumber = 0;
  private state: RecordingState = 'idle';
  private stopFn: (() => void) | undefined = undefined;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  /** Tracks page view start time for duration calculation */
  private _pageStartTime: number = 0;

  async init(config: TrackingConfig): Promise<void> {
    this.config = config;
    this.sessionId = config.sessionId || generateSessionId();

    const deviceInfo = getDeviceInfo();
    this.sessionMetadata = {
      sessionId: this.sessionId,
      startedAt: new Date().toISOString(),
      actorId: config.actor?.id,
      actorType: config.actor?.type,
      actorEmail: config.actor?.email,
      serviceSlug: config.service?.slug,
      browser: deviceInfo.browser,
      os: deviceInfo.os,
      deviceType: deviceInfo.deviceType,
      screenResolution: deviceInfo.screenResolution,
      timezone: deviceInfo.timezone,
      language: deviceInfo.language,
      userAgent: navigator.userAgent,
      deviceFingerprint: await generateFingerprint(),
    };

    // Send session start event
    await this.sendSessionStart();

    if (this.config.debug) {
      console.log('[TrackingSDK] Initialized', { sessionId: this.sessionId });
    }
  }

  startRecording(): void {
    if (!this.config) {
      throw new Error('Tracker not initialized. Call init() first.');
    }

    if (this.state === 'recording') {
      return;
    }

    const recordOptions: recordOptions<eventWithTime> = {
      emit: (event) => {
        this.handleEvent(event);
      },
      maskTextSelector: this.config.privacy?.maskInputSelectors?.join(',') || undefined,
      blockSelector: this.config.privacy?.blockSelectors?.join(',') || undefined,
      ignoreSelector: this.config.privacy?.ignoreSelectors?.join(',') || undefined,
      maskAllInputs: this.config.privacy?.maskTextInput ?? true,
      sampling: {
        // Reduce payload size with sampling
        mousemove: 50,
        mouseInteraction: true,
        scroll: 150,
        media: 800,
        input: 'last',
      },
    };

    this.stopFn = record(recordOptions);
    this.state = 'recording';

    // Set up auto-flush
    const flushInterval = this.config.batching?.flushInterval ?? 10000;
    this.flushTimer = setInterval(() => {
      void this.flush();
    }, flushInterval);

    // Track initial page view
    this.trackPageView();

    if (this.config.debug) {
      console.log('[TrackingSDK] Recording started');
    }
  }

  pauseRecording(): void {
    if (this.state !== 'recording') {
      return;
    }

    // rrweb doesn't have native pause, we just stop emitting
    this.state = 'paused';

    if (this.config?.debug) {
      console.log('[TrackingSDK] Recording paused');
    }
  }

  resumeRecording(): void {
    if (this.state !== 'paused') {
      return;
    }

    this.state = 'recording';

    if (this.config?.debug) {
      console.log('[TrackingSDK] Recording resumed');
    }
  }

  async stopRecording(): Promise<void> {
    if (this.state === 'idle' || this.state === 'stopped') {
      return;
    }

    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    if (this.stopFn) {
      this.stopFn();
      this.stopFn = undefined;
    }

    // Flush remaining events
    await this.flush();

    // Send session end event
    await this.sendSessionEnd();

    this.state = 'stopped';

    if (this.config?.debug) {
      console.log('[TrackingSDK] Recording stopped');
    }
  }

  trackEvent(event: CustomEvent): void {
    if (!this.config || !this.sessionId) {
      return;
    }

    const customEvent = {
      type: 'custom' as const,
      timestamp: Date.now(),
      data: {
        tag: 'custom-event',
        payload: event,
      },
    };

    this.sendCustomEvent(customEvent);
  }

  trackPageView(event?: Partial<PageViewEvent>): void {
    if (!this.config || !this.sessionId) {
      return;
    }

    const pageView: PageViewEvent = {
      path: event?.path || window.location.pathname,
      title: event?.title || document.title,
      referrer: event?.referrer || document.referrer,
      timestamp: new Date().toISOString(),
    };

    this.sendPageView(pageView);
    this._pageStartTime = Date.now();
  }

  setActor(actor: ActorInfo): void {
    if (this.config) {
      this.config.actor = actor;
    }

    if (this.sessionMetadata) {
      this.sessionMetadata.actorId = actor.id;
      this.sessionMetadata.actorType = actor.type;
      this.sessionMetadata.actorEmail = actor.email;
    }
  }

  getSessionId(): string | null {
    return this.sessionId;
  }

  getState(): RecordingState {
    return this.state;
  }

  /** Get time since last page view (for analytics) */
  getPageViewDuration(): number {
    return this._pageStartTime > 0 ? Date.now() - this._pageStartTime : 0;
  }

  async flush(): Promise<void> {
    if (this.events.length === 0) {
      return;
    }

    const eventsToSend = [...this.events];
    this.events = [];

    const batch: RecordingEventBatch = {
      sessionId: this.sessionId!,
      sequenceStart: this.sequenceNumber - eventsToSend.length,
      sequenceEnd: this.sequenceNumber - 1,
      events: eventsToSend,
      timestamp: new Date().toISOString(),
    };

    await this.sendBatch(batch);
  }

  destroy(): void {
    void this.stopRecording();
    this.config = null;
    this.sessionId = null;
    this.sessionMetadata = null;
    this.events = [];
    this.sequenceNumber = 0;
    this.state = 'idle';
  }

  private handleEvent(event: eventWithTime): void {
    if (this.state !== 'recording') {
      return;
    }

    this.events.push(event);
    this.sequenceNumber++;

    const maxEvents = this.config?.batching?.maxEvents ?? 50;
    if (this.events.length >= maxEvents) {
      void this.flush();
    }
  }

  private async sendBatch(batch: RecordingEventBatch): Promise<void> {
    if (!this.config?.endpoint) {
      return;
    }

    try {
      const response = await fetch(`${this.config.endpoint}/recordings/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(batch),
      });

      if (!response.ok) {
        throw new Error(`Failed to send batch: ${response.status}`);
      }

      if (this.config.debug) {
        console.log('[TrackingSDK] Batch sent', { events: batch.events.length });
      }
    } catch (error) {
      console.error('[TrackingSDK] Failed to send batch', error);
      // Re-add events for retry
      this.events = [...batch.events, ...this.events];
    }
  }

  private async sendSessionStart(): Promise<void> {
    if (!this.config?.endpoint || !this.sessionMetadata) {
      return;
    }

    try {
      await fetch(`${this.config.endpoint}/recordings/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'start',
          ...this.sessionMetadata,
        }),
      });
    } catch (error) {
      console.error('[TrackingSDK] Failed to send session start', error);
    }
  }

  private async sendSessionEnd(): Promise<void> {
    if (!this.config?.endpoint || !this.sessionId) {
      return;
    }

    try {
      await fetch(`${this.config.endpoint}/recordings/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'end',
          sessionId: this.sessionId,
          endedAt: new Date().toISOString(),
          duration: Date.now() - new Date(this.sessionMetadata?.startedAt || Date.now()).getTime(),
        }),
      });
    } catch (error) {
      console.error('[TrackingSDK] Failed to send session end', error);
    }
  }

  private sendCustomEvent(event: unknown): void {
    if (!this.config?.endpoint || !this.sessionId) {
      return;
    }

    // Fire and forget for custom events
    void fetch(`${this.config.endpoint}/recordings/events/custom`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        sessionId: this.sessionId,
        event,
        timestamp: new Date().toISOString(),
      }),
    }).catch((error) => {
      console.error('[TrackingSDK] Failed to send custom event', error);
    });
  }

  private sendPageView(pageView: PageViewEvent): void {
    if (!this.config?.endpoint || !this.sessionId) {
      return;
    }

    void fetch(`${this.config.endpoint}/recordings/pageviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        sessionId: this.sessionId,
        ...pageView,
        actorId: this.config.actor?.id,
        serviceSlug: this.config.service?.slug,
      }),
    }).catch((error) => {
      console.error('[TrackingSDK] Failed to send page view', error);
    });
  }
}

// Singleton instance
let trackerInstance: Tracker | null = null;

/**
 * Get or create tracker instance
 */
export function getTracker(): Tracker {
  if (!trackerInstance) {
    trackerInstance = new Tracker();
  }
  return trackerInstance;
}

/**
 * Reset tracker instance (for testing)
 */
export function resetTracker(): void {
  if (trackerInstance) {
    trackerInstance.destroy();
    trackerInstance = null;
  }
}
