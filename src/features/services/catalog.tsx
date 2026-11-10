'use client';

import { AvailabilityPreview } from '@/features/providers/availability-preview';
import { AnnouncementFeed } from '@/features/admin/announcements';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Zap, Droplets, Hammer, Plug, Wind, Wrench, ArrowRight, ShieldCheck, CalendarDays, Check, MapPin, UserRound, Search, Smartphone } from 'lucide-react';
import { backendConfigured, config } from '@/lib/config';
import { avatarUrl } from '@/lib/backend';
import { demoCategories, demoProviders, demoServices, list, one } from '@/lib/data';
import { money } from '@/lib/domain';
import type { Provider, Service } from '@/lib/types';
import { Badge, ButtonLink, Card, Empty, Field, PageHeading, QueryState, Select, useQuery } from '@/components/ui';
import { ServiceMap } from '@/features/providers/map';
const icons: Record<string, typeof Wrench> = {
  zap: Zap,
  droplets: Droplets,
  hammer: Hammer,
  plug: Plug,
  wind: Wind,
  wrench: Wrench
};
export function Avatar({
  provider
}: {
  provider: Provider;
}) {
  const [failed, setFailed] = useState(false);
  return provider.avatar_path && backendConfigured && !failed ? <Image unoptimized className="avatar" width={64} height={64} src={avatarUrl(provider.id)} onError={() => setFailed(true)} alt="" /> : <div className="avatar"><UserRound size={28} /></div>;
}
export function ProviderCard({
  provider
}: {
  provider: Provider;
}) {
  return <article className="provider-card"><div className="provider-top"><Avatar provider={provider} /><div><h3>{provider.display_name}</h3><p>{provider.headline}</p><Badge>{provider.review_count ? `★ ${provider.rating} (${provider.review_count} reviews)` : 'No reviews yet'}</Badge></div></div><p>{provider.bio}</p><div className="row small muted"><MapPin size={13} />{provider.city}<span>•</span>Approved profile</div><div className="provider-bottom"><div><p className="eyebrow">Starting estimate</p><strong>{money(provider.min_rate)}</strong></div><ButtonLink href={`/providers/profile/?id=${provider.id}`}>View profile <ArrowRight size={14} /></ButtonLink></div></article>;
}
export function CategoryGrid({
  categories = demoCategories
}: {
  categories?: typeof demoCategories;
}) {
  return <div className="grid-3">{categories.map((c, i) => {
      const Icon = icons[c.icon] || Wrench;
      return <Link key={c.id} className="category-card" href={`/find/?category=${c.id}`}><div className="row between"><div className="category-icon"><Icon size={24} /></div><span className="eyebrow">0{i + 1}</span></div><h2>{c.name}</h2><p>{c.description}</p><span className="row small">Find a professional <ArrowRight size={14} /></span></Link>;
    })}</div>;
}
export function Landing() {
  const query = useQuery('landing', async () => backendConfigured ? {
    providers: await list<Provider>('public_providers'),
    categories: await list<typeof demoCategories[number]>('categories')
  } : {
    providers: demoProviders,
    categories: demoCategories
  });
  return <><section className="hero"><div className="hero-copy"><Badge>✓ Local providers • Clear service details</Badge><h1>Your home.<br /><em>In good hands.</em></h1><p>Find local repair experts you can trust. Compare profiles, choose your schedule, and keep every home service in one place.</p><form action={`${config.basePath}/find/`} className="hero-search"><Select label="Service type" name="category"><option value="">Choose a service</option>{(query.data?.categories || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select><Field label="City / location" name="city" placeholder="Bunawan, Agusan del Sur" /><button className="button">Find available pros <ArrowRight size={14} /></button></form><div className="trust-row"><span>✓ Profiles & reviews</span><span>✓ Booking status updates</span><span>✓ Service history</span></div><div className="row" style={{
          marginTop: 24
        }}><Link className="small" href="/download/">Download Android app →</Link></div></div><div className="hero-image"><Image unoptimized preload src={`${config.basePath}/brand/hero.png`} alt="Home service technician equipped for a repair visit" width={487} height={393} /><div className="floating-note"><ShieldCheck size={24} /><div><strong>Choose with confidence</strong><span className="muted">Reviewed provider applications</span></div></div><div className="floating-note bottom"><CalendarDays size={24} /><div><strong>Home care, on your schedule</strong><span className="muted">Book and track in one place</span></div></div></div></section><AnnouncementFeed /><QueryState {...query}><div className="section-heading"><div><h2>Local skills. A reliable helping hand.</h2><p>{backendConfigured ? 'Explore approved service professionals.' : 'Illustrative professionals for development preview.'}</p></div><Link href="/find/">View all pros →</Link></div><div className="grid-3">{query.data?.providers.slice(0, 3).map(p => <ProviderCard key={p.id} provider={p} />)}</div>{!query.data?.providers.length && <Empty title="Professionals are joining soon" description="Approved professionals will appear here as the community grows." />}<div className="section-heading"><div><h2>What needs attention at home?</h2><p>A little help for the jobs that matter.</p></div><Link href="/services/">All services →</Link></div><CategoryGrid categories={query.data?.categories} /></QueryState><div className="section-heading"><h2>Home care, made straightforward.</h2></div><div className="grid-3">{[['Find your professional', 'Compare services, profiles and customer feedback.'], ['Choose your schedule', 'Describe the task and request an available appointment.'], ['Keep everything together', 'Message your provider, track progress and review the work.']].map(([title, body], i) => <Card key={title}><div className="step-card"><span className="step-number">0{i + 1}</span><div><h3>{title}</h3><p>{body}</p></div></div></Card>)}</div><div className="cta-panel"><div><h2>Put your skills to work in your community.</h2><p>Apply as a local service professional. Applications are reviewed before activation.</p></div><ButtonLink href="/provider/apply/">Become a provider <ArrowRight size={16} /></ButtonLink></div><div className="cta-panel"><div className="row"><Smartphone size={36} /><div><h2>SerbisyoGo, wherever home is.</h2><p>The Android app is on its way. Your website account will work with the future app.</p></div></div><ButtonLink href="/download/" secondary>Android app details</ButtonLink></div></>;
}
export function Services() {
  const q = useQuery('categories', async () => backendConfigured ? list<typeof demoCategories[number]>('categories') : demoCategories);
  return <><PageHeading eyebrow="Services" title="What needs attention at home?" description="Choose a service to see local professionals, profiles, and available schedules." /><QueryState {...q}><CategoryGrid categories={q.data || []} /></QueryState><div className="cta-panel"><div><h2>Not sure which service to choose?</h2><p>Tell us about the task. Support can help you find the right place to start.</p></div><ButtonLink href="/support/" secondary>Get help</ButtonLink></div></>;
}
export function Find() {
  const params = useSearchParams();
  const [search, setSearch] = useState(params.get('q') || ''),
    [city, setCity] = useState(params.get('city') || ''),
    [category, setCategory] = useState(params.get('category') || ''),
    [max, setMax] = useState(params.get('max') || ''),
    [rating, setRating] = useState(params.get('rating') || '0'),
    [view, setView] = useState(params.get('view') === 'list' ? 'list' : 'map'),
    [sort, setSort] = useState(params.get('sort') === 'price' ? 'price' : 'rating'),
    [page, setPage] = useState(Math.max(1, Number(params.get('page')) || 1));
  const query = useQuery('find-catalog', async () => backendConfigured ? {
    providers: await list<Provider>('public_providers'),
    services: await list<Service>('provider_services'),
    categories: await list<typeof demoCategories[number]>('categories')
  } : {
    providers: demoProviders,
    services: demoServices,
    categories: demoCategories
  });
  const providers = (query.data?.providers || []).filter(p => (p.display_name + ' ' + p.headline + ' ' + p.bio).toLowerCase().includes(search.toLowerCase()) && (!city || p.service_areas.some(a => a.toLowerCase().includes(city.toLowerCase()))) && (!category || query.data?.services.some(s => s.provider_id === p.id && s.category_id === category)) && (!max || p.min_rate <= Number(max) * 100) && p.rating >= Number(rating)).sort((a, b) => sort === 'price' ? a.min_rate - b.min_rate : b.rating - a.rating);
  const pages = Math.max(1, Math.ceil(providers.length / 6));
  const current = Math.min(page, pages);
  function syncFilters() {
    const url = new URL(window.location.href);
    for (const [k, v] of Object.entries({
      q: search,
      city,
      category,
      max,
      rating,
      view,
      sort,
      page: '1'
    })) {
      if (v) {
        url.searchParams.set(k, v);
      } else {
        url.searchParams.delete(k);
      }
    }
    window.history.replaceState(null, '', url);
    setPage(1);
  }
  function changePage(next: number) {
    setPage(next);
    const url = new URL(window.location.href);
    url.searchParams.set('page', String(next));
    window.history.replaceState(null, '', url);
  }
  return <><PageHeading title="Find a professional" description="Compare local expertise and choose the right person for your home." /><form className="filters" onSubmit={e => {
      e.preventDefault();
      syncFilters();
    }}><Field label="Search professionals or services" value={search} onChange={e => setSearch(e.target.value)} placeholder="Try electrical diagnostics…" /><Select label="Service category" value={category} onChange={e => setCategory(e.target.value)}><option value="">All services</option>{query.data?.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select><Field label="City / municipality" value={city} onChange={e => setCity(e.target.value)} placeholder="All service areas" /><button className="button"><Search size={16} />Apply filters</button></form><div className="filter-extra"><Field label="Maximum starting price (₱)" type="number" min="0" value={max} onChange={e => {
        setMax(e.target.value);
        setPage(1);
      }} /><Select label="Minimum rating" value={rating} onChange={e => setRating(e.target.value)}><option value="0">Any rating</option><option value="4">4+ stars</option><option value="4.5">4.5+ stars</option></Select><Select label="Sort by" value={sort} onChange={e => setSort(e.target.value)}><option value="rating">Highest rated</option><option value="price">Lowest starting price</option></Select><div className="row" style={{
        marginLeft: 'auto'
      }}><button className={`button ${view === 'map' ? '' : 'secondary'} compact`} aria-pressed={view === 'map'} onClick={() => setView('map')}>List & map</button><button className={`button ${view === 'list' ? '' : 'secondary'} compact`} aria-pressed={view === 'list'} onClick={() => setView('list')}>List only</button></div></div><QueryState {...query}><div className={`find-layout ${view === 'list' ? 'list-only' : ''}`}><div><p className="small muted" style={{
            marginBottom: 16
          }}>{providers.length} matching professionals {backendConfigured ? '' : '• fictional development examples'}</p><div className={view === 'list' ? 'grid-3' : 'find-list'}>{providers.slice((current - 1) * 6, current * 6).map(p => <ProviderCard key={p.id} provider={p} />)}</div>{!providers.length && <Empty title="No professionals found" description="Try a different service, city or price range." />}<div className="pagination"><span className="small muted">Page {current} of {pages}</span><button className="button secondary compact" disabled={current <= 1} onClick={() => changePage(current - 1)}>Previous</button><button className="button secondary compact" disabled={current >= pages} onClick={() => changePage(current + 1)}>Next</button></div></div>{view === 'map' && <ServiceMap caption="Bunawan, Agusan del Sur service-area overview. Provider positions and arrival estimates are shown only when explicitly shared during an active job." />}</div></QueryState></>;
}
export function ProviderProfile() {
  const id = useSearchParams().get('id') || '';
  const query = useQuery('provider-' + id, async () => backendConfigured ? {
    provider: await one<Provider>('public_providers', id),
    services: await list<Service>('provider_services', {
      provider_id: id
    }),
    reviews: await list('reviews', {
      provider_id: id
    })
  } : {
    provider: demoProviders.find(p => p.id === id) || demoProviders[0],
    services: demoServices.filter(s => s.provider_id === (id || demoProviders[0].id)),
    reviews: []
  });
  return <QueryState {...query}>{query.data?.provider ? <><div className="profile-header"><Avatar provider={query.data.provider} /><div><p className="eyebrow">Local service professional</p><h1>{query.data.provider.display_name}</h1><p className="muted">{query.data.provider.headline}</p><div className="row" style={{
            marginTop: 12
          }}><Badge>Approved profile</Badge><Badge>{query.data.provider.review_count ? `★ ${query.data.provider.rating} • ${query.data.provider.review_count} reviews` : 'No reviews yet'}</Badge></div></div></div><div className="split"><div className="stack"><Card><h2>About & expertise</h2><p className="muted">{query.data.provider.bio}</p><h3 style={{
              marginTop: 24,
              marginBottom: 12
            }}>Service areas</h3><div className="row">{query.data.provider.service_areas.map(a => <Badge key={a}>{a}</Badge>)}</div></Card><Card><h2>Services & rates</h2><div className="stack">{query.data.services.map(s => <div key={s.id} className="row between"><div><h3>{s.title}</h3><p className="muted small">{money(s.rate_centavos)} {s.pricing_mode === 'quote' ? 'estimated • quotation required' : 'fixed labor'} • {s.duration_minutes} minutes</p></div><ButtonLink href={`/book/?provider=${query.data!.provider!.id}&service=${s.id}`}>Request service <ArrowRight size={14} /></ButtonLink></div>)}</div></Card>{query.data.services[0] && <AvailabilityPreview serviceId={query.data.services[0].id} />}<Card><h2>Customer reviews</h2>{query.data.reviews.length ? query.data.reviews.map(r => <div key={String(r.id)} className="faq"><Badge>{`★ ${r.rating} / 5`}</Badge><p>{String(r.body)}</p></div>) : <Empty title="Be part of the first chapter" description="Eligible reviews from completed bookings will appear here." />}</Card></div><Card><h2>A clear start to your service.</h2><div className="stack"><div className="row"><ShieldCheck className="green" size={22} /><span className="small">Provider application reviewed</span></div><div className="row"><CalendarDays className="green" size={22} /><span className="small">Choose from available appointment slots</span></div><div className="row"><Check className="green" size={22} /><span className="small">Review the agreed price before acceptance</span></div><ButtonLink href={`/book/?provider=${query.data.provider.id}`}>Book a service <ArrowRight size={16} /></ButtonLink><p className="small muted">A booking request is subject to the provider’s acceptance. Arrival times are not guaranteed.</p></div></Card></div></> : <Empty title="Provider not available" description="Only approved, active professionals have public profiles." action={<ButtonLink href="/find/">Find a professional</ButtonLink>} />}</QueryState>;
}
