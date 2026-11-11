'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from '@/components/session';
import { Badge, Card, Dialog, Empty, Field, MutationForm, Notice, PageHeading, QueryState, Select, Textarea, useQuery } from '@/components/ui';
import { manilaDate } from '@/lib/domain';
import { accountRequest, type AccountPage, type ManagedAccount } from './accounts-api';

export function AdminAccounts() {
  const router = useRouter(); const params = useSearchParams();
  const { refresh } = useSession();
  const [input, setInput] = useState(''); const [search, setSearch] = useState('');
  const [role, setRole] = useState(''); const [status, setStatus] = useState('');
  const [offset, setOffset] = useState(0); const [create, setCreate] = useState(false); const [message, setMessage] = useState('');
  const id = params.get('id');
  const query = useQuery(`admin-accounts-${search}-${role}-${status}-${offset}`, () => accountRequest<AccountPage>(undefined, `?${new URLSearchParams({ search, role, status, offset: String(offset), limit: '25' })}`));
  function select(value = '') { router.replace(value ? `/admin/accounts/?id=${encodeURIComponent(value)}` : '/admin/accounts/', { scroll: false }); }
  return <>
    <PageHeading title="User accounts" description="Manage customer, provider and administrator accounts." action={<button className="button" onClick={() => setCreate(true)}>Create account</button>} />
    {message && <Notice>{message}</Notice>}
    <Card><form className="date-filters" onSubmit={event => { event.preventDefault(); setSearch(input.trim()); setOffset(0); }}>
      <Field label="Search accounts" placeholder="Name, email or phone" maxLength={100} value={input} onChange={event => setInput(event.target.value)} />
      <Select label="Account role" value={role} onChange={event => { setRole(event.target.value); setOffset(0); }}><option value="">All roles</option>{['customer','provider','admin'].map(value => <option key={value}>{value}</option>)}</Select>
      <Select label="Account status" value={status} onChange={event => { setStatus(event.target.value); setOffset(0); }}><option value="">All statuses</option>{['active','restricted','deactivated','deleting'].map(value => <option key={value}>{value}</option>)}</Select>
      <button className="button secondary" type="submit">Search accounts</button>
    </form></Card>
    <QueryState {...query}><Card><div className="table-scroll" role="region" aria-label="User accounts" tabIndex={0}><table><thead><tr><th>Account</th><th>Email</th><th>Role</th><th>Status</th><th>Action</th></tr></thead><tbody>
      {query.data?.rows.map(account => <tr key={account.id}><td>{account.full_name}<br /><span className="small muted">{account.phone || 'No phone'}</span></td><td>{account.email || 'Identity removal pending'}</td><td><Badge>{account.role}</Badge></td><td><Badge>{account.status}</Badge></td><td><button className="button secondary compact" onClick={() => select(account.id)} aria-label={`Manage ${account.full_name}`}>Manage account</button></td></tr>)}
    </tbody></table></div>{!query.data?.rows.length && <Empty title="No matching accounts" description="Try another name, email or filter." />}
      <div className="pagination"><span>{query.data?.total || 0} accounts</span><button className="button secondary compact" disabled={!offset} onClick={() => setOffset(value => Math.max(0,value-25))}>Previous accounts</button><button className="button secondary compact" disabled={offset+25 >= (query.data?.total || 0)} onClick={() => setOffset(value => value+25)}>Next accounts</button></div>
    </Card></QueryState>
    {id && <Dialog title="Manage user account" onClose={() => select()}><AccountDetails key={id} id={id} onSaved={() => setMessage('Account changes saved.')} onDeleted={() => { select(); setMessage('The account and its related application records were permanently erased.'); refresh(); }} /></Dialog>}
    {create && <Dialog title="Create user account" onClose={() => setCreate(false)}><MutationForm submit="Create user account" onSubmit={async form => {
      const result = await accountRequest<{ account: ManagedAccount }>({ action: 'create', full_name: form.get('full_name'), email: form.get('email'), phone: form.get('phone'), password: form.get('password'), role: form.get('role'), email_verified: form.get('email_verified') === 'on', reason: form.get('reason') });
      setCreate(false); setMessage('Account created.'); select(result.account.id);
    }}><Field label="Full name" name="full_name" required minLength={2} maxLength={100} /><Field label="Email address" name="email" type="email" required maxLength={254} /><Field label="Mobile number" name="phone" type="tel" placeholder="09xxxxxxxxx or +639xxxxxxxxx" /><Field label="Initial password" name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required /><Select label="New account role" name="role"><option value="customer">Customer</option><option value="admin">Administrator</option></Select><EmailVerification /><Reason /><Notice>Provider access is assigned through the provider verification workflow. Unverified email accounts cannot sign in until their email is confirmed.</Notice></MutationForm></Dialog>}
  </>;
}

function Reason() { return <Textarea label="Reason for this action" name="reason" required minLength={5} maxLength={1000} />; }
function EmailVerification() { return <label className="check-field"><input type="checkbox" name="email_verified" /><span>I have verified that this email address belongs to this user.</span></label>; }

