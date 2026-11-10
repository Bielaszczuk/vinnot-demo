import type { ComponentProps } from "react";
import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";
import { TextField } from "@/presentation/components/ui/TextField";

type StringPath<T extends FieldValues> = {
  [K in Path<T>]: T[K & keyof T] extends string ? K : never;
}[Path<T>];

/** A TextField bound to a string field of a react-hook-form form, with its inline error. */
export function FormTextField<T extends FieldValues>({
  control,
  name,
  ...props
}: { control: Control<T>; name: StringPath<T> } & Omit<
  ComponentProps<typeof TextField>,
  "value" | "onChangeText" | "error"
>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <TextField
          {...props}
          ref={field.ref}
          value={field.value as string}
          onChangeText={field.onChange}
          onBlur={field.onBlur}
          error={fieldState.error?.message}
        />
      )}
    />
  );
}
