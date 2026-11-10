'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState, type ReactNode, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes, type FormEvent } from 'react';
import { CheckCircle2, AlertCircle, LoaderCircle, Search, ArrowRight, Inbox, X } from 'lucide-react';
import { backendConfigured } from '@/lib/config';
import { useSession } from './session';
import { db } from '@/lib/backend';
import { escapeCsv } from '@/lib/domain';
export function ButtonLink({
  href,
  children,
  secondary = false,
  className = ''
}: {
  href: string;
  children: ReactNode;
  secondary?: boolean;
  className?: string;
}) {
  return <Link className={`button ${secondary ? 'secondary' : ''} ${className}`} href={href}>{children}</Link>;
}
export function Card({
  children,
  className = ''
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`card ${className}`}>{children}</section>;
}
export function PageHeading({
  eyebrow,
  title,
  description,
  action
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return <div className="page-heading"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1>{description && <p className="muted">{description}</p>}</div>{action}</div>;
}
export function Field({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
}) {
  const id = useId();
  return <label className="field" htmlFor={id}><span>{label}</span><input id={id} {...props} /></label>;
}
export function Select({
  label,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
}) {
  const id = useId();
  return <label className="field" htmlFor={id}><span>{label}</span><select id={id} {...props}>{children}</select></label>;
}
export function Textarea({
  label,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
}) {
  const id = useId();
  return <label className="field" htmlFor={id}><span>{label}</span><textarea id={id} rows={4} {...props} /></label>;
}
export function Badge({
  children
}: {
  children: ReactNode;
}) {
  const text = String(children);
  return <span className={`badge ${/pending|requested|estimate|draft|reviewing/.test(text) ? 'warning' : /cancel|declin|restrict|suspend|failed/.test(text) ? 'danger' : ''}`}>{text.replaceAll('_', ' ')}</span>;
}
export function Notice({
  children,
  error = false
}: {
  children: ReactNode;
  error?: boolean;
}) {
  return <div className={`notice ${error ? 'error' : ''}`} role={error ? 'alert' : 'status'}>{error ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}<div>{children}</div></div>;
}
export function Empty({
  title = 'Nothing here yet',
  description,
  action
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return <div className="empty"><Inbox size={32} /><h3>{title}</h3>{description && <p className="muted">{description}</p>}{action}</div>;
}
export function Skeleton() {
  return <div className="skeleton" aria-label="Loading" role="status"><div /><div /><div /></div>;
}
export function SetupState() {
  return <Card><Empty title="Connect your Supabase backend" description="This operation needs a configured backend. Public design previews remain available; no changes are being saved." action={<ButtonLink href="/preview/">Explore the preview <ArrowRight size={16} /></ButtonLink>} /><p className="muted small">Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in GitHub repository variables, apply the migrations, and deploy the Edge Functions. See README.md.</p></Card>;
}
export function Guard({
  children,
  admin = false,
  provider = false
}: {
  children: ReactNode;
  admin?: boolean;
  provider?: boolean;
}) {
  const s = useSession();
  if (!backendConfigured) return <SetupState />;
  if (s.loading) return <Skeleton />;
  if (s.error) return <Notice error>{s.error}</Notice>;
  if (!s.user) return <Card><Empty title={admin ? 'Administrator sign in required' : 'Sign in to continue'} description="Your bookings and account details are private." action={<ButtonLink href={admin ? '/admin/login/' : '/login/'}>Sign in <ArrowRight size={16} /></ButtonLink>} /></Card>;
  if (s.profile?.status !== 'active') return <Notice error>Your account is restricted. Contact support for assistance.</Notice>;
  if (admin && s.role !== 'admin') return <Notice error>Access denied. This workspace requires an authorized administrator account.</Notice>;
  if (provider && s.role !== 'provider' && s.role !== 'admin') return <Notice>Provider approval is required to accept jobs. <Link href="/provider/apply/">Continue your application</Link>.</Notice>;
  return children;
}
export function MutationForm({
  children,
  onSubmit,
  submit = 'Save changes',
  success = 'Saved successfully',
  className = '',
  disabled = false
}: {
  children: ReactNode;
  onSubmit: (form: FormData) => Promise<void | false>;
  submit?: string;
  success?: string;
  className?: string;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [ok, setOk] = useState('');
  const lock = useRef(false);
  const {
    refresh
  } = useSession();
  async function handle(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    setOk('');
    try {
      const outcome = await onSubmit(new FormData(e.currentTarget));
      if (outcome === false) return;
      setOk(success);
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save changes');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return <form onSubmit={handle} className={`form ${className}`}>{children}{error && <Notice error>{error}</Notice>}{ok && <Notice>{ok}</Notice>}<button className="button" type="submit" disabled={busy || disabled}>{busy ? <LoaderCircle size={16} className="spin" /> : null}{busy ? 'Please wait…' : submit}</button></form>;
}
export function ActionButton({
  children,
  action,
  confirm,
  secondary = false
}: {
  children: ReactNode;
  action: () => Promise<unknown>;
  confirm?: string;
  secondary?: boolean;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [ok, setOk] = useState(false);
  const lock = useRef(false);
  const {
    refresh
  } = useSession();
  async function run() {
    if (lock.current) return;
    if (confirm && !window.confirm(confirm)) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      await action();
      setOk(true);
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }
  return <div className="action-wrap"><button type="button" className={`button ${secondary ? 'secondary' : ''}`} disabled={busy} onClick={run}>{busy ? <LoaderCircle size={16} className="spin" /> : ok ? <CheckCircle2 size={16} /> : null}{children}</button>{error && <small className="error-text" role="alert">{error}</small>}</div>;
}
export function useQuery<T>(key: string, loader: () => Promise<T>, enabled = true) {
  const {
    revision
  } = useSession();
  const [data, setData] = useState<T | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    if (!enabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    void loader().then(value => {
      if (alive) setData(value);
    }).catch(e => {
      if (alive) setError(e instanceof Error ? e.message : 'Unable to load data');
    }).finally(() => {
      if (alive) setLoading(false);
    });
    return () => {
      alive = false;
    };
    // Loader is selected by the stable query key, which includes every query input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, revision, enabled]);
  return {
    data,
    loading,
    error
  };
}
export function QueryState({
  loading,
  error,
  children
}: {
  loading: boolean;
  error: string;
  children: ReactNode;
}) {
  return loading ? <Skeleton /> : error ? <Notice error>{error}</Notice> : <>{children}</>;
}
export function RealtimeRefresh({
  tables,
  filter
}: {
  tables: string[];
  filter?: string;
}) {
  const {
    refresh,
    user
  } = useSession();
  const names = tables.join(',');
  useEffect(() => {
    if (!db || !user) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let channel = db.channel(`changes-${crypto.randomUUID()}`);
    for (const table of names.split(',')) channel = channel.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table,
      ...(filter ? {
        filter
      } : {})
    }, () => {
      clearTimeout(timer);
      timer = setTimeout(refresh, 300);
    });
    channel.subscribe();
    const polling = setInterval(refresh, 30000);
    const focus = () => refresh();
    window.addEventListener('focus', focus);
    return () => {
      clearTimeout(timer);
      clearInterval(polling);
      window.removeEventListener('focus', focus);
      void db?.removeChannel(channel);
    };
  }, [names, filter, user, refresh]);
  return null;
}
export function Stats({
  items
}: {
  items: {
    label: string;
    value: ReactNode;
    note?: string;
  }[];
}) {
  return <div className="stats">{items.map(i => <Card key={i.label}><p className="eyebrow">{i.label}</p><strong className="stat-value">{i.value}</strong>{i.note && <p className="small muted">{i.note}</p>}</Card>)}</div>;
}
export function DataTable<T extends Record<string, unknown>>({
  rows,
  columns,
  actions,
  searchLabel = 'Search records',
  pageSize = 8
}: {
  rows: T[];
  columns: {
    key: string;
    label: string;
    render?: (row: T) => ReactNode;
  }[];
  actions?: (row: T) => ReactNode;
  searchLabel?: string;
  pageSize?: number;
}) {
  const [search, setSearch] = useState(''),
    [page, setPage] = useState(1),
    [sort, setSort] = useState(columns[0]?.key || ''),
    [descending, setDescending] = useState(false);
  const filtered = rows.filter(r => columns.some(c => String(r[c.key] ?? '').toLowerCase().includes(search.toLowerCase()))).sort((a, b) => {
    const x = a[sort],
      y = b[sort];
    const result = typeof x === 'number' && typeof y === 'number' ? x - y : String(x ?? '').localeCompare(String(y ?? ''));
    return descending ? -result : result;
  });
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pages);
  const slice = filtered.slice((current - 1) * pageSize, current * pageSize);
  return <div className="data-table"><div className="table-toolbar"><label className="search-input"><Search size={16} /><input aria-label={searchLabel} placeholder={`${searchLabel}…`} value={search} onChange={e => {
          setSearch(e.target.value);
          setPage(1);
        }} /></label><span className="muted small">{filtered.length} records</span></div><div className="table-scroll"><table><thead><tr>{columns.map(c => <th key={c.key} aria-sort={sort === c.key ? descending ? 'descending' : 'ascending' : 'none'}><button onClick={() => {
                setSort(c.key);
                setDescending(sort === c.key ? !descending : false);
              }}>{c.label} {sort === c.key ? descending ? '↓' : '↑' : ''}</button></th>)}{actions && <th>Action</th>}</tr></thead><tbody>{slice.map((r, i) => <tr key={String(r.id || i)}>{columns.map(c => <td key={c.key}>{c.render ? c.render(r) : String(r[c.key] ?? '—')}</td>)}{actions && <td>{actions(r)}</td>}</tr>)}</tbody></table></div>{!slice.length && <Empty title="No matching records" description="Try changing the search or filters." />}<div className="pagination"><span className="muted small">Page {current} of {pages}</span><button className="button secondary compact" disabled={current <= 1} onClick={() => setPage(current - 1)}>Previous</button><button className="button secondary compact" disabled={current >= pages} onClick={() => setPage(current + 1)}>Next</button></div></div>;
}
export function ExportButton({
  rows,
  name
}: {
  rows: Record<string, unknown>[];
  name: string;
}) {
  return <button className="button secondary" disabled={!rows.length} onClick={() => {
    const keys = [...new Set(rows.flatMap(r => Object.keys(r)))];
    const csv = [keys.map(escapeCsv).join(','), ...rows.map(r => keys.map(k => escapeCsv(typeof r[k] === 'object' ? JSON.stringify(r[k]) : r[k])).join(','))].join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], {
      type: 'text/csv;charset=utf-8'
    }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name + '.csv';
    a.click();
    URL.revokeObjectURL(url);
  }}>Export CSV</button>;
}
export function Dialog({
  title,
  onClose,
  children
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  return <dialog ref={ref} onCancel={onClose}><div className="dialog-heading"><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={20} /></button></div>{children}</dialog>;
}
