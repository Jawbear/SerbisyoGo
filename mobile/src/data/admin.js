import { Linking, Platform } from 'react-native';
import { supabase, supabaseUrl, publishableKey, boundedFetch } from './backend';

export const adminSections = [
  ['accounts','User accounts','people-outline'], ['providers','Providers & verification','shield-checkmark-outline'],
  ['bookings','Bookings','calendar-outline'], ['categories','Service categories','grid-outline'],
  ['services','Service pricing','construct-outline'], ['cases','Support cases','chatbubbles-outline'],
  ['announcements','Announcements','megaphone-outline'], ['payments','Payments & settlement','card-outline'],
  ['refunds','Refund requests','return-down-back-outline'], ['payouts','Payout requests','wallet-outline'],
  ['ledger','Commission ledger','receipt-outline'], ['reports','Reports','bar-chart-outline'],
  ['settings','Platform settings','settings-outline'], ['releases','Android releases','logo-android'], ['audit','Audit logs','list-outline']
];
const tables = { providers:'provider_profiles',bookings:'bookings',categories:'categories',services:'provider_services',cases:'support_cases',announcements:'announcements',payments:'payments',refunds:'refund_requests',payouts:'payout_requests',ledger:'commission_ledger',settings:'app_settings',releases:'app_releases',audit:'audit_logs' };
function client() { if (!supabase) throw new Error('The service connection is not configured.'); return supabase; }
async function result(query) { const response=await query.retry(false);if(response.error)throw new Error(response.error.message);return response.data; }
async function guard() { if (!await result(client().rpc('is_admin'))) throw new Error('Administrator access required.'); }
async function request(name, body, query='', timeout=20000) {
  const { data:{session}, error }=await client().auth.getSession();
  if(error||!session)throw new Error('Sign in with an active administrator account.');
  const form=body instanceof FormData;
  const response=await boundedFetch(`${supabaseUrl}/functions/v1/${name}${query}`,{method:body?'POST':'GET',headers:{apikey:publishableKey,Authorization:`Bearer ${session.access_token}`,...(body&&!form?{'Content-Type':'application/json'}:{})},body:body?(form?body:JSON.stringify(body)):undefined},timeout);
  const value=await response.json();if(!response.ok){const error=new Error(value.error||'Administrative action failed.');error.deletionPending=value.deletion_pending===true;throw error;}return value;
}
export const adminApi = {
  accounts: params => request('admin-accounts',undefined,`?${new URLSearchParams(params)}`),
  account: async id => (await request('admin-accounts',undefined,`?id=${encodeURIComponent(id)}`)).rows[0]||null,
  preview: id => request('admin-accounts',undefined,`?preview=${encodeURIComponent(id)}`),
  accountAction: body => request('admin-accounts',body,'',body.action==='delete'?120000:20000),
  records: async (kind,offset=0) => {
    await guard(); const table=tables[kind];if(!table)throw new Error('Unknown administrative section.');
    const response=await client().from(table).select('*',{count:'exact'}).order('created_at',{ascending:false}).range(offset,offset+49).retry(false);
    if(response.error)throw new Error(response.error.message);return {rows:response.data||[],total:response.count||0};
  },
  record: async (kind,id) => {
    await guard();const table=tables[kind];if(!table)throw new Error('Unknown administrative record.');
    const row=await result(client().from(table).select('*').eq('id',id).maybeSingle());if(!row)return null;
    const extra={};
    if(kind==='providers'){
      extra.applications=await result(client().from('provider_applications').select('*').eq('provider_id',id).order('created_at',{ascending:false}));
      extra.files=await result(client().from('files').select('*').eq('owner_id',id).eq('kind','verification'));
    }
    if(kind==='cases'){
      extra.messages=await result(client().from('case_messages').select('*').eq('case_id',id).order('created_at'));
      extra.notes=await result(client().from('case_notes').select('*').eq('case_id',id).order('created_at'));
    }
    return {row,...extra};
  },
  action: async (entity,id,action,data={}) => { await guard();return result(client().rpc('admin_action',{p_entity:entity,p_id:id||null,p_action:action,p_data:data})); },
  rpc: async (name,args) => { await guard();return result(client().rpc(name,args)); },
  report: async (from,to) => {
    await guard();const end=new Date(`${to}T00:00:00+08:00`);if(!Number.isFinite(end.getTime()))throw new Error('Choose valid report dates.');
    return result(client().rpc('admin_report',{p_from:`${from}T00:00:00+08:00`,p_to:new Date(end.getTime()+86400000).toISOString()}));
  },
  openFile: async id => { const data=await request('files',undefined,`?id=${encodeURIComponent(id)}`);if(!data.url?.startsWith('https://'))throw new Error('The file link is unavailable.');await Linking.openURL(data.url); },
  uploadApk: async (asset,values) => {
    if(!asset||!asset.name?.toLowerCase().endsWith('.apk')||asset.size>52428800)throw new Error('Choose an APK file up to 50 MB.');
    const form=new FormData();
    form.append('file',Platform.OS==='web'?asset.file:{uri:asset.uri,name:asset.name,type:'application/vnd.android.package-archive'});
    for(const [key,value] of Object.entries(values))form.append(key,String(value));
    return request('releases',form,'',120000);
  }
};