function AccountDetails({ id, onSaved, onDeleted }: { id: string; onSaved: () => void; onDeleted: () => void }) {
  const { user } = useSession();
  const [pending, setPending] = useState(false);
  const query = useQuery(`admin-account-${id}`, async () => (await accountRequest<AccountPage>(undefined, `?id=${encodeURIComponent(id)}`)).rows[0] || null);
  const account = query.data && pending ? { ...query.data, status: 'deleting' } : query.data;
  return <QueryState {...query}>{account ? <div className="stack">
    <div><h3>{account.full_name}</h3><p className="muted">{account.email || account.id}</p><div className="row"><Badge>{account.role}</Badge><Badge>{account.status}</Badge><Badge>{account.email_confirmed_at ? 'Email verified' : 'Email unverified'}</Badge></div></div>
    {account.status === 'deleting' ? <Notice error>Permanent deletion has started. The account is disabled. Retry the deletion below to finish removing any remaining data.</Notice> : <>
      <Card><h3>Profile and access</h3><MutationForm key={account.updated_at} submit="Save account changes" onSubmit={async form => {
        await accountRequest({ action: 'profile', id, full_name: form.get('full_name'), phone: form.get('phone'), role: form.get('role') || account.role, status: form.get('status') || account.status, updated_at: account.updated_at, reason: form.get('reason') }); onSaved();
      }}><Field label="Full name" name="full_name" defaultValue={account.full_name} minLength={2} maxLength={100} required /><Field label="Mobile number" name="phone" type="tel" defaultValue={account.phone || ''} /><Select label="User role" name="role" defaultValue={account.role} disabled={id === user?.id}>{['customer','provider','admin'].map(value => <option key={value}>{value}</option>)}</Select><Select label="User status" name="status" defaultValue={account.status} disabled={id === user?.id}>{['active','restricted','deactivated'].map(value => <option key={value}>{value}</option>)}</Select><Reason /><p className="small muted">Provider roles require approved verification. Your own administrator access cannot be removed here.</p></MutationForm></Card>
      <Card><h3>Sign-in email</h3><MutationForm submit="Change sign-in email" onSubmit={async form => { await accountRequest({ action: 'email', id, email: form.get('email'), email_verified: form.get('email_verified') === 'on', reason: form.get('reason') }); onSaved(); }}><Field label="New email address" name="email" type="email" defaultValue={account.email || ''} required maxLength={254} /><EmailVerification /><Reason /><p className="small muted">This changes the sign-in address directly. Verify ownership first.</p></MutationForm>
        {!account.email_confirmed_at && <MutationForm submit="Confirm verified email" onSubmit={async form => { await accountRequest({ action: 'verify_email', id, email_verified: form.get('email_verified') === 'on', reason: form.get('reason') }); onSaved(); }}><EmailVerification /><Reason /></MutationForm>}
      </Card>
      <Card><h3>Reset password</h3><MutationForm submit="Set new password" onSubmit={async form => { await accountRequest({ action: 'password', id, password: form.get('password'), password_confirmation: form.get('password_confirmation'), reason: form.get('reason') }); onSaved(); }}><Field label="New password" name="password" type="password" minLength={12} maxLength={128} autoComplete="new-password" required /><Field label="Confirm new password" name="password_confirmation" type="password" minLength={12} maxLength={128} autoComplete="new-password" required /><Reason /><p className="small muted">Existing passwords are never displayed.</p></MutationForm></Card>
    </>}
    {id !== user?.id ? <DeleteAccount account={account} onDeleted={onDeleted} onPending={() => setPending(true)} /> : <Notice>You cannot permanently delete your own administrator account.</Notice>}
    <p className="small muted">Created {manilaDate(account.created_at)}{account.last_sign_in_at ? ` · Last sign-in ${manilaDate(account.last_sign_in_at,true)}` : ''}</p>
  </div> : <Empty title="Account not found" description="It may have been permanently deleted." />}</QueryState>;
}

function DeleteAccount({ account, onDeleted, onPending }: { account: ManagedAccount; onDeleted: () => void; onPending: () => void }) {
  const [open, setOpen] = useState(false);
  const preview = useQuery(`account-delete-preview-${account.id}`, () => accountRequest<{ counts: Record<string, number> }>(undefined, `?preview=${account.id}`), open);
  return <Card><h3>Permanent deletion</h3><p>This erases the login, profile and linked application records, including shared bookings, messages, payments, support records and files. It cannot be undone.</p>
    {!open ? <button className="button secondary" onClick={() => setOpen(true)}>Review permanent deletion</button> : <QueryState {...preview}>
      <Notice error>Other users will also lose the shared records involving this account. Other user accounts remain. Global app configuration is retained with account attribution removed.</Notice>
      <dl className="definition-list">{Object.entries(preview.data?.counts || {}).map(([key,value]) => <div key={key}><dt>{key.replaceAll('_',' ')}</dt><dd>{value}</dd></div>)}</dl>
      <MutationForm submit={account.status === 'deleting' ? 'Retry permanent deletion' : 'Permanently erase account and records'} onSubmit={async form => {
        if (form.get('acknowledge') !== 'on') throw new Error('Confirm that you understand the permanent removal.');
        if (!window.confirm(`Permanently erase ${account.email || account.id} and all listed related records? This cannot be undone.`)) return false;
        try { const result = await accountRequest<{ deleted: boolean }>({ action: 'delete', id: account.id, confirmation: form.get('confirmation'), reason: form.get('reason') }); if (!result.deleted) throw new Error('Deletion has not completed.'); onDeleted(); } catch (error) { if (error instanceof Error && /remains disabled|deletion.*incomplete/i.test(error.message)) onPending(); throw error; }
      }}><Field label={`Type ${account.status === 'deleting' ? account.id : account.email || account.id} to confirm deletion`} name="confirmation" required autoComplete="off" /><Reason /><label className="check-field"><input type="checkbox" name="acknowledge" required /><span>I understand that the account and its related records will be permanently erased.</span></label></MutationForm>
    </QueryState>}
  </Card>;
}
