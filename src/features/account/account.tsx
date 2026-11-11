'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useSession } from '@/components/session';
import { ActionButton, ButtonLink, Card, DataTable, Dialog, Field, MutationForm, Notice, PageHeading, QueryState, useQuery } from '@/components/ui';
import { list } from '@/lib/data';
import { rpc, requireDb, result } from '@/lib/backend';
import { addressSchema, profileSchema } from '@/lib/schemas';
import { manilaDate } from '@/lib/domain';
import { AccountAvatar, ProfilePhotoEditor } from './profile-photo';
import { AccountRoleBadge } from './role-badge';
export function Account() {
  const s = useSession();
  const q = useQuery('addresses-' + s.user?.id, () => list('addresses', {
    user_id: s.user!.id
  }), !!s.user);
  return <><PageHeading eyebrow="Your account" title="Keep your details up to date." description="Manage your contact information, saved addresses and preferences." /><Card className="account-identity"><AccountAvatar large /><div><h2>{s.profile?.full_name || 'Your account'}</h2><AccountRoleBadge /></div></Card><div className="grid-2"><div className="stack"><Card><h2>Personal information</h2><MutationForm submit="Save profile" onSubmit={async f => {
            const data = profileSchema.parse({
              full_name: f.get('full_name'),
              phone: f.get('phone')
            });
            await rpc('save_profile', {
              p_name: data.full_name,
              p_phone: data.phone,
              p_preferences: {
                booking_notifications: !!f.get('notifications')
              }
            });
          }}><Field label="Full name" name="full_name" defaultValue={String(s.profile?.full_name || '')} required minLength={2} maxLength={100} /><Field label="Philippine mobile number" name="phone" defaultValue={String(s.profile?.phone || '')} placeholder="09XXXXXXXXX" type="tel" required /><Field label="Email address" value={s.user?.email || ''} disabled /><label className="check-field"><input type="checkbox" name="notifications" defaultChecked={(s.profile?.preferences as {
                booking_notifications?: boolean;
              })?.booking_notifications !== false} /><span>Booking status notifications in my account</span></label></MutationForm></Card><Card><h2>Profile photo</h2><p className="small muted" style={{
            marginBottom: 20
          }}>A provider’s avatar is public when their profile is approved. Other account avatars remain private.</p><ProfilePhotoEditor /></Card><Card><h2>Security</h2><p className="muted small" style={{
            marginBottom: 20
          }}>Use a strong password. Verification and recovery links are sent to your account email.</p><div className="row"><ButtonLink href="/forgot-password/" secondary>Reset password</ButtonLink><ActionButton secondary action={s.signOut}>Sign out</ActionButton></div><p className="small muted" style={{
            marginTop: 20
          }}>To request account deactivation, <Link href="/support/">contact support</Link>. Booking and financial history may require retention.</p></Card></div><div className="stack"><Card><h2>Saved addresses</h2><QueryState {...q}><DataTable rows={q.data || []} columns={[{
              key: 'label',
              label: 'Label'
            }, {
              key: 'line1',
              label: 'Address'
            }, {
              key: 'city',
              label: 'City'
            }]} actions={r => <div className="row"><AddressEditor row={r} /><ActionButton secondary confirm="Remove this saved address? Existing booking snapshots are preserved." action={() => result(requireDb().from('addresses').delete().eq('id', r.id).eq('user_id', s.user!.id))}>Remove</ActionButton></div>} /></QueryState></Card><Card><h2>Add an address</h2><MutationForm submit="Save address" onSubmit={async f => {
            const data = addressSchema.parse({
              label: f.get('label'),
              line1: f.get('line1'),
              city: f.get('city'),
              postal_code: f.get('postal_code')
            });
            await result(requireDb().from('addresses').insert({
              ...data,
              user_id: s.user!.id
            }));
          }}><Field label="Address label" name="label" required placeholder="Home / work" maxLength={40} /><Field label="Complete address" name="line1" minLength={5} maxLength={250} required /><div className="grid-2"><Field label="City / municipality" name="city" minLength={2} required /><Field label="Postal code" name="postal_code" inputMode="numeric" pattern="[0-9]{4}" required /></div></MutationForm></Card><Notice>Planning to offer your skills? <Link href="/provider/apply/">Apply as a service provider</Link>.</Notice></div></div></>;
}
function AddressEditor({
  row
}: {
  row: Record<string, unknown>;
}) {
  const [open, setOpen] = useState(false);
  const s = useSession();
  return <><button className="button secondary compact" onClick={() => setOpen(true)}>Edit</button>{open && <Dialog title="Edit saved address" onClose={() => setOpen(false)}><MutationForm onSubmit={async f => {
        const data = addressSchema.parse({
          label: f.get('label'),
          line1: f.get('line1'),
          city: f.get('city'),
          postal_code: f.get('postal_code')
        });
        await result(requireDb().from('addresses').update(data).eq('id', row.id).eq('user_id', s.user!.id));
        setOpen(false);
      }}><Field label="Label" name="label" defaultValue={String(row.label)} required /><Field label="Complete address" name="line1" defaultValue={String(row.line1)} required minLength={5} /><Field label="City / municipality" name="city" defaultValue={String(row.city)} required /><Field label="Postal code" name="postal_code" defaultValue={String(row.postal_code)} required pattern="[0-9]{4}" /></MutationForm></Dialog>}</>;
}
export function Notifications() {
  const s = useSession();
  const q = useQuery('notifications-' + s.user?.id, () => list('notifications', {
    user_id: s.user!.id
  }), !!s.user);
  return <><PageHeading title="Your updates" action={<ActionButton secondary action={() => rpc('mark_read', {
      p_conversation: null
    })}>Mark all as read</ActionButton>} /><QueryState {...q}><Card><DataTable rows={q.data || []} columns={[{
          key: 'title',
          label: 'Update',
          render: r => <><strong>{String(r.title)}</strong><p className="small muted">{String(r.body)}</p></>
        }, {
          key: 'created_at',
          label: 'Received',
          render: r => manilaDate(String(r.created_at))
        }, {
          key: 'read_at',
          label: 'Read',
          render: r => r.read_at ? 'Read' : 'Unread'
        }]} actions={r => <Link href={String(r.href)}>Open →</Link>} /></Card></QueryState></>;
}
