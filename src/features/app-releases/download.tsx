'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import QRCode from 'qrcode';
import { Download, Smartphone } from 'lucide-react';
import { backendConfigured, config } from '@/lib/config';
import { requireDb, result, edge } from '@/lib/backend';
import type { Release } from '@/lib/types';
import { manilaDate } from '@/lib/domain';
import { ActionButton, Badge, Card, Notice, PageHeading, useQuery } from '@/components/ui';
import publishedApk from './android-release.json';

export function DownloadPage() {
  const [qr, setQr] = useState('');
  const [qrError, setQrError] = useState('');
  const query = useQuery('published-release', async () => backendConfigured
    ? result(requireDb().from('app_releases').select('*').eq('status', 'published').not('verified_at', 'is', null).order('version_code', { ascending: false }).limit(1).maybeSingle()) as Promise<Release | null>
    : null);
  const hostedRelease = query.data && query.data.version_code >= publishedApk.version_code ? query.data : null;
  const release = hostedRelease || publishedApk;
  const qrTarget = hostedRelease ? `${config.siteUrl.replace(/\/$/, '')}/download/` : publishedApk.download_url;

  useEffect(() => {
    let active = true;
    void QRCode.toDataURL(qrTarget, { width: 240, margin: 2, color: { dark: '#0a100d', light: '#ffffff' } })
      .then(value => { if (active) { setQr(value); setQrError(''); } })
      .catch(() => { if (active) setQrError('QR code could not be generated. Use the Download APK button.'); });
    return () => { active = false; };
  }, [qrTarget]);

  return <>
    <PageHeading eyebrow="SerbisyoGo for Android" title="Home care, in your pocket." description="The same account. The same local expertise. Built to stay with you." />
    <Card className="download-hero">
      <div>
        <div className="download-icon"><Smartphone size={44} /></div>
        <Badge>{`Android release ${release.version_name}`}</Badge>
        <h1 style={{ marginTop: 16 }}>Take SerbisyoGo with you.</h1>
        <p className="muted">Download the signed SerbisyoGo app. Expo Go and a running laptop are not required.</p>
        <dl className="definition-list" style={{ marginBottom: 24 }}>
          <div><dt>Published</dt><dd>{release.published_at ? manilaDate(release.published_at, true) : '—'}</dd></div>
          <div><dt>Download size</dt><dd>{(release.byte_size / 1048576).toFixed(1)} MB</dd></div>
          <div><dt>Compatibility</dt><dd>Android {release.min_android} or later</dd></div>
          <div><dt>Version code</dt><dd>{release.version_code}</dd></div>
        </dl>
        {hostedRelease ? <ActionButton action={async () => {
          const data = await edge<{ url: string }>('releases', undefined, `?id=${encodeURIComponent(hostedRelease.id)}`);
          window.location.assign(data.url);
        }}><Download size={18} />Download APK</ActionButton> : <a className="button" href={publishedApk.download_url}><Download size={18} />Download APK</a>}
        <p className="small muted">{hostedRelease ? 'If a link expires, select Download APK again to request a fresh link.' : 'Direct APK download from our verified GitHub release.'}</p>
      </div>
      <div className="download-qr">
        {qr && <Image unoptimized src={qr} className="qr" width={180} height={180} alt={hostedRelease ? 'QR code linking to the app download page' : 'QR code linking to the signed SerbisyoGo APK'} />}
        <p className="small muted" style={{ marginTop: 12, textAlign: 'center' }}>{hostedRelease ? 'Scan to open this page' : 'Scan to download the APK'}</p>
        {qrError && <Notice error>{qrError}</Notice>}
      </div>
    </Card>
    <div className="grid-2" style={{ maxWidth: 920, margin: '24px auto' }}>
      <Card><h2>What’s new</h2><p className="release-notes">{release.release_notes}</p>
        <h3 style={{ marginTop: 24, marginBottom: 12 }}>SHA-256 checksum</h3><p className="checksum">{release.sha256}</p>
        <p className="small muted" style={{ marginTop: 12 }}>Compare this with the downloaded file’s SHA-256 checksum to verify its integrity.</p>
      </Card>
      <Card><h2>Install on Android</h2><ol className="stack small">
        <li>Download the APK using the button on this page.</li><li>Open the file on a compatible Android device.</li>
        <li>If prompted, allow installation from your browser or file manager, then follow Android’s installation steps.</li>
        <li>Open SerbisyoGo and sign in with your existing account. Internet access is required for live services.</li>
      </ol><p className="small muted" style={{ marginTop: 20 }}>You can download the file on a Windows laptop and transfer it to Android. Physical-phone testing remains pending; this version passed installation and navigation checks on an Android emulator.</p></Card>
    </div>
  </>;
}
