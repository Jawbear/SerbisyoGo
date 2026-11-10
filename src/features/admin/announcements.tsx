'use client';

import { backendConfigured } from '@/lib/config';
import { list } from '@/lib/data';
import { Card, Notice, useQuery } from '@/components/ui';
export function AnnouncementFeed() {
  const q = useQuery('published-notices', () => list('announcements', {
    status: 'published'
  }), backendConfigured);
  if (!backendConfigured) return null;
  const rows = q.data?.filter(r => r.publish_at && new Date(String(r.publish_at)) <= new Date()).slice(0, 3) || [];
  return <>{q.error && <Notice error>{q.error}</Notice>}{rows.length > 0 && <Card className="announcements-feed"><h2>Community updates</h2>{rows.map(r => <div className="faq" key={String(r.id)}><h3>{String(r.title)}</h3><p style={{
          whiteSpace: 'pre-wrap'
        }}>{String(r.body)}</p></div>)}</Card>}</>;
}
