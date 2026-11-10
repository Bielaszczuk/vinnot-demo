/**
 * Object utility functions
 */

/**
 * Check if a value is null or undefined
 */
export function isNullish<T>(value: T | null | undefined): value is null | undefined {
  return value === null || value === undefined
}

/**
 * Check if a value is not null or undefined
 */
export function nonNull<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined
}

/**
 * Return the value if not nullish, otherwise return the default
 */
export function defaultTo<T>(value: T | null | undefined, defaultValue: T): T {
  return isNullish(value) ? defaultValue : value
}

/**
 * Remove null and undefined values from an object
 */
export function removeNullish<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const result: Partial<T> = {}
  for (const key of Object.keys(obj) as (keyof T)[]) {
    if (!isNullish(obj[key])) {
      result[key] = obj[key]
    }
  }
  return result
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

/**
 * Check if two objects are deeply equal
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

/**
 * Pick specific keys from an object
 */
export function pick<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key]
    }
  }
  return result
}

/**
 * Omit specific keys from an object
 */
export function omit<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj }
  for (const key of keys) {
    delete result[key]
  }
  return result
}

/**
 * Check if an object is empty
 */
export function isEmpty(obj: Record<string, unknown>): boolean {
  return Object.keys(obj).length === 0
}

/**
 * Get a nested property from an object using dot notation
 */
export function get<T>(
  obj: Record<string, unknown>,
  path: string,
  defaultValue?: T
): T | undefined {
  const keys = path.split('.')
  let result: unknown = obj

  for (const key of keys) {
    if (result === null || result === undefined) {
      return defaultValue
    }
    result = (result as Record<string, unknown>)[key]
  }

  return (result as T) ?? defaultValue
}

/**
 * Set a nested property in an object using dot notation
 */
export function set<T extends Record<string, unknown>>(
  obj: T,
  path: string,
  value: unknown
): T {
  const keys = path.split('.')
  const result = { ...obj }
  let current: Record<string, unknown> = result

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]!
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {}
    }
    current = current[key] as Record<string, unknown>
  }

  const lastKey = keys[keys.length - 1]!
  current[lastKey] = value
  return result
}

