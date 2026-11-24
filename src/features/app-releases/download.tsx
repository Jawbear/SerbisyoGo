'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import QRCode from 'qrcode';
import { Download, Smartphone } from 'lucide-react';
import { manilaDate } from '@/lib/domain';
import { Badge, Card, Notice, PageHeading } from '@/components/ui';
import release from './android-release.json';

export function DownloadPage() {
  const [qr, setQr] = useState('');
  const [qrError, setQrError] = useState('');
  useEffect(() => {
    let active = true;
    void QRCode.toDataURL(release.download_url, { width: 240, margin: 2, color: { dark: '#0a100d', light: '#ffffff' } })
      .then(value => { if (active) { setQr(value); setQrError(''); } })
      .catch(() => { if (active) setQrError('QR code could not be generated. Use the Download for Android button.'); });
    return () => { active = false; };
  }, []);

  return <>
    <PageHeading eyebrow="SerbisyoGo for Android" title="SERBISYO GO" description="Sign in with your SerbisyoGo account to book a service or manage your assigned jobs." />
    <Card className="download-hero">
      <div>
        <div className="download-icon"><Smartphone size={44} /></div>
        <Badge>{`Android release ${release.version_name}`}</Badge>
        <h2 className="download-title" style={{ marginTop: 16 }}>Official Android app</h2>
        <p className="muted">Install the app on your Android phone and sign in with the same account you use on the website.</p>
        <dl className="definition-list" style={{ marginBottom: 24 }}>
          <div><dt>Published</dt><dd>{release.published_at ? manilaDate(release.published_at, true) : '—'}</dd></div>
          <div><dt>Download size</dt><dd>{(release.byte_size / 1048576).toFixed(1)} MiB</dd></div>
          <div><dt>Compatibility</dt><dd>Android {release.min_android} or later</dd></div>
          <div><dt>Version code</dt><dd>{release.version_code}</dd></div>
        </dl>
        <a className="button" href={release.download_url}><Download size={18} />Download for Android</a>
        <p className="small muted">Direct APK download from the verified GitHub release.</p>
      </div>
      <div className="download-qr">
        {qr && <Image unoptimized src={qr} className="qr" width={180} height={180} alt="QR code linking to the signed SerbisyoGo APK" />}
        <p className="small muted" style={{ marginTop: 12, textAlign: 'center' }}>Scan to download the APK</p>
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
      </ol><p className="small muted" style={{ marginTop: 20 }}>You can download the file on a Windows laptop and transfer it to Android.</p></Card>
    </div>
  </>;
}
