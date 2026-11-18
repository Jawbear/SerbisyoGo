import { useState } from 'react';
import { Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';
import { createSearchStore } from '../data/searchStore';
import { useAction, useData } from '../hooks';
import { Button, Card, Field, Muted, Notice, Query, s } from './ui';

const store = createSearchStore(AsyncStorage, randomUUID);

export default function SavedSearches({ place, categoryId, categoryName, apply }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [label, setLabel] = useState('');
  const [message, setMessage] = useState('');
  const action = useAction();
  const list = useData('saved-service-searches', store.getSavedPreferences, open);
  function reset() { setEditing(null); setDeleting(null); setLabel(''); }
  function change(task, confirmation) {
    setMessage('');
    return action.run(async () => {
      await task();
      reset(); setMessage(confirmation); list.retry();
    });
  }
  function save() {
    const input = { categoryId, categoryName, cityCode: place?.code, city: place?.name, label };
    return change(() => editing ? store.updatePreference(editing, input) : store.savePreference(input),
      editing ? 'Saved search updated.' : 'Search saved on this device.');
  }
  return <View style={s.stack}>
    <Button secondary title={open ? 'Close saved searches' : 'Saved searches'} onPress={() => { reset(); setMessage(''); setOpen(!open); }} />
    {open && <Card style={s.stack}>
      <Text style={s.sectionTitle}>{editing ? 'Edit saved search' : 'Saved searches'}</Text>
      <Muted>Save the service and municipality filters on this device. Anyone using this device can see them.</Muted>
      <Muted>{categoryName || 'Select a service'} · {place?.name || 'Choose a municipality above'}</Muted>
      <Field label="Search label (optional)" value={label} onChangeText={setLabel} maxLength={60} />
      <Button title={editing ? 'Update saved search' : 'Save search'} disabled={!place || !categoryName || action.busy} onPress={save} />
      {editing && <Button secondary title="Cancel edit" onPress={reset} />}
      {message ? <Notice>{message}</Notice> : null}
      {action.error ? <Notice error>{action.error}</Notice> : null}
      <Query query={list}>{list.data?.length ? list.data.map(row => <View key={row.id} style={s.stack}>
        {row.label ? <Text style={s.sectionTitle}>{row.label}</Text> : null}
        <Muted>{row.categoryName} · {row.city}</Muted>
        <View style={[s.row, { flexWrap: 'wrap' }]}>
          <Button secondary title="Apply" disabled={action.busy} onPress={() => { apply(row); reset(); setOpen(false); }} />
          <Button secondary title="Edit" disabled={action.busy} onPress={() => { apply(row); setEditing(row.id); setDeleting(null); setLabel(row.label); setMessage(''); }} />
          <Button secondary title="Delete" disabled={action.busy} onPress={() => { setDeleting(row.id); setMessage(''); }} />
        </View>
        {deleting === row.id && <><Muted>Delete this saved search from this device?</Muted>
          <Button title="Confirm delete" disabled={action.busy} onPress={() => change(() => store.deletePreference(row.id), 'Saved search deleted.')} />
          <Button secondary title="Keep search" onPress={() => setDeleting(null)} />
        </>}
      </View>) : <Muted>No saved searches on this device.</Muted>}</Query>
    </Card>}
  </View>;
}
