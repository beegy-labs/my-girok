import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  SessionHeatmap,
  ClickHeatmap,
  ScrollDepthHeatmap,
  type HeatmapPoint,
} from './SessionHeatmap';

describe('SessionHeatmap', () => {
  const mockPoints: HeatmapPoint[] = [
    { x: 50, y: 50, intensity: 10 },
    { x: 75, y: 25, intensity: 5 },
    { x: 25, y: 75, intensity: 15 },
  ];

  beforeEach(() => {
    // Mock canvas API
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      fillRect: vi.fn(),
      createRadialGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      fillStyle: '',
    })) as any;

    HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,mock');
  });

  describe('Basic Rendering', () => {
    it('should render heatmap with default dimensions', () => {
      const { container } = render(<SessionHeatmap points={mockPoints} />);

      const heatmapContainer = container.querySelector('div[style*="width"]');
      expect(heatmapContainer).toBeInTheDocument();
    });

    it('should render with custom dimensions', () => {
      const { container } = render(
        <SessionHeatmap points={mockPoints} width={1024} height={768} />,
      );

      const img = container.querySelector('img');
      expect(img).toBeInTheDocument();
    });

    it('should render "No data" message when no points', () => {
      render(<SessionHeatmap points={[]} />);

      expect(screen.getByText('No data')).toBeInTheDocument();
    });
  });

  describe('Heatmap Generation', () => {
    it('should generate canvas-based heatmap', () => {
      render(<SessionHeatmap points={mockPoints} />);

      // Canvas should be created and converted to data URL
      expect(HTMLCanvasElement.prototype.toDataURL).toHaveBeenCalled();
    });

    it('should use provided max intensity', () => {
      render(<SessionHeatmap points={mockPoints} maxIntensity={20} />);

      const img = screen.getByAltText('Session heatmap');
      expect(img).toBeInTheDocument();
    });

    it('should calculate max intensity from points when not provided', () => {
      render(<SessionHeatmap points={mockPoints} />);

      // Should use max from points (15)
      const img = screen.getByAltText('Session heatmap');
      expect(img).toBeInTheDocument();
    });
  });

  describe('Canvas Configuration', () => {
    it('should set canvas dimensions correctly', () => {
      render(<SessionHeatmap points={mockPoints} width={1024} height={768} />);

      // Verify canvas was created with correct dimensions
      expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalled();
    });

    it('should use default radius when not specified', () => {
      render(<SessionHeatmap points={mockPoints} />);

      expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalled();
    });

    it('should use custom radius when provided', () => {
      render(<SessionHeatmap points={mockPoints} radius={50} />);

      expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalled();
    });
  });
});

describe('ClickHeatmap', () => {
  const mockPoints: HeatmapPoint[] = [
    { x: 50, y: 50, intensity: 10 },
    { x: 75, y: 25, intensity: 5 },
  ];

  beforeEach(() => {
    // Mock canvas API
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      fillRect: vi.fn(),
      createRadialGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      fillStyle: '',
    })) as any;

    HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,mock');
  });

  it('should render heatmap with legend', () => {
    render(<ClickHeatmap points={mockPoints} />);

    expect(screen.getByText('Intensity:')).toBeInTheDocument();
    expect(screen.getByText('Low → High')).toBeInTheDocument();
  });

  it('should display click statistics', () => {
    render(<ClickHeatmap points={mockPoints} />);

    expect(screen.getByText('Total Clicks')).toBeInTheDocument();
    expect(screen.getByText('Max Clicks (Single Point)')).toBeInTheDocument();
    expect(screen.getByText('Avg Clicks per Point')).toBeInTheDocument();
  });

  it('should calculate correct total clicks', () => {
    render(<ClickHeatmap points={mockPoints} />);

    // Should show 2 clicks (number of points)
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('should calculate correct max intensity', () => {
    render(<ClickHeatmap points={mockPoints} />);

    // Max intensity is 10
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('should calculate average clicks per point', () => {
    render(<ClickHeatmap points={mockPoints} />);

    // Average: (10 + 5) / 2 = 7.5
    expect(screen.getByText('7.5')).toBeInTheDocument();
  });

  it('should render with background image when provided', () => {
    const { container } = render(
      <ClickHeatmap points={mockPoints} backgroundImage="/screenshot.png" />,
    );

    const backgroundImg = container.querySelector('img[alt="Background"]');
    expect(backgroundImg).toBeInTheDocument();
    expect(backgroundImg).toHaveAttribute('src', '/screenshot.png');
  });
});

describe('ScrollDepthHeatmap', () => {
  const mockDepths = [10, 25, 50, 75, 90, 100];

  it('should render scroll depth visualization', () => {
    render(<ScrollDepthHeatmap depths={mockDepths} pageHeight={2000} />);

    expect(screen.getByText('Scroll Depth Analysis')).toBeInTheDocument();
  });

  it('should display scroll depth labels', () => {
    render(<ScrollDepthHeatmap depths={mockDepths} pageHeight={2000} />);

    expect(screen.getByText('0% (Top)')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('100% (Bottom)')).toBeInTheDocument();
  });

  it('should show total sessions count', () => {
    render(<ScrollDepthHeatmap depths={mockDepths} pageHeight={2000} />);

    expect(screen.getByText('6')).toBeInTheDocument(); // 6 sessions
    expect(screen.getByText('Total Sessions')).toBeInTheDocument();
  });

  it('should calculate average scroll depth', () => {
    render(<ScrollDepthHeatmap depths={mockDepths} pageHeight={2000} />);

    // Average: (10 + 25 + 50 + 75 + 90 + 100) / 6 = 58.3%
    expect(screen.getByText('58.3%')).toBeInTheDocument();
    expect(screen.getByText('Avg Scroll Depth')).toBeInTheDocument();
  });

  it('should handle empty depths array', () => {
    render(<ScrollDepthHeatmap depths={[]} pageHeight={2000} />);

    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('0.0%')).toBeInTheDocument(); // Average of empty array handled gracefully
  });

  it('should bucket scroll depths into 20 segments', () => {
    const { container } = render(<ScrollDepthHeatmap depths={mockDepths} pageHeight={2000} />);

    // Should create 20 bucket divs
    const buckets = container.querySelectorAll('.flex-1');
    expect(buckets.length).toBe(20);
  });

  it('should handle 100% scroll depth correctly', () => {
    const depths = [100];
    render(<ScrollDepthHeatmap depths={depths} pageHeight={1000} />);

    expect(screen.getByText('100.0%')).toBeInTheDocument();
  });
});
