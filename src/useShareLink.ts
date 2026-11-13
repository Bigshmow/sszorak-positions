import { useEffect, useState } from 'react';
import { shareUrl, type SharedState } from './share';

export type CopyStatus = 'idle' | 'copied' | 'failed';

const URL_SYNC_DELAY_MS = 300;
const STATUS_RESET_MS = 2500;

function syncAddressBar(state: SharedState): string {
  const url = shareUrl(state);
  if (url !== window.location.href) {
    try {
      window.history.replaceState(null, '', url);
    } catch {
      /* browser rate-limited history updates */
    }
  }
  return url;
}

export function useShareLink(state: SharedState) {
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle');
  const { assignments, positions } = state;

  useEffect(() => {
    const timer = setTimeout(() => syncAddressBar({ assignments, positions }), URL_SYNC_DELAY_MS);
    return () => clearTimeout(timer);
  }, [assignments, positions]);

  useEffect(() => {
    if (copyStatus === 'idle') return;
    const timer = setTimeout(() => setCopyStatus('idle'), STATUS_RESET_MS);
    return () => clearTimeout(timer);
  }, [copyStatus]);

  const copyLink = async () => {
    const url = syncAddressBar({ assignments, positions });
    try {
      await navigator.clipboard.writeText(url);
      setCopyStatus('copied');
    } catch {
      setCopyStatus('failed');
    }
  };

  return { copyStatus, copyLink };
}
