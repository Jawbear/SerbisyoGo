import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { useApp } from './AppContext';

export function useData(key, loader, enabled = true) {
  const { revision, mode } = useApp();
  const focused = useIsFocused();
  const [reload, setReload] = useState(0);
  const request = useMemo(() => ({ key, revision, mode, reload, focused, enabled }), [key, revision, mode, reload, focused, enabled]);
  const [settled, setSettled] = useState(null);
  useEffect(() => {
    if (!request.enabled || !request.focused) return;
    let alive = true;
    Promise.resolve().then(loader).then(
      data => { if (alive) setSettled({ request, data, error: '' }); },
      error => { if (alive) setSettled({ request, data: null, error: error.message || 'Unable to load this screen.' }); }
    );
    return () => { alive = false; };
    // The key contains every query input; changing an inline loader must not loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request]);
  return {
    data: settled?.request.key === key && settled?.request.mode === mode ? settled.data : null,
    loading: enabled && focused && settled?.request !== request,
    error: settled?.request === request ? settled.error : '',
    retry: useCallback(() => setReload(value => value + 1), [])
  };
}

export function useAction() {
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const run = async action => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { return await action(); }
    catch (failure) { setError(failure.message || 'This action could not be completed. Please try again.'); }
    finally { lock.current = false; setBusy(false); }
  };
  return { run, busy, error };
}
