'use client';

import { ProviderTrustBadges } from '@/features/providers/trust-badges';
import { AvailabilityPreview } from '@/features/providers/availability-preview';
import { AnnouncementFeed } from '@/features/admin/announcements';
import Link from 'next/link';
import Image from 'next/image';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Zap, Droplets, Hammer, Plug, Wind, Wrench, ArrowRight, ShieldCheck, CalendarDays, Check, MapPin, UserRound, Search, Smartphone } from 'lucide-react';
import { backendConfigured, config } from '@/lib/config';
import { avatarUrl, rpc } from '@/lib/backend';
import { todayManila } from '@/lib/domain';
import { availableServiceIds, matchProfessionals } from '../../../mobile/src/data/discovery.js';
import { demoCategories, list, one } from '@/lib/data';
import { money } from '@/lib/domain';
import type { Provider, Service } from '@/lib/types';
import { Badge, ButtonLink, Card, Empty, Field, PageHeading, QueryState, Select, useQuery } from '@/components/ui';
import information from '@/content/public-information.json';
import { serviceCover } from '@/lib/service-covers';
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
  return <ProviderAvatarImage key={`${provider.id}-${provider.avatar_path}`} provider={provider} />;
}
function ProviderAvatarImage({ provider }: { provider: Provider }) {
  const [failed, setFailed] = useState(false);
  return provider.avatar_path && backendConfigured && !failed ? <Image unoptimized className="avatar" width={64} height={64} src={avatarUrl(provider.id, provider.avatar_path)} onError={() => setFailed(true)} alt="" /> : <div className="avatar"><UserRound size={28} /></div>;
}
export function ProviderCard({
  provider
}: {
  provider: Provider;
}) {
  return <article className="provider-card"><div className="provider-top"><Avatar provider={provider} /><div><h3>{provider.display_name}</h3><p>{provider.headline}</p><Badge>{provider.review_count ? `★ ${provider.rating} (${provider.review_count} reviews)` : 'No reviews yet'}</Badge></div></div><ProviderTrustBadges provider={provider}/><p>{provider.bio}</p><div className="row small muted"><MapPin size={13} />{provider.city}<span>•</span>Approved profile</div><div className="provider-bottom"><div><p className="eyebrow">Starting estimate</p><strong>{provider.min_rate == null ? 'No active rate' : money(provider.min_rate)}</strong></div><ButtonLink href={`/providers/profile/?id=${provider.id}`}>View profile <ArrowRight size={14} /></ButtonLink></div></article>;
}
export function CategoryGrid({
  categories = demoCategories,
  compact = false
}: {
  categories?: typeof demoCategories;
  compact?: boolean;
}) {
  return <div className={`grid-3 ${compact ? 'category-grid-preview' : ''}`}>{categories.map(c => {
      const Icon = icons[c.icon] || Wrench;
      const cover = serviceCover(c.name);
      return <Link key={c.id} className="category-card" href={`/find/?category=${c.id}`}>{cover && <Image unoptimized className="service-cover" src={`${config.basePath}/brand/covers/${cover.file}.jpg`} alt={cover.alt} width={640} height={360} />}<div className="row between"><div className="category-icon"><Icon size={24} /></div></div><h2>{c.name}</h2><p>{c.description}</p><span className="row small">{compact ? 'Explore' : 'Find a professional'} <ArrowRight size={14} /></span></Link>;
    })}</div>;
}
export function Landing() {
  const query = useQuery('landing', async () => {
    if (!backendConfigured) return { providers: [], categories: [] };
    const [providers, categories] = await Promise.all([
      list<Provider>('public_providers'), list<typeof demoCategories[number]>('categories', { active: true })
    ]);
    return { providers, categories };
  });
  return <>
    <section className="market-hero">
      <div className="market-intro">
        <h1>Your home.<br /><em>In good hands.</em></h1>
        <p>Find trusted local professionals for repairs, cleaning, maintenance, and everyday home services. Compare rates, review profiles, and book conveniently.</p>
        <Link href="/services/" className="market-explore">Explore Services <ArrowRight size={17} /></Link>
      </div>
      <Image className="market-photo" unoptimized preload src={`${config.basePath}/brand/covers/home.jpg`} alt="A carpenter fitting a cabinet hinge" width={640} height={480} />
      <form action={`${config.basePath}/find/`} className="market-search">
        <Select label="Service type" name="category"><option value="">All services</option>{query.data?.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
        <Field label="City / location" name="city" placeholder="City or municipality" />
        <button className="button"><Search size={17} />Find a Professional</button>
      </form>
    </section>
    <AnnouncementFeed />
    <QueryState {...query}>
      <div className="section-heading"><div><h2>What needs attention at home?</h2><p>Browse services in your community.</p></div><Link href="/services/">All services →</Link></div>
      {query.data?.categories.length ? <CategoryGrid compact categories={query.data.categories} /> : <Empty title="Service catalog unavailable" description="Check back for active service categories." />}
      <div className="section-heading"><div><h2>Local skills. A reliable helping hand.</h2><p>Compare approved professional profiles and service rates.</p></div><Link href="/find/">View all professionals →</Link></div>
      {query.data?.providers.length ? <div className="grid-3">{query.data.providers.slice(0, 3).map(p => <ProviderCard key={p.id} provider={p} />)}</div> : <Empty title="No professionals to display yet" description="Approved profiles appear here when available." />}
    </QueryState>
    <div className="section-heading"><h2>How SerbisyoGo works</h2><Link href="/how-it-works/">Booking guide →</Link></div>
    <ol className="market-steps">{information.pages['how-it-works'].sections.slice(0, 3).map(item => <li key={item.title}><h3>{item.title}</h3><p>{item.body}</p></li>)}</ol>
    <div className="market-support">
      <div><ShieldCheck size={32} /><h2>Know who’s coming to your home.</h2><p>Check which credentials have been reviewed, read feedback from completed jobs, and keep agreements in your booking conversation.</p><Link href="/for-clients/">Customer safety guide →</Link></div>
      <div><h2>Frequently asked questions</h2>{information.faq.filter(item => ['Booking a service', 'Payments'].includes(item.group)).slice(0, 3).map(item => <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}<Link href="/contact/">Help and support →</Link></div>
    </div>
    <div className="cta-panel"><div><h2>Put your skills to work in your community.</h2><p>Build a profile, set your hours and receive local service requests.</p></div><ButtonLink href="/provider/apply/">Become a Provider <ArrowRight size={16} /></ButtonLink></div>
    <div className="cta-panel"><div className="row"><Smartphone size={32} /><div><h2>Take SerbisyoGo Anywhere</h2><p>Find local professionals, manage bookings, and stay connected wherever you go.</p></div></div><ButtonLink href="/download/" secondary>Download for Android</ButtonLink></div>
  </>;
}
export function Services() {
  const q = useQuery('categories', async () => backendConfigured ? list<typeof demoCategories[number]>('categories', { active: true }) : []);
  return <><PageHeading eyebrow="Services" title="What needs attention at home?" description="Choose a service to see local professionals, profiles, and available schedules." /><QueryState {...q}>{q.data?.length ? <CategoryGrid categories={q.data} /> : <Empty title="No active service categories" description="Check back as services become available." />}</QueryState><div className="cta-panel"><div><h2>Not sure which service to choose?</h2><p>Tell us about the task. Support can help you find the right place to start.</p></div><ButtonLink href="/support/" secondary>Get help</ButtonLink></div></>;
}
export function Find() {
  const params = useSearchParams();
  const [search, setSearch] = useState(params.get('q') || ''),
    [city, setCity] = useState(params.get('city') || ''),
    [category, setCategory] = useState(params.get('category') || ''),
    [max, setMax] = useState(params.get('max') || ''),
    [rating, setRating] = useState(params.get('rating') || '0'),
    [day, setDay] = useState(params.get('day') || ''),
    [view, setView] = useState(params.get('view') === 'list' ? 'list' : 'map'),
    [sort, setSort] = useState(params.get('sort') === 'price' ? 'price' : 'rating'),
    [page, setPage] = useState(Math.max(1, Number(params.get('page')) || 1));
  const query = useQuery('find-catalog', async () => {
    if (!backendConfigured) return { providers: [], services: [], categories: [] };
    const [providers, services, categories] = await Promise.all([
      list<Provider>('public_providers'),
      list<Service>('provider_services', { active: true }),
      list<typeof demoCategories[number]>('categories', { active: true })
    ]);
    return { providers, services, categories };
  });
  const availability = useQuery('available-services-' + day, () =>
    availableServiceIds(query.data!.services, day, (date: string, ids: string[]) =>
      rpc<string[]>('discovery_available_services', { p_day: date, p_services: ids })), !!day && !!query.data);
  const providers: Provider[] = useMemo(() => query.data ? matchProfessionals(query.data, {
    search, city, category, maximum: max, rating, sort, available: day ? availability.data || [] : null
  }) : [], [query.data, search, city, category, max, rating, sort, day, availability.data]);
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
      day,
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
      }} /><Select label="Minimum rating" value={rating} onChange={e => setRating(e.target.value)}><option value="0">Any rating</option><option value="4">4+ stars</option><option value="4.5">4.5+ stars</option></Select><Field label="Available on · Manila time" type="date" min={todayManila()} value={day} onChange={e => { setDay(e.target.value); setPage(1); }} /><Select label="Sort by" value={sort} onChange={e => setSort(e.target.value)}><option value="rating">Highest rated</option><option value="price">Lowest starting price</option></Select><div className="row" style={{
        marginLeft: 'auto'
      }}><button className={`button ${view === 'map' ? '' : 'secondary'} compact`} aria-pressed={view === 'map'} onClick={() => setView('map')}>List & map</button><button className={`button ${view === 'list' ? '' : 'secondary'} compact`} aria-pressed={view === 'list'} onClick={() => setView('list')}>List only</button></div></div><QueryState loading={query.loading || availability.loading} error={query.error || availability.error}><div className={`find-layout ${view === 'list' ? 'list-only' : ''}`}><div><p className="small muted" style={{
            marginBottom: 16
          }}>{providers.length} matching professionals</p><div className={view === 'list' ? 'grid-3' : 'find-list'}>{providers.slice((current - 1) * 6, current * 6).map(p => <ProviderCard key={p.id} provider={p} />)}</div>{!providers.length && <Empty title="No professionals found" description="Try a different service, city or price range." />}<div className="pagination"><span className="small muted">Page {current} of {pages}</span><button className="button secondary compact" disabled={current <= 1} onClick={() => changePage(current - 1)}>Previous</button><button className="button secondary compact" disabled={current >= pages} onClick={() => changePage(current + 1)}>Next</button></div></div>{view === 'map' && <ServiceMap providers={providers} />}</div></QueryState></>;
}
export function ProviderProfile() {
  const id = useSearchParams().get('id') || '';
  const query = useQuery('provider-' + id, async () => {
    if (!backendConfigured || !id) return { provider: null, services: [], reviews: [] };
    const [provider, services, reviews, categories] = await Promise.all([
      one<Provider>('public_providers', id),
      list<Service>('provider_services', { provider_id: id, active: true }),
      list('reviews', { provider_id: id, visible: true }),
      list<{ id: string }>('categories', { active: true })
    ]);
    const activeCategories = new Set(categories.map(category => category.id));
    return { provider, services: services.filter(service => activeCategories.has(service.category_id)), reviews };
  });
  return <QueryState {...query}>{query.data?.provider ? <><div className="profile-header"><Avatar provider={query.data.provider} /><div><p className="eyebrow">Local service professional</p><h1>{query.data.provider.display_name}</h1><p className="muted">{query.data.provider.headline}</p><div className="row" style={{
            marginTop: 12
          }}><Badge>Approved profile</Badge><ProviderTrustBadges provider={query.data.provider}/><Badge>{query.data.provider.review_count ? `★ ${query.data.provider.rating} • ${query.data.provider.review_count} reviews` : 'No reviews yet'}</Badge></div></div></div><div className="split"><div className="stack"><Card><h2>About & expertise</h2><p className="muted">{query.data.provider.bio}</p><h3 style={{
              marginTop: 24,
              marginBottom: 12
            }}>Service areas</h3><div className="row">{query.data.provider.service_areas.map(a => <Badge key={a}>{a}</Badge>)}</div></Card><Card><h2>Services & rates</h2>{!query.data.services.length && <p className="muted">No bookable services are currently listed.</p>}<div className="stack">{query.data.services.map(s => <div key={s.id} className="row between"><div><h3>{s.title}</h3><p className="muted small">{money(s.rate_centavos)} {s.pricing_mode === 'quote' ? 'estimated • quotation required' : 'fixed labor'} • {s.duration_minutes} minutes</p></div><ButtonLink href={`/book/?provider=${query.data!.provider!.id}&service=${s.id}`}>Request service <ArrowRight size={14} /></ButtonLink></div>)}</div></Card><Card><h2>Customer reviews</h2>{query.data.reviews.length ? query.data.reviews.map(r => <div key={String(r.id)} className="faq"><Badge>{`★ ${r.rating} / 5`}</Badge><p>{String(r.body)}</p></div>) : <Empty title="Be part of the first chapter" description="Eligible reviews from completed bookings will appear here." />}</Card></div><div className="stack">{query.data.services.length > 0 && <AvailabilityPreview services={query.data.services} />}<Card><h2>A clear start to your service.</h2><div className="stack"><div className="row"><ShieldCheck className="green" size={22} /><span className="small">Provider application reviewed</span></div><div className="row"><CalendarDays className="green" size={22} /><span className="small">Choose from available appointment slots</span></div><div className="row"><Check className="green" size={22} /><span className="small">Review the agreed price before acceptance</span></div><p className="small muted">A booking request is subject to the provider’s acceptance. Arrival times are not guaranteed.</p></div></Card></div></div></> : <Empty title="Provider not available" description="Only approved, active professionals have public profiles." action={<ButtonLink href="/find/">Find a professional</ButtonLink>} />}</QueryState>;
}
