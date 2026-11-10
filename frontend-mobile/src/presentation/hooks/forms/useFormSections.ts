import { useCallback, useState } from "react";
import type { FieldErrors, FieldValues } from "react-hook-form";

/**
 * Collapsible form sections: a section opens on demand, and any section holding a
 * validation error opens itself and is flagged until the error is fixed.
 */
export function useFormSections<S extends string, T extends FieldValues>(
  errors: FieldErrors<T>,
  sectionOf: (field: string) => S,
  initiallyOpen: readonly S[],
) {
  const [expanded, setExpanded] = useState<readonly S[]>(initiallyOpen);
  const invalid = new Set(Object.keys(errors).map(sectionOf));
  const toggle = useCallback(
    (id: S) =>
      setExpanded((current) =>
        current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
      ),
    [],
  );
  const reset = useCallback(() => setExpanded(initiallyOpen), [initiallyOpen]);
  const section = (id: S) => ({
    open: expanded.includes(id) || invalid.has(id),
    invalid: invalid.has(id),
    onToggle: () => toggle(id),
  });
  return { section, reset, hasErrors: invalid.size > 0 };
}
