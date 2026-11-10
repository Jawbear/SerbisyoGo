'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { Home, Search, CalendarDays, MessageSquare, Receipt, LifeBuoy, Settings, BriefcaseBusiness, Download, Menu, ArrowUpRight, LayoutDashboard, Users, ShieldCheck, Wallet, CreditCard, ChartNoAxesCombined, Megaphone, Layers, LogOut, Bell } from 'lucide-react';
import { config, backendConfigured } from '@/lib/config';
import { useSession } from './session';
import { ActionButton, ButtonLink, Dialog } from './ui';
const publicNav = [['/', 'Overview', Home], ['/find/', 'Find a professional', Search], ['/services/', 'Service categories', Layers], ['/bookings/', 'My bookings', CalendarDays], ['/messages/', 'Messages', MessageSquare], ['/bookings/?view=invoices', 'Invoices', Receipt], ['/support/', 'Help & support', LifeBuoy], ['/account/', 'Account settings', Settings], ['/provider/', 'Provider portal', BriefcaseBusiness]] as const;
export const adminNav = [['/admin/', 'Operations dashboard', LayoutDashboard], ['/admin/providers/', 'Providers & verification', ShieldCheck], ['/admin/customers/', 'Customers', Users], ['/admin/bookings/', 'Bookings', CalendarDays], ['/admin/services/', 'Services & pricing', Layers], ['/admin/payouts/', 'Commissions & payouts', Wallet], ['/admin/transactions/', 'Transactions', CreditCard], ['/admin/reports/', 'Reports & analytics', ChartNoAxesCombined], ['/admin/complaints/', 'Complaints & safety', LifeBuoy], ['/admin/announcements/', 'Announcements', Megaphone], ['/admin/settings/', 'Settings & audit logs', Settings]] as const;
export function Brand() {
  return <Link href="/" className="brand"><img width="34" height="34" src={`${config.basePath}/brand/logo.png`} alt="" /><span>SerbisyoGo</span></Link>;
}
export function Shell({
  children
}: {
  children: ReactNode;
}) {
  const path = usePathname();
  const admin = path.startsWith('/admin');
  const session = useSession();
  const [open, setOpen] = useState(false);
  const nav = admin ? adminNav : publicNav;
  const active = nav.find(n => n[0].split('?')[0] === path) || nav.find(n => n[0] !== '/' && path.startsWith(n[0])) || nav[0];
  const title = path === '/download/' ? 'Download Android app' : path.includes('login') ? 'Sign in' : path.includes('register') ? 'Create an account' : path.includes('preview') ? 'Design preview' : active[1];
  const links = <nav aria-label={admin ? 'Administration' : 'Workspace'}>{nav.map(([href, label, Icon]) => <Link key={href} href={href} className={`nav-item ${active[0] === href ? 'active' : ''}`} aria-current={active[0] === href ? 'page' : undefined} onClick={() => setOpen(false)}><Icon size={17} /><span>{label}</span></Link>)}</nav>;
  return <div className="app-shell"><a className="skip-link" href="#main">Skip to content</a><aside className="sidebar"><Brand /><p className="eyebrow sidebar-label">{admin ? 'Admin workspace' : 'Workspace'}</p>{links}{!admin && <div className="community-note"><strong>A helping hand,<br />close to home.</strong><p>Local skills.<br />Everyday home care.</p><Link href="/download/">Android app <ArrowUpRight size={14} /></Link></div>}<div className="sidebar-bottom">{session.user ? <><p>{admin ? 'Administrator' : String(session.profile?.full_name || 'Your account')}</p><ActionButton action={session.signOut} secondary><LogOut size={14} />Sign out</ActionButton></> : <Link href={admin ? '/admin/login/' : '/login/'}>Sign in <ArrowUpRight size={14} /></Link>}<span className="eyebrow">SERBISYOGO / {admin ? 'ADMIN' : 'WEB'}</span></div></aside><div className="workspace"><header className="topbar"><button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setOpen(true)}><Menu /></button><div className="page-identity"><p className="eyebrow">{admin ? 'Admin' : 'Workspace'} / {title}</p><strong>{title}</strong></div><div className="header-actions">{admin ? <span className="badge">Protected workspace</span> : <><Link href="/download/" className="download-nav"><Download size={16} /><span>Android app</span></Link><ButtonLink href={session.user ? '/find/' : '/login/'}>{session.user ? 'Book a service' : 'Sign in'}</ButtonLink><Link className="account-link" href={session.user ? '/notifications/' : '/register/'} aria-label={session.user ? 'Notifications' : 'Create account'}>{session.user ? <Bell size={18} /> : 'Create account'}</Link></>}</div></header><main id="main" className="main-content">{!backendConfigured && <div className="preview-banner">Development preview <span>• Supabase is not configured. Examples are fictional; private actions require setup.</span><Link href="/preview/">Explore screens →</Link></div>}{children}</main><footer><Brand /><span className="muted small">Local expertise. Everyday home care.</span><div><Link href="/support/">Support</Link><Link href="/privacy/">Privacy</Link><Link href="/terms/">Terms</Link><Link href="/download/">Download Android app</Link></div></footer></div>{open && <Dialog title="Navigation" onClose={() => setOpen(false)}><Brand />{links}<ButtonLink href="/download/">Download Android app</ButtonLink></Dialog>}</div>;
}
