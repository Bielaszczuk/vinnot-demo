import { AuthApiError, authService } from "./auth.service";
import { authSessionService } from "./authSession.service";

type Tokens = Awaited<ReturnType<typeof authService.refreshToken>>;
interface RenewalContext {
  owner: object;
  generation: number;
  assertCurrent: () => void;
}
const pending = new WeakMap<object, { generation: number; token: string; promise: Promise<Tokens> }>();

async function rotate(token: string, assertCurrent: () => void): Promise<Tokens> {
  assertCurrent();
  let rotationId: string;
  try {
    // Persist the operation before spending a single-use credential. A cold start
    // can repeat this operation if the response or final keychain write is lost.
    rotationId = await authSessionService.prepareRotation(token, assertCurrent);
  } catch {
    assertCurrent();
    throw new AuthApiError("Session storage temporarily unavailable", 0, false);
  }
  assertCurrent();
  const tokens = await authService.refreshToken(token, rotationId);
  assertCurrent();
  try {
    await authSessionService.completeRotation(token, rotationId,
      tokens.accessToken, tokens.refreshToken, assertCurrent);
  } catch {
    // Keep the previous in-memory snapshot consistent with the recoverable journal.
    assertCurrent();
    throw new AuthApiError("Session storage temporarily unavailable", 0, false);
  }
  assertCurrent();
  return tokens;
}

export const sessionRenewalService = {
  forget(owner: object): void { pending.delete(owner); },
  renew(token: string, context: RenewalContext): Promise<Tokens> {
    const current = pending.get(context.owner);
    if (current?.generation === context.generation && current.token === token) return current.promise;
    // Retain the committed result until the store moves to another token. A late
    // caller may still hold the parent between durable commit and state publication.
    const promise = rotate(token, context.assertCurrent).catch((error: unknown) => {
      if (pending.get(context.owner)?.promise === promise) pending.delete(context.owner);
      throw error;
    });
    pending.set(context.owner, { generation: context.generation, token, promise });
    return promise;
  },
};
