'use client';

import { edge } from '@/lib/backend';
import { list } from '@/lib/data';
import { ActionButton, Field, MutationForm, QueryState, useQuery } from '@/components/ui';
export function FileList({
  bookingId,
  caseId,
  ownerId,
  kind
}: {
  bookingId?: string;
  caseId?: string;
  ownerId?: string;
  kind?: string;
}) {
  const filters: Record<string, string> = {
    ...(bookingId ? {
      booking_id: bookingId
    } : {}),
    ...(caseId ? {
      case_id: caseId
    } : {}),
    ...(ownerId ? {
      owner_id: ownerId
    } : {}),
    ...(kind ? {
      kind
    } : {})
  };
  const q = useQuery('files-' + JSON.stringify(filters), () => list('files', filters), !!(bookingId || caseId || ownerId));
  return <QueryState {...q}><div className="stack">{q.data?.map(f => <div className="row between" key={String(f.id)}><span className="small">{String(f.original_name)} · {(Number(f.byte_size) / 1024).toFixed(0)} KB</span><ActionButton secondary action={async () => {
          const {
            url
          } = await edge<{
            url: string;
          }>('files', undefined, `?id=${f.id}`);
          window.location.assign(url);
        }}>Open private file</ActionButton></div>)}{!q.data?.length && <p className="small muted">No files attached.</p>}</div></QueryState>;
}
export function UploadForm({
  kind,
  bookingId,
  caseId
}: {
  kind: 'booking' | 'support' | 'verification' | 'avatar';
  bookingId?: string;
  caseId?: string;
}) {
  return <MutationForm submit={kind === 'avatar' ? 'Upload avatar' : 'Upload private file'} success="File uploaded securely." onSubmit={async f => {
    const file = f.get('file');
    if (!(file instanceof File) || !file.size) throw new Error('Select a file.');
    const body = new FormData();
    body.set('file', file);
    body.set('kind', kind);
    if (bookingId) body.set('booking_id', bookingId);
    if (caseId) body.set('case_id', caseId);
    await edge('files', body);
  }}><Field label={kind === 'avatar' ? 'Avatar (JPG, PNG, WebP; up to 5 MB)' : 'Select JPG, PNG, WebP or PDF (up to 10 MB)'} name="file" type="file" accept={kind === 'avatar' ? 'image/jpeg,image/png,image/webp' : 'image/jpeg,image/png,image/webp,application/pdf'} required /></MutationForm>;
}
