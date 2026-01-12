/**
 * SessionHeatmap Component
 *
 * Visualizes click tracking and user interaction patterns
 */

import { useMemo } from 'react';

export interface HeatmapPoint {
  x: number; // Percentage of viewport width (0-100)
  y: number; // Percentage of viewport height (0-100)
  intensity: number; // Click count or dwell time
}

export interface SessionHeatmapProps {
  points: HeatmapPoint[];
  width?: number;
  height?: number;
  radius?: number;
  maxIntensity?: number;
  colorStops?: string[];
}

export function SessionHeatmap({
  points,
  width = 800,
  height = 600,
  radius = 30,
  maxIntensity,
}: SessionHeatmapProps) {
  const canvas = useMemo(() => {
    if (typeof document === 'undefined') return null;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (!ctx) return null;

    // Calculate max intensity if not provided
    const actualMaxIntensity = maxIntensity || Math.max(...points.map((p) => p.intensity), 1);

    // Draw each point
    points.forEach((point) => {
      const x = (point.x / 100) * width;
      const y = (point.y / 100) * height;
      const normalizedIntensity = point.intensity / actualMaxIntensity;

      // Create radial gradient
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);

      // Add color stops based on intensity
      const alpha = normalizedIntensity;
      gradient.addColorStop(0, `rgba(255, 0, 0, ${alpha})`);
      gradient.addColorStop(0.5, `rgba(255, 255, 0, ${alpha * 0.5})`);
      gradient.addColorStop(1, 'rgba(0, 255, 0, 0)');

      ctx.fillStyle = gradient;
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    });

    return canvas;
  }, [points, width, height, radius, maxIntensity]);

  const imageDataUrl = useMemo(() => {
    return canvas?.toDataURL();
  }, [canvas]);

  return (
    <div className="relative" style={{ width, height }}>
      {imageDataUrl && points.length > 0 ? (
        <img
          src={imageDataUrl}
          alt="Session heatmap"
          className="absolute inset-0 w-full h-full object-contain"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-theme-background-secondary text-theme-text-tertiary">
          No data
        </div>
      )}
    </div>
  );
}

/**
 * Click Heatmap with Legend
 */
export interface ClickHeatmapProps {
  points: HeatmapPoint[];
  backgroundImage?: string;
  width?: number;
  height?: number;
}

export function ClickHeatmap({
  points,
  backgroundImage,
  width = 800,
  height = 600,
}: ClickHeatmapProps) {
  const maxIntensity = Math.max(...points.map((p) => p.intensity), 1);

  return (
    <div className="space-y-4">
      {/* Heatmap */}
      <div className="relative border border-theme-border-default rounded-lg overflow-hidden">
        {backgroundImage && (
          <img
            src={backgroundImage}
            alt="Background"
            className="absolute inset-0 w-full h-full object-contain"
          />
        )}
        <div className="relative">
          <SessionHeatmap
            points={points}
            width={width}
            height={height}
            maxIntensity={maxIntensity}
          />
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-sm">
        <span className="text-theme-text-secondary">Intensity:</span>
        <div className="flex items-center gap-2">
          <div className="flex h-6 rounded overflow-hidden border border-theme-border-default">
            <div className="w-12 bg-gradient-to-r from-green-500 to-yellow-500" />
            <div className="w-12 bg-gradient-to-r from-yellow-500 to-red-500" />
          </div>
          <span className="text-theme-text-tertiary">Low → High</span>
        </div>
        <div className="ml-auto text-theme-text-tertiary">
          {points.length} clicks · Max: {maxIntensity}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-3 bg-theme-background-secondary rounded-lg">
          <div className="text-2xl font-bold text-theme-text-primary">{points.length}</div>
          <div className="text-sm text-theme-text-secondary">Total Clicks</div>
        </div>
        <div className="p-3 bg-theme-background-secondary rounded-lg">
          <div className="text-2xl font-bold text-theme-text-primary">{maxIntensity}</div>
          <div className="text-sm text-theme-text-secondary">Max Clicks (Single Point)</div>
        </div>
        <div className="p-3 bg-theme-background-secondary rounded-lg">
          <div className="text-2xl font-bold text-theme-text-primary">
            {(points.reduce((sum, p) => sum + p.intensity, 0) / points.length || 0).toFixed(1)}
          </div>
          <div className="text-sm text-theme-text-secondary">Avg Clicks per Point</div>
        </div>
      </div>
    </div>
  );
}

/**
 * Scroll Depth Heatmap
 */
export interface ScrollDepthProps {
  depths: number[]; // Array of scroll depths (0-100%)
  pageHeight: number;
}

export function ScrollDepthHeatmap({ depths }: ScrollDepthProps) {
  const buckets = useMemo(() => {
    const bucketCount = 20;
    const buckets = new Array(bucketCount).fill(0);

    depths.forEach((depth) => {
      const bucketIndex = Math.min(Math.floor((depth / 100) * bucketCount), bucketCount - 1);
      buckets[bucketIndex]++;
    });

    return buckets;
  }, [depths]);

  const maxCount = Math.max(...buckets, 1);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-theme-text-primary">Scroll Depth Analysis</h3>

      <div className="flex items-end gap-1 h-48">
        {buckets.map((count, index) => {
          const heightPercent = (count / maxCount) * 100;
          const depthPercent = ((index + 1) / buckets.length) * 100;

          return (
            <div key={index} className="flex-1 relative group" style={{ height: '100%' }}>
              <div
                className="absolute bottom-0 w-full bg-gradient-to-t from-blue-500 to-blue-300 rounded-t transition-all hover:opacity-80"
                style={{ height: `${heightPercent}%` }}
              />
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-theme-background-primary px-2 py-1 rounded border border-theme-border-default text-xs whitespace-nowrap">
                {count} users · {depthPercent.toFixed(0)}%
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-sm text-theme-text-tertiary">
        <span>0% (Top)</span>
        <span>50%</span>
        <span>100% (Bottom)</span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 bg-theme-background-secondary rounded-lg">
          <div className="text-2xl font-bold text-theme-text-primary">{depths.length}</div>
          <div className="text-sm text-theme-text-secondary">Total Sessions</div>
        </div>
        <div className="p-3 bg-theme-background-secondary rounded-lg">
          <div className="text-2xl font-bold text-theme-text-primary">
            {depths.length > 0
              ? (depths.reduce((sum, d) => sum + d, 0) / depths.length).toFixed(1)
              : '0.0'}
            %
          </div>
          <div className="text-sm text-theme-text-secondary">Avg Scroll Depth</div>
        </div>
      </div>
    </div>
  );
}
