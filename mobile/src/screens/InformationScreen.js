import {useState} from 'react';
import {Linking,Text,View} from 'react-native';
import content from '../content/public-information.json';
import {useApp} from '../AppContext';
import {useData} from '../hooks';
import {websiteUrl} from '../data/backend';
import {Button,Card,Chip,Field,Label,Muted,Screen,Title,s} from '../components/ui';

export const informationLinks=[['how-it-works','How It Works'],['for-clients','For Clients'],['for-workers','For Workers'],['faq','FAQ'],['contact','Contact']];
export default function InformationScreen({navigation,route}){
 const {api}=useApp(),requested=route.params?.page;
 const page=Object.prototype.hasOwnProperty.call(content.pages,requested||'')?requested:'how-it-works',data=content.pages[page];
 const [search,setSearch]=useState(''),[topic,setTopic]=useState('All topics'),[expanded,setExpanded]=useState(null);
 const contact=useData('information-contact',()=>api.publicContact?api.publicContact():Promise.resolve(null),page==='contact');
 const items=content.faq.filter(item=>(topic==='All topics'||item.group===topic)&&`${item.question} ${item.answer}`.toLowerCase().includes(search.toLowerCase().trim()));
 return <Screen><Label>{data.eyebrow}</Label><Title>{data.title}</Title><Muted>{data.intro}</Muted><View style={[s.row,{flexWrap:'wrap'}]}>{informationLinks.map(([key,label])=><Chip key={key} title={label} selected={page===key} onPress={()=>navigation.navigate('Information',{page:key})}/>)}</View>{page==='faq'?<><Field label="Search frequently asked questions" value={search} onChangeText={setSearch} placeholder="Documents, price or GCash"/><View style={[s.row,{flexWrap:'wrap'}]}>{['All topics',...new Set(content.faq.map(item=>item.group))].map(group=><Chip key={group} title={group} selected={topic===group} onPress={()=>setTopic(group)}/>)}</View><Muted>{items.length} answers</Muted>{items.map(item=><Card key={item.question} style={s.stack}><Button title={item.question} secondary onPress={()=>setExpanded(expanded===item.question?null:item.question)}/>{expanded===item.question&&<Muted>{item.answer}</Muted>}</Card>)}{!items.length&&<Button title="Clear search and filters" onPress={()=>{setSearch('');setTopic('All topics');}}/>}</>:data.sections?.map((section,index)=><Card key={section.title} style={s.stack}><Label>{String(index+1).padStart(2,'0')}</Label><Text style={s.sectionTitle}>{section.title}</Text><Muted>{section.body}</Muted></Card>)}{page==='contact'?<Card style={s.stack}><Text style={s.sectionTitle}>Support that keeps a record</Text><Muted>Sign in on the website to open a support case and follow replies. Include your booking reference when relevant.</Muted><Button title="Open support center" onPress={()=>Linking.openURL(`${websiteUrl}/support/`)}/>{contact.data?.support_email&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.data.support_email)&&<Button title="Email support" secondary onPress={()=>Linking.openURL(`mailto:${contact.data.support_email}`)}/>}</Card>:<Button title={page==='for-workers'?'Start your provider application':'Find a professional'} onPress={()=>navigation.navigate(page==='for-workers'?'ProviderVerification':'FindProfessionals')}/>}</Screen>;
}
