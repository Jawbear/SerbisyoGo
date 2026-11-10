'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { Camera, UserRound } from 'lucide-react';
import { useSession } from '@/components/session';
import { MutationForm, Notice, useQuery } from '@/components/ui';
import { edge } from '@/lib/backend';
import { validateUpload } from '@/lib/domain';

export function AccountAvatar({ large = false }: { large?: boolean }) {
  const session = useSession();
  const path = session.profile?.avatar_path;
  const [renewal, setRenewal] = useState(0);
  const [failedUrl, setFailedUrl] = useState('');
  useEffect(() => {
    if (!path) return;
    const renew = () => setRenewal(value => value + 1);
    const timer = setInterval(renew, 50000);
    window.addEventListener('focus', renew);
    return () => { clearInterval(timer); window.removeEventListener('focus', renew); };
  }, [path]);
  const query = useQuery(`own-avatar-${session.user?.id}-${path}-${renewal}`, () => edge<{ url: string | null }>('files', undefined, '?my_avatar=1'), !!session.user && !!path);
  const url = query.data?.url;
  const className = `account-avatar ${large ? 'large' : ''}`;
  return url && url !== failedUrl ? <Image unoptimized src={url} width={large ? 96 : 40} height={large ? 96 : 40} className={className} alt="Your profile photo" onError={() => setFailedUrl(url)} /> : <span className={className} role="img" aria-label="Default profile picture"><UserRound size={large ? 36 : 20} aria-hidden="true" /></span>;
}

export function ProfilePhotoEditor() {
  const [selected, setSelected] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const objectUrl = useRef('');
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => () => { if (objectUrl.current) URL.revokeObjectURL(objectUrl.current); }, []);
  function clearPreview() {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = '';
    setPreview('');
    setSelected(null);
  }
  return <div className="profile-photo-editor">
    <div className="profile-photo-preview">{preview ? <Image unoptimized src={preview} width={96} height={96} className="account-avatar large" alt="Selected profile photo preview" /> : <AccountAvatar large />}<div><strong>Your profile picture</strong><p className="small muted">Choose JPG, PNG or WebP, up to 5 MB.</p></div></div>
    <MutationForm submit={selected ? 'Save profile photo' : 'Choose a photo first'} disabled={!selected} success="Your profile photo has been updated." onSubmit={async () => {
      if (!selected) throw new Error('Choose a photo first.');
      validateUpload('avatar', selected.size, selected.type, selected.name, 5242880);
      const body = new FormData();
      body.set('file', selected);
      body.set('kind', 'avatar');
      setUploading(true);
      try { await edge('files', body); } finally { setUploading(false); }
      clearPreview();
      if (input.current) input.current.value = '';
    }}>
      <label className="field"><span><Camera size={14} aria-hidden="true" /> Profile photo</span><input ref={input} name="file" type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={event => {
        clearPreview();
        setError('');
        const file = event.target.files?.[0];
        if (!file) return;
        try {
          validateUpload('avatar', file.size, file.type, file.name, 5242880);
          objectUrl.current = URL.createObjectURL(file);
          setPreview(objectUrl.current);
          setSelected(file);
        } catch (cause) {
          event.target.value = '';
          setError(cause instanceof Error ? cause.message : 'Choose a supported image.');
        }
      }} /></label>
      {error && <Notice error>{error}</Notice>}
      {selected && <button type="button" className="button secondary" disabled={uploading} onClick={() => { clearPreview(); setError(''); if (input.current) input.current.value = ''; }}>Cancel selection</button>}
    </MutationForm>
    <p className="small muted">Your photo stays private unless you have an approved public provider profile. Upload a new photo anytime to replace it.</p>
  </div>;
}
