'use client';

import Link from 'next/link';
import {useState} from 'react';
import {ArrowRight, BookOpen, BriefcaseBusiness, CalendarDays, ShieldCheck, MessageCircle} from 'lucide-react';
import content from '@/content/public-information.json';
import {ButtonLink, Card, Field, useQuery} from '@/components/ui';
import {rpc} from '@/lib/backend';
import {backendConfigured} from '@/lib/config';

export const informationLinks = [['/how-it-works/','How It Works'],['/for-clients/','For Clients'],['/for-workers/','For Workers'],['/faq/','FAQ'],['/contact/','Contact']] as const;
type PageKey=keyof typeof content.pages;
const icons=[BookOpen,CalendarDays,MessageCircle,ShieldCheck,BriefcaseBusiness,ArrowRight];
export function InformationPage({page}:{page:PageKey}) {
 const data=content.pages[page];
 return <div className="information-page"><section className="information-hero"><p className="eyebrow">Local skills. Everyday care. / {data.eyebrow}</p><h1>{data.title}</h1><p>{data.intro}</p><div className="row"><ButtonLink href={page==='for-workers'?'/provider/apply/':'/find/'}>{page==='for-workers'?'Start your provider application':'Find a professional'} <ArrowRight size={16}/></ButtonLink><ButtonLink secondary href="/faq/">Explore the FAQ</ButtonLink></div><div className="information-trust"><span>One shared account</span><span>Clear booking records</span><span>Private document review</span></div></section>
 <nav className="information-tabs" aria-label="Explore SerbisyoGo">{informationLinks.map(([href,label])=><Link key={href} href={href} aria-current={href===`/${page}/`?'page':undefined}>{label}</Link>)}</nav>
 {page==='faq'?<FaqContent/>:page==='contact'?<ContactContent/>:<><div className="section-heading"><div><p className="eyebrow">A clear next step</p><h2>{page==='for-workers'?'From your profile to your next request.':page==='for-clients'?'Make room for a little less worry.':'Your appointment, from start to finish.'}</h2></div></div><div className="information-grid">{'sections' in data&&data.sections.map((section,index)=>{const Icon=icons[index%icons.length];return <Card key={section.title}><div className="information-step"><span>{String(index+1).padStart(2,'0')}</span><Icon size={22}/></div><h2>{section.title}</h2><p className="muted">{section.body}</p></Card>;})}</div><div className="information-callout"><ShieldCheck size={30}/><div><h2>Specific evidence. Clear expectations.</h2><p>Identity review and skills credential review are separate. One accepted document remains enough to submit an application; additional documents are optional.</p></div></div></>}
 <section className="cta-panel"><div><h2>{page==='for-workers'?'Your next chapter starts with your profile.':'Ready to take the next step?'}</h2><p>Keep the conversation, appointment and service record together.</p></div><ButtonLink href={page==='for-workers'?'/provider/apply/':'/find/'}>{page==='for-workers'?'Apply as a provider':'Browse local services'} <ArrowRight size={16}/></ButtonLink></section></div>;
}
function FaqContent(){
 const [search,setSearch]=useState(''),[group,setGroup]=useState('All topics');
 const groups=['All topics',...new Set(content.faq.map(item=>item.group))];
 const items=content.faq.filter(item=>(group==='All topics'||item.group===group)&&`${item.question} ${item.answer}`.toLowerCase().includes(search.trim().toLowerCase()));
 return <section className="faq-layout"><aside><h2>Find your answer</h2><Field label="Search frequently asked questions" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Try documents, price or GCash"/><div className="faq-topics" aria-label="FAQ topics">{groups.map(topic=><button key={topic} onClick={()=>setGroup(topic)} aria-pressed={group===topic}>{topic}</button>)}</div><Link href="/contact/">Still need a hand? Contact us <ArrowRight size={14}/></Link></aside><div><p className="muted small" role="status">{items.length} {items.length===1?'answer':'answers'}</p>{items.map(item=><details key={item.question} className="faq information-answer"><summary>{item.question}</summary><p>{item.answer}</p></details>)}{!items.length&&<Card><h2>No matching answers</h2><p>Try a shorter search or choose All topics.</p><button className="button secondary" onClick={()=>{setSearch('');setGroup('All topics');}}>Clear search and filters</button></Card>}</div></section>;
}
function ContactContent(){
 const q=useQuery('contact-public-settings',()=>rpc<{support_email:string|null}>('public_settings'),backendConfigured);
 const email=q.data?.support_email;
 return <><section className="section-heading"><div><p className="eyebrow">Support that keeps a record</p><h2>How can we help?</h2><p>Use a support case for concerns that need a reply in your account. For existing appointments, include the booking reference.</p></div></section><div className="information-grid">{content.pages.contact.sections.map(section=><Card key={section.title}><MessageCircle className="green"/><h2>{section.title}</h2><p className="muted">{section.body}</p></Card>)}</div><div className="information-callout"><div><h2>Open the support center</h2><p>Sign in to create a case and track replies. Choose an existing booking where applicable.</p>{email&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)&&<p><a href={`mailto:${email}`}>Email {email}</a></p>}</div><ButtonLink href="/support/">Help &amp; support <ArrowRight size={16}/></ButtonLink></div><p className="muted small">For an immediate emergency, contact the appropriate local emergency service. Support cases are not an emergency response channel.</p></>;
}
