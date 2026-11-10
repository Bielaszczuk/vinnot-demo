export async function copySupportReference(reference: string): Promise<void> {
  await navigator.clipboard.writeText(reference);
}
