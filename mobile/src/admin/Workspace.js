import { useState } from 'react';
import { Share, View } from 'react-native';
import * as Crypto from 'expo-crypto';
import * as DocumentPicker from 'expo-document-picker';
import { adminApi, adminSections } from '../data/admin';
import { useData } from '../hooks';
import { manilaDay } from '../domain';
import { Button, Card, Field, Muted, Notice, Query, Title, s } from '../components/ui';
import { AdminForm, AdminScreen, RecordFields, reasonField } from './ui';

export function AdminHomeScreen({navigation}) {
  return <AdminScreen navigation={navigation}><Title>Administration</Title><Muted>Manage SerbisyoGo accounts, services, bookings, and platform operations.</Muted>{adminSections.map(([kind,title,icon])=><Button key={kind} title={title} icon={icon} secondary onPress={()=>navigation.navigate(kind==='accounts'?'AdminAccounts':kind==='reports'?'AdminReports':'AdminRecords',{kind})} />)}</AdminScreen>;
}
export function AdminRecordsScreen({navigation,route}) {
  return <AdminScreen navigation={navigation}><Records navigation={navigation} kind={route.params?.kind} /></AdminScreen>;
}
function Records({navigation,kind}) {
  const [offset,setOffset]=useState(0);const query=useData(`admin:${kind}:${offset}`,()=>adminApi.records(kind,offset));
  return <><Title>{adminSections.find(([key])=>key===kind)?.[1]||'Administration'}</Title>
    {['categories','announcements','settings','releases'].includes(kind)&&<Button title="Create new record" onPress={()=>navigation.navigate('AdminRecord',{kind,create:true})} />}
    <Query query={query}>{query.data&&<><Muted>{query.data.total} record(s)</Muted>{query.data.rows.map(row=><Card key={row.id} style={s.stack}><Muted>{row.full_name||row.display_name||row.title||row.name||row.reference||row.version_name||row.action||row.id}</Muted>{row.status&&<Muted>{row.status}</Muted>}<Button title="View and manage record" secondary onPress={()=>navigation.navigate('AdminRecord',{kind,id:row.id})} /></Card>)}{!query.data.total&&<Notice>No records in this section.</Notice>}<View style={s.between}><Button title="Previous records" secondary disabled={!offset} onPress={()=>setOffset(value=>Math.max(0,value-50))} /><Button title="Next records" secondary disabled={offset+50>=query.data.total} onPress={()=>setOffset(value=>value+50)} /></View></>}</Query>
  </>;
}
export function AdminRecordScreen({navigation,route}) {
  return <AdminScreen navigation={navigation}>{route.params?.create?<RecordEditor kind={route.params.kind} row={{}} refresh={()=>navigation.goBack()} />:<Record navigation={navigation} kind={route.params?.kind} id={route.params?.id} />}</AdminScreen>;
}
function Record({navigation,kind,id}) {
  const query=useData(`admin-record:${kind}:${id}`,()=>adminApi.record(kind,id),Boolean(id));
  return <Query query={query}>{query.data?<><Title>Manage record</Title><RecordFields row={query.data.row} />{kind==='providers'&&<Button title="Manage provider account" onPress={()=>navigation.navigate('AdminAccount',{id})} />}<RecordEditor kind={kind} row={query.data.row} extra={query.data} refresh={query.retry} /></>:!query.loading&&<Notice>This record is unavailable.</Notice>}</Query>;
}
const text=(name,label,extra={})=>({name,label,...extra});
const choice=(name,label,options,value)=>({name,label,options,value});
function RecordEditor({kind,row,extra={},refresh}) {
  const [event]=useState(()=>Crypto.randomUUID());
  const form=(title,entity,operation,fields,initial=row,id=row.id)=><Card key={title} style={s.stack}><Title>{title}</Title><AdminForm fields={fields} initial={initial} onSubmit={values=>adminApi.action(entity,id,operation,values)} onSaved={refresh} /></Card>;
  if(kind==='categories')return <>{form('Category details','category','save',[...(!row.id?[text('slug','Unique category slug')]:[]),text('name','Category name'),text('description','Description',{multiline:true}),{name:'active',label:'Active category',check:true,value:true}])}{row.id&&form('Archive category','category','archive',[reasonField])}</>;
  if(kind==='services')return <>{form('Service pricing','service','save',[text('rate_centavos','Price in centavos',{keyboard:'numeric'}),text('duration_minutes','Duration in minutes',{keyboard:'numeric'}),choice('pricing_mode','Pricing mode',['fixed','quote']),{name:'active',label:'Active service',check:true}])}{form('Archive service','service','archive',[reasonField])}</>;
  if(kind==='announcements')return <>{form('Announcement','announcement','save',[text('title','Title'),text('body','Announcement body',{multiline:true,maxLength:10000}),choice('audience','Audience',['everyone','customers','providers'],'everyone'),choice('status','Publication status',['draft','published'],'draft'),text('publish_at','Publication time (ISO date with time zone)')])}{row.id&&form('Archive announcement','announcement','archive',[reasonField])}</>;
  if(kind==='settings')return <><Notice>Fees are in centavos; commission is in basis points (100 basis points = 1%). Activation creates a new settings version.</Notice>{['draft','activate'].map(operation=>form(operation==='draft'?'Save draft settings':'Activate new settings','settings',operation,[text('fee_centavos','Platform fee in centavos',{keyboard:'numeric'}),text('commission_bps','Commission in basis points',{keyboard:'numeric'}),text('support_email','Support email',{email:true}),reasonField]))}</>;
  if(kind==='cases')return <>{form('Case status','case','update',[choice('status','Case status',['open','reviewing','resolved','closed']),choice('priority','Priority',['low','normal','high','urgent']),text('resolution','Recorded resolution',{multiline:true,maxLength:3000})])}{form('Reply to customer','case','reply',[text('body','Public reply',{multiline:true,maxLength:3000})],{})}{form('Internal staff note','case','note',[text('body','Internal note',{multiline:true,maxLength:3000})],{})}{[...(extra.messages||[]),...(extra.notes||[])].map(item=><RecordFields key={item.id} row={item} />)}</>;
  if(kind==='providers')return <>{(extra.files||[]).map(file=><FileButton key={file.id} file={file} />)}{(extra.applications||[]).map(application=><Card key={application.id} style={s.stack}><RecordFields row={application} />{application.status==='pending'&&['approve','request_changes'].map(operation=>form(operation==='approve'?'Approve provider application':'Request application changes','provider',operation,[reasonField],{},application.id))}</Card>)}{form('Suspend provider','provider','suspend',[reasonField])}</>;
  if(kind==='bookings')return <>{['cancelled','declined'].map(operation=>form(`${operation} booking`,'booking',operation,[reasonField],{}))}</>;
  if(kind==='refunds')return <><Notice>These actions review a refund request. Record an actual refund from the corresponding payment after verifying it.</Notice>{['reviewing','rejected'].map(operation=>form(`Mark ${operation}`,'refund',operation,[reasonField],{}))}</>;
  if(kind==='payouts')return <><Notice>Approval does not transfer money. Record a transfer only after verifying that it was completed.</Notice>{['approve','reject','record_transfer'].map(operation=>form(operation.replaceAll('_',' '),'payout',operation,[...(operation==='record_transfer'?[text('transfer_reference','Verified transfer reference')]:[]),reasonField],{}))}</>;
  if(kind==='payments')return <Card style={s.stack}><Title>Record verified settlement</Title><Notice>This records an actual payment or refund. It does not move money.</Notice><AdminForm submit="Record verified settlement" fields={[choice('status','Settlement',['paid','refunded'],'paid'),choice('method','Payment method',['cash','manual_platform'],'cash'),text('reason','Settlement reference and explanation',{multiline:true,maxLength:1000}),{name:'verified',label:'I verified that this payment or refund actually occurred',check:true}]} onSubmit={values=>{if(!values.verified)throw new Error('Verify the actual settlement first.');return adminApi.rpc('settle_payment',{p_payment:row.id,p_event:event,p_status:values.status,p_method:values.method,p_reason:values.reason});}} onSaved={refresh} /></Card>;
  if(kind==='releases')return <ReleaseEditor row={row} refresh={refresh} />;
  return <Muted>This history is available for review.</Muted>;
}
function FileButton({file}) {
  const [error,setError]=useState('');
  return <><Button title={`Open ${file.original_name||'verification document'}`} secondary onPress={()=>adminApi.openFile(file.id).catch(failure=>setError(failure.message))} />{error&&<Notice error>{error}</Notice>}</>;
}
function ReleaseEditor({row,refresh}) {
  if(!row.id)return <Card style={s.stack}><Title>Upload Android release</Title><Muted>Choose a signed APK up to 50 MB. Its manifest must match the release metadata.</Muted><AdminForm submit="Choose APK and upload draft" fields={[text('version_name','Version name (for example 0.2.0)'),text('version_code','Version code',{keyboard:'numeric'}),text('min_android','Minimum Android version'),text('release_notes','Release notes',{multiline:true,maxLength:10000})]} onSubmit={async values=>{const picked=await DocumentPicker.getDocumentAsync({type:'*/*',copyToCacheDirectory:true,multiple:false});if(picked.canceled)throw new Error('No APK selected.');await adminApi.uploadApk(picked.assets[0],values);}} onSaved={refresh} /></Card>;
  return <><AdminForm submit="Save release notes" initial={row} fields={[text('release_notes','Release notes',{multiline:true,maxLength:10000})]} onSubmit={values=>adminApi.rpc('update_release_notes',{p_release:row.id,p_notes:values.release_notes})} onSaved={refresh} />{[false,true].map(archive=><AdminForm key={String(archive)} submit={archive?'Archive release':'Publish verified release'} fields={[{name:'confirmed',label:archive?'Archive this release':'I reviewed the verified APK and release metadata',check:true}]} onSubmit={values=>{if(!values.confirmed)throw new Error('Confirm this release action.');return adminApi.rpc('publish_release',{p_release:row.id,p_archive:archive});}} onSaved={refresh} />)}</>;
}
export function AdminReportsScreen({navigation}) {
  return <AdminScreen navigation={navigation}><Reports /></AdminScreen>;
}
function Reports() {
  const [from,setFrom]=useState(()=>manilaDay(new Date(),-29));const [to,setTo]=useState(()=>manilaDay());
  const [range,setRange]=useState(()=>({from,to}));const query=useData(JSON.stringify(['admin-report',range]),()=>adminApi.report(range.from,range.to));
  return <><Title>Reports</Title><Field label="From date (YYYY-MM-DD)" value={from} onChangeText={setFrom} /><Field label="To date (YYYY-MM-DD)" value={to} onChangeText={setTo} /><Button title="Load report" onPress={()=>setRange({from,to})} /><Query query={query}>{query.data&&<><RecordFields row={query.data} /><Button title="Share report" secondary onPress={()=>Share.share({message:JSON.stringify({from:range.from,to:range.to,...query.data},null,2)}).catch(()=>{})} /></>}</Query></>;
}
