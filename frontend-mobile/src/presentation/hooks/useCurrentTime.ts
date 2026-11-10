import { useEffect, useState } from 'react';
import { applicationLifecycleService } from '@/application/services/applicationLifecycle.service';

export function useCurrentTime() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    // Timer/focus callbacks synchronize external wall-clock time, not derived UI state.
    // eslint-disable-next-line no-restricted-syntax
    const update = () => setNow(new Date());
    const interval = setInterval(update, 30_000);
    const unsubscribe = applicationLifecycleService.subscribe({ onFocus: update, onFocusLost: () => {} });
    return () => { clearInterval(interval); unsubscribe(); };
  }, []);
  return now;
}
