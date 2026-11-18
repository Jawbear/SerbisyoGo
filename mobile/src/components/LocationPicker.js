import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Button, Chip, Muted, Notice, s } from './ui';
import { loadLocations, locationError } from '../data/locations';

export default function LocationPicker({ selected, onSelect }) {
  const [open, setOpen] = useState(false);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState(null);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    loadLocations(controller.signal).then(
      rows => { if (!controller.signal.aborted) setResult({ rows }); },
      () => { if (!controller.signal.aborted) setResult({ error: true }); }
    );
    return () => controller.abort();
  }, [open, revision]);
  function refresh() { setResult(null); setRevision(n => n + 1); }
  function toggle() { setResult(null); setOpen(!open); }
  return <View style={s.stack}>
    <Button secondary title={open ? 'Close location list' : selected ? 'Change municipality' : 'Choose municipality'} onPress={toggle} />
    {open && <>
      <Muted>Agusan del Sur · Philippine Standard Geographic Code via PSGC Cloud</Muted>
      {!result ? <View style={s.inline}><ActivityIndicator /><Muted>Loading available locations...</Muted></View>
        : result.error ? <Notice error>{locationError}</Notice>
        : result.rows.length ? <View style={[s.row, { flexWrap: 'wrap' }]}>{result.rows.map(place =>
          <Chip key={place.code} title={place.name} selected={selected?.code === place.code} onPress={() => { onSelect(place); setOpen(false); }} />
        )}</View> : <Muted>No locations available.</Muted>}
      {result && <Button secondary title={result.error ? 'Retry' : 'Refresh locations'} onPress={refresh} />}
    </>}
  </View>;
}
