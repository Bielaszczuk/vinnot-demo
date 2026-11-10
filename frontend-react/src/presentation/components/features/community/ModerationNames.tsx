/**
 * Who and what a moderation item is about, as names the server resolved.
 * A field whose value is null or empty is hidden: ids are never shown instead.
 */
export function ModerationNames({
  fields,
}: {
  fields: ReadonlyArray<readonly [label: string, value: string | null | undefined]>;
}) {
  const shown = fields.filter(([, value]) => !!value);
  if (shown.length === 0) return null;
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
      {shown.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-gray-500">{label}</dt>
          <dd className="break-words font-medium">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
