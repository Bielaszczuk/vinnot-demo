import * as Clipboard from "expo-clipboard";

export async function copySupportReference(reference: string): Promise<void> {
  const copied = await Clipboard.setStringAsync(reference);
  if (!copied) throw new Error("CLIPBOARD_UNAVAILABLE");
}
