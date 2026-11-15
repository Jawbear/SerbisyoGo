import { useState } from 'react';
import { Text } from 'react-native';
import { useApp } from '../AppContext';
import { useAction } from '../hooks';
import { money } from '../domain';
import { Button, Card, Field, Muted, Notice, s } from './ui';

export default function BookingActions({ booking: b }) {
  const { identity, api, refresh } = useApp(); const action = useAction();
  const [reason, setReason] = useState(''); const [labor, setLabor] = useState('');
  const provider = identity?.role === 'provider' && identity.user.id === b.provider_id;
  const customer = identity?.role === 'customer' && identity.user.id === b.customer_id;
  const next = provider ? { requested: 'confirmed', confirmed: 'en_route', en_route: 'in_progress', in_progress: 'completed' }[b.status] : null;
  const labels = { confirmed: 'Accept booking', en_route: 'Start travel', in_progress: 'Start service', completed: 'Complete service' };
  const cancel = (customer && ['requested', 'confirmed'].includes(b.status)) || (provider && ['requested', 'confirmed'].includes(b.status));
  async function change(status) { await api.transition(b.id, status, reason); refresh(); }
  return <Card style={s.stack}><Text style={s.sectionTitle}>Booking actions</Text>
    {b.is_estimate && b.status === 'requested' && <>
      {b.quoted_labor_centavos !== null && b.quoted_labor_centavos !== undefined && <Muted>Labor quotation: {money(b.quoted_labor_centavos)}. {b.quote_accepted ? 'Accepted.' : 'Awaiting customer acceptance.'}</Muted>}
      {provider && <><Field label="Labor quotation in pesos" value={labor} onChangeText={setLabor} keyboardType="decimal-pad" /><Button title="Send labor quotation" busy={action.busy} onPress={() => action.run(async () => {
        if (!/^\d+(\.\d{1,2})?$/.test(labor) || Number(labor) > 1000000) throw new Error('Enter a valid quotation in pesos.');
        await api.quote(b.id, Math.round(Number(labor) * 100)); refresh();
      })} /></>}
      {customer && b.quoted_labor_centavos != null && !b.quote_accepted && <Button title="Accept labor quotation" busy={action.busy} onPress={() => action.run(async () => { await api.quote(b.id, null, true); refresh(); })} />}
    </>}
    {next && <Button title={labels[next]} busy={action.busy} disabled={next === 'confirmed' && b.is_estimate && !b.quote_accepted} onPress={() => action.run(() => change(next))} />}
    {cancel && <><Field label="Reason for cancellation or decline" value={reason} onChangeText={setReason} multiline maxLength={1000} /><Button title={provider && b.status === 'requested' ? 'Decline request' : 'Cancel booking'} secondary busy={action.busy} onPress={() => action.run(async () => {
      if (reason.trim().length < 5) throw new Error('Enter a reason with at least 5 characters.');
      await change(provider && b.status === 'requested' ? 'declined' : 'cancelled');
    })} /></>}
    {!next && !cancel && <Muted>No status changes are available for this booking.</Muted>}
    {action.error && <Notice error>{action.error}</Notice>}
  </Card>;
}
