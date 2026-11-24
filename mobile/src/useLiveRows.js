import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { supabase } from './data/backend';

export function useLiveRows(table, filter, refresh, enabled) {
  const focused = useIsFocused();
  useEffect(() => {
    if (!focused || !enabled || !supabase) return;
    const update = () => {
      if (AppState.currentState !== 'background' && AppState.currentState !== 'inactive') refresh();
    };
    const channel = supabase.channel(`updates-${table}-${filter || 'inbox'}-${Math.random()}`)
      .on('postgres_changes', { schema: 'public', table, event: '*', ...(filter ? { filter } : {}) }, update)
      .subscribe();
    const fallback = setInterval(update, 30000);
    const foreground = AppState.addEventListener('change', state => { if (state === 'active') refresh(); });
    return () => {
      foreground.remove();
      clearInterval(fallback);
      void supabase.removeChannel(channel);
    };
  }, [enabled, filter, focused, refresh, table]);
}
