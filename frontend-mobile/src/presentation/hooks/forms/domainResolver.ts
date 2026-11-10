import type { FieldErrors, FieldValues, Resolver } from "react-hook-form";

export type DomainFieldError<T> = { field: keyof T & string; code: string };

/**
 * Turns a framework-free domain validator into a react-hook-form resolver. Each field shows
 * its first error, translated by `message`.
 */
export function domainResolver<T extends FieldValues>(
  validate: (values: T) => DomainFieldError<T>[],
  message: (code: string) => string,
): Resolver<T> {
  return (values) => {
    const errors: Record<string, { type: string; message: string }> = {};
    for (const error of validate(values)) {
      errors[error.field] ??= { type: "validate", message: message(error.code) };
    }
    if (Object.keys(errors).length === 0) return { values, errors: {} };
    return { values: {}, errors: errors as FieldErrors<T> };
  };
}
