import { KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SENSOR_OPTIONS } from './constants';

/**
 * Shared DnD sensors hook for experience components
 * Eliminates duplicate useSensors definitions across files
 */
export function useDndSensors() {
  return useSensors(
    useSensor(PointerSensor, SENSOR_OPTIONS.pointer),
    useSensor(TouchSensor, SENSOR_OPTIONS.touch),
    useSensor(KeyboardSensor, SENSOR_OPTIONS.keyboard),
  );
}
