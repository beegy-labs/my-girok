import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useToast } from './useToast';
import { toast } from 'sonner';

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

describe('useToast', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call toast.success with correct parameters', () => {
    const { result } = renderHook(() => useToast());

    result.current.showToast({
      type: 'success',
      title: 'Success',
      message: 'Operation completed',
      duration: 3000,
    });

    expect(toast.success).toHaveBeenCalledWith('Success', {
      description: 'Operation completed',
      duration: 3000,
    });
  });

  it('should call toast.error with correct parameters', () => {
    const { result } = renderHook(() => useToast());

    result.current.showToast({
      type: 'error',
      title: 'Error',
      message: 'Something went wrong',
    });

    expect(toast.error).toHaveBeenCalledWith('Error', {
      description: 'Something went wrong',
      duration: 4000, // default duration
    });
  });

  it('should call toast.info with correct parameters', () => {
    const { result } = renderHook(() => useToast());

    result.current.showToast({
      type: 'info',
      title: 'Info',
      message: 'Information message',
    });

    expect(toast.info).toHaveBeenCalledWith('Info', {
      description: 'Information message',
      duration: 4000,
    });
  });

  it('should call toast.warning with correct parameters', () => {
    const { result } = renderHook(() => useToast());

    result.current.showToast({
      type: 'warning',
      title: 'Warning',
      message: 'Warning message',
    });

    expect(toast.warning).toHaveBeenCalledWith('Warning', {
      description: 'Warning message',
      duration: 4000,
    });
  });

  it('should expose showToast function', () => {
    const { result } = renderHook(() => useToast());

    expect(result.current.showToast).toBeDefined();
    expect(typeof result.current.showToast).toBe('function');
  });

  it('should use default duration when not provided', () => {
    const { result } = renderHook(() => useToast());

    result.current.showToast({
      type: 'success',
      title: 'Test',
      message: 'Message',
    });

    expect(toast.success).toHaveBeenCalledWith('Test', {
      description: 'Message',
      duration: 4000,
    });
  });
});
