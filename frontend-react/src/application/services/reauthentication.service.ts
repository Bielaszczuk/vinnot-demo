import { authClient } from '@api/clients/auth.client'
import type { ReauthenticationRequestDto } from '@api/dto/auth.dto'

export type ReauthenticationProvider = 'GOOGLE' | 'APPLE'
export interface ProviderReauthenticationCredential { provider: ReauthenticationProvider; token: string; nonce?: string }

type Pending = { promise: Promise<string>; resolve: (proof: string) => void; reject: (error: Error) => void }
let pending: Pending | undefined
const listeners = new Set<() => void>()
const notify = () => listeners.forEach(listener => listener())

/** Presentation subscribes to a challenge; the transport receives only an opaque proof. */
export const reauthenticationService = {
  subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener) } },
  isRequired: () => Boolean(pending),
  request(): Promise<string> {
    if (pending) return pending.promise
    let resolve!: Pending['resolve']
    let reject!: Pending['reject']
    const promise = new Promise<string>((yes, no) => { resolve = yes; reject = no })
    pending = { promise, resolve, reject }
    notify()
    return promise
  },
  confirm(password: string): Promise<void> {
    return settle({ password })
  },
  /** A fresh Google ID token or Apple identity token of an identity linked to this account. */
  confirmWithProvider({ provider, token, nonce }: ProviderReauthenticationCredential): Promise<void> {
    return settle(nonce ? { provider, token, nonce } : { provider, token })
  },
  cancel(): void {
    const challenge = pending
    pending = undefined
    challenge?.reject(new Error('Identity confirmation cancelled'))
    notify()
  },
}

async function settle(credential: ReauthenticationRequestDto): Promise<void> {
  const challenge = pending
  if (!challenge) return
  const { proof } = await authClient.reauthenticate(credential)
  if (pending !== challenge) return
  pending = undefined
  challenge.resolve(proof)
  notify()
}
