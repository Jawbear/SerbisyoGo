'use client';

import { edge } from '@/lib/backend';
import { list } from '@/lib/data';
import { ActionButton, Badge, Field, MutationForm, QueryState, Select, useQuery } from '@/components/ui';
import { formatVerificationFileName, parseDocInfo, VERIFICATION_DOC_CATEGORIES } from '@/lib/domain';

export function FileList({
  bookingId,
  caseId,
  ownerId,
  kind,
  allowDelete = false,
  onMutated
}: {
  bookingId?: string;
  caseId?: string;
  ownerId?: string;
  kind?: string;
  allowDelete?: boolean;
  onMutated?: () => void;
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
  return <QueryState {...q}><div className="stack" style={{ gap: 12 }}>{q.data?.map(f => {
      const info = parseDocInfo(String(f.original_name));
      const category = VERIFICATION_DOC_CATEGORIES.find(item => item.id === f.verification_category);
      return <div className="row between" key={String(f.id)} style={{
        padding: '12px 14px',
        borderRadius: 8,
        background: 'var(--subtle, #151f19)',
        border: '1px solid var(--border)',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap'
      }}><div className="stack" style={{ gap: 4, minWidth: 200, flex: 1 }}><div className="row" style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>{f.kind === 'verification' ? <Badge>{category?.badge || 'Category required — upload again'}</Badge> : info.isCategorized && <Badge>{info.badge}</Badge>}<strong>{info.title}</strong></div><span className="small muted">{(Number(f.byte_size) / 1024).toFixed(0)} KB · {f.mime_type === 'application/pdf' ? 'PDF Document' : 'Image'}</span></div><div className="row" style={{ gap: 8, flexWrap: 'wrap' }}><ActionButton secondary action={async () => {
              const {
                url
              } = await edge<{
                url: string;
              }>('files', undefined, `?id=${f.id}&inline=true`);
              window.open(url, '_blank', 'noopener,noreferrer');
            }}>Preview</ActionButton><ActionButton secondary action={async () => {
              const {
                url
              } = await edge<{
                url: string;
              }>('files', undefined, `?id=${f.id}`);
              const a = document.createElement('a');
              a.href = url;
              a.download = String(f.original_name);
              document.body.appendChild(a);
              a.click();
              a.remove();
            }}>Download</ActionButton>{allowDelete && <ActionButton secondary confirm="Are you sure you want to remove this verification document?" action={async () => {
              await edge('files', undefined, `?id=${f.id}`, { method: 'DELETE' });
              if (onMutated) onMutated();
            }}>Remove</ActionButton>}</div></div>;
    })}{!q.data?.length && <p className="small muted">No files attached.</p>}</div></QueryState>;
}
export function UploadForm({
  kind,
  bookingId,
  caseId,
  onUploaded
}: {
  kind: 'booking' | 'support' | 'verification' | 'avatar';
  bookingId?: string;
  caseId?: string;
  onUploaded?: () => void;
}) {
  return <MutationForm submit={kind === 'avatar' ? 'Upload avatar' : kind === 'verification' ? 'Upload verification credential' : 'Upload private file'} success="File uploaded securely." onSubmit={async f => {
    const file = f.get('file');
    if (!(file instanceof File) || !file.size) throw new Error('Select a file.');
    let uploadFile = file;
    let verificationCategory = '';
    if (kind === 'verification') {
      const category = String(f.get('doc_category') || 'Government ID').trim();
      verificationCategory = VERIFICATION_DOC_CATEGORIES.find(item => item.badge === category)?.id || '';
      if (!verificationCategory) throw new Error('Choose a valid credential category.');
      const title = String(f.get('doc_title') || '').trim();
      const formattedName = formatVerificationFileName(category, title, file.name);
      uploadFile = new File([file], formattedName, { type: file.type });
    }
    const body = new FormData();
    body.set('file', uploadFile);
    body.set('kind', kind);
    if (verificationCategory) body.set('verification_category', verificationCategory);
    if (bookingId) body.set('booking_id', bookingId);
    if (caseId) body.set('case_id', caseId);
    await edge('files', body);
    if (onUploaded) onUploaded();
  }}>{kind === 'verification' && <><Select label="Document category (choose any one)" name="doc_category" required defaultValue="Government ID">{VERIFICATION_DOC_CATEGORIES.map(c => <option key={c.id} value={c.badge}>{c.badge} — {c.name} {c.id === 'other_proof' ? '(Supporting only)' : '(Accepted alternative)'}</option>)}</Select><Field label="Document title or specification (optional)" name="doc_title" placeholder="e.g. PhilSys National ID, TESDA NC II Electrical, 2026 Barangay Clearance" maxLength={80} /></>}<Field label={kind === 'avatar' ? 'Avatar (JPG, PNG, WebP; up to 5 MB)' : 'Select JPG, PNG, WebP or PDF (up to 10 MB)'} name="file" type="file" accept={kind === 'avatar' ? 'image/jpeg,image/png,image/webp' : 'image/jpeg,image/png,image/webp,application/pdf'} required /></MutationForm>;
}
