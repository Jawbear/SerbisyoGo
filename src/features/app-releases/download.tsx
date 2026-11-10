'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Download, Smartphone, ArrowRight } from 'lucide-react';
import { backendConfigured, config } from '@/lib/config';
import { requireDb, result, edge } from '@/lib/backend';
import type { Release } from '@/lib/types';
import { manilaDate } from '@/lib/domain';
import { ActionButton, Badge, ButtonLink, Card, Notice, PageHeading, QueryState, useQuery } from '@/components/ui';
export function DownloadPage() {
  const [qr, setQr] = useState('');
  const [qrError, setQrError] = useState('');
  const canonical = `${config.siteUrl.replace(/\/$/, '')}/download/`;
  useEffect(() => {
    void QRCode.toDataURL(canonical, {
      width: 240,
      margin: 2,
      color: {
        dark: '#0a100d',
        light: '#ffffff'
      }
    }).then(setQr).catch(() => setQrError('QR code could not be generated. Use the download page link.'));
  }, [canonical]);
  const query = useQuery('published-release', async () => backendConfigured ? result(requireDb().from('app_releases').select('*').eq('status', 'published').order('version_code', {
    ascending: false
  }).limit(1).maybeSingle()) as Promise<Release | null> : null);
  const release = query.data;
  return <><PageHeading eyebrow="SerbisyoGo for Android" title="Home care, in your pocket." description="The same account. The same local expertise. Built to stay with you." /><QueryState {...query}><Card className="download-hero"><div><div className="download-icon"><Smartphone size={44} /></div>{release ? <><Badge>Android release {release.version_name}</Badge><h1 style={{
              marginTop: 16
            }}>Take SerbisyoGo with you.</h1><p className="muted">Download the official Android package directly from SerbisyoGo.</p><dl className="definition-list" style={{
              marginBottom: 24
            }}><div><dt>Published</dt><dd>{release.published_at ? manilaDate(release.published_at, true) : '—'}</dd></div><div><dt>Download size</dt><dd>{(release.byte_size / 1048576).toFixed(1)} MB</dd></div><div><dt>Compatibility</dt><dd>Android {release.min_android} or later</dd></div><div><dt>Version code</dt><dd>{release.version_code}</dd></div></dl><ActionButton action={async () => {
              const data = await edge<{
                url: string;
              }>('releases', undefined, `?id=${release.id}`);
              window.location.assign(data.url);
            }}><Download size={18} />Download APK</ActionButton><p className="small muted">If a link expires, select Download APK again to request a fresh link.</p></> : <><Badge>Coming soon</Badge><h1 style={{
              marginTop: 16
            }}>Our Android app is on its way.</h1><p className="muted">An official APK has not been published yet. You can already find professionals and manage your services on the website.</p><ButtonLink href="/find/">Keep using the website <ArrowRight size={16} /></ButtonLink></>}</div><div className="download-qr">{qr && <img src={qr} className="qr" width="180" height="180" alt={`QR code linking to ${canonical}`} />}<p className="small muted" style={{
            marginTop: 12,
            textAlign: 'center'
          }}>Scan to open this page</p>{qrError && <Notice error>{qrError}</Notice>}{config.siteUrl.includes('localhost') && <p className="small muted" style={{
            maxWidth: 190
          }}>Development URL. Configure your public site URL before deployment.</p>}</div></Card>{release && <div className="grid-2" style={{
        maxWidth: 920,
        margin: '24px auto'
      }}><Card><h2>What’s new</h2><p className="release-notes">{release.release_notes}</p><h3 style={{
            marginTop: 24,
            marginBottom: 12
          }}>SHA-256 checksum</h3><p className="checksum">{release.sha256}</p><p className="small muted" style={{
            marginTop: 12
          }}>Compare this with the downloaded file’s SHA-256 checksum to verify its integrity.</p></Card><Card><h2>Install on Android</h2><ol className="stack small"><li>Download the official APK using the button on this page.</li><li>Open the downloaded file on your compatible Android device.</li><li>If prompted, grant installation permission to the browser or file manager you used, then follow Android’s installation steps.</li><li>Keep Android’s security checks enabled. If installation fails, check compatibility and available storage.</li></ol><p className="small muted" style={{
            marginTop: 20
          }}>This is a direct Android package download. It is not a shortcut to this website.</p></Card></div>}</QueryState></>;
}
