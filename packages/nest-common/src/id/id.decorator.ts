import { ID } from './uuidv7.generator';

/**
 * Property decorator that auto-generates UUIDv7 if not set
 *
 * @example
 * class CreateEventDto {
 *   @GenerateId()
 *   id: string;
 *
 *   eventName: string;
 * }
 */
export function GenerateId(): PropertyDecorator {
  return function (target: object, propertyKey: string | symbol) {
    const key = Symbol(`__${String(propertyKey)}__`);

    Object.defineProperty(target, propertyKey, {
      get(this: Record<symbol, string>) {
        if (!this[key]) {
          this[key] = ID.generate();
        }
        return this[key];
      },
      set(this: Record<symbol, string>, value: string) {
        this[key] = value || ID.generate();
      },
      enumerable: true,
      configurable: true,
    });
  };
}
