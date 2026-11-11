import { useState } from 'react';
import { Alert, Platform, View } from 'react-native';
import { useApp } from '../AppContext';
import { useAction, useData } from '../hooks';
import { adminApi } from '../data/admin';
import { Badge, Button, Card, Field, Muted, Notice, Query, Title, s } from '../components/ui';
import { AdminForm, AdminScreen, Check, Choice, reasonField } from './ui';

export function AdminAccountsScreen({navigation}) {
  return <AdminScreen navigation={navigation}><Accounts navigation={navigation} /></AdminScreen>;
}
function Accounts({navigation}) {
  const [search,setSearch]=useState('');const [filter,setFilter]=useState('');
  const [role,setRole]=useState('');const [status,setStatus]=useState('');const [offset,setOffset]=useState(0);
  const query=useData(JSON.stringify(['accounts',filter,role,status,offset]),()=>adminApi.accounts({search:filter,role,status,offset:String(offset),limit:'25'}));
  return <><Title>User accounts</Title><Muted>Edit account details, access, and credentials, or permanently erase an account and its related records.</Muted>
    <Button title="Create an account" onPress={()=>navigation.navigate('AdminAccount',{create:true})} />
    <Field label="Search name, email or phone" value={search} onChangeText={setSearch} onSubmitEditing={()=>{setFilter(search);setOffset(0);}} />
    <Button title="Search accounts" secondary onPress={()=>{setFilter(search);setOffset(0);}} />
    <Choice label="Account role" value={role} onChange={value=>{setRole(value);setOffset(0);}} options={[["","All roles"],'customer','provider','admin']} />
    <Choice label="Account status" value={status} onChange={value=>{setStatus(value);setOffset(0);}} options={[["","All statuses"],'active','restricted','deactivated']} />
    <Query query={query}>{query.data&&<><Muted>{query.data.total} account(s)</Muted>{query.data.rows.map(row=><Card key={row.id} style={s.stack}><Title>{row.full_name||'Deletion pending'}</Title><Muted>{row.email||row.id}</Muted><View style={s.row}><Badge>{row.role}</Badge><Badge>{row.purge_id?'Deletion pending':row.status}</Badge></View><Button title={`Manage ${row.full_name||'pending account'}`} secondary onPress={()=>navigation.navigate('AdminAccount',{id:row.id})} /></Card>)}{query.data.total===0&&<Notice>No accounts match your search.</Notice>}<View style={s.between}><Button title="Previous accounts" secondary disabled={offset===0} onPress={()=>setOffset(value=>Math.max(0,value-25))} /><Button title="Next accounts" secondary disabled={offset+25>=query.data.total} onPress={()=>setOffset(value=>value+25)} /></View></>}</Query>
  </>;
}
export function AdminAccountScreen({navigation,route}) {
  return <AdminScreen navigation={navigation}>{route.params?.create?<CreateAccount navigation={navigation} />:<Account id={route.params?.id} navigation={navigation} />}</AdminScreen>;
}
function CreateAccount({navigation}) {
  const app=useApp();
  return <><Title>Create account</Title><Notice>Only mark an email verified after checking ownership. Provider accounts require the provider verification workflow.</Notice><AdminForm submit="Create account" fields={[
    {name:'full_name',label:'Full name'},{name:'email',label:'Email address',email:true,keyboard:'email-address'},
    {name:'phone',label:'Phone number',keyboard:'phone-pad'},
    {name:'password',label:'Initial password (12–128 characters)',secret:true,maxLength:128},
    {name:'role',label:'Role',options:['customer','admin'],value:'customer'},
    {name:'email_verified',label:'I have verified ownership of this email address',check:true},reasonField
  ]} onSubmit={async values=>{const result=await adminApi.accountAction({action:'create',...values});app.refresh();navigation.replace('AdminAccount',{id:result.account.id});}} /></>;
}
function Account({id,navigation}) {
  const query=useData(`account:${id}`,()=>adminApi.account(id),Boolean(id));
  return <Query query={query}>{query.data?<AccountDetails key={`${id}:${query.data.updated_at}:${query.data.purge_id}`} account={query.data} navigation={navigation} refresh={query.retry} />:!query.loading&&<Notice>This account is unavailable.</Notice>}</Query>;
}
function AccountDetails({account,navigation,refresh}) {
  const app=useApp();const self=account.id===app.identity.user.id;const [pending,setPending]=useState(Boolean(account.purge_id));
  const id=account.id;
  return <><Title>{account.full_name||'Account deletion'}</Title><Muted>{account.email||id}</Muted><Badge>{pending?'Deletion pending':`${account.role} · ${account.status}`}</Badge>
    {pending?<Notice error>This account is disabled while permanent deletion is completed. Retry deletion below.</Notice>:<>
      <Card style={s.stack}><Title>Profile and access</Title><AdminForm initial={account} fields={[
        {name:'full_name',label:'Full name'},{name:'phone',label:'Phone number',keyboard:'phone-pad'},
        ...(!self?[{name:'role',label:'Role',options:['customer','provider','admin']},{name:'status',label:'Status',options:['active','restricted','deactivated']}]:[]),reasonField
      ]} onSubmit={values=>adminApi.accountAction({action:'profile',id,status:account.status,role:account.role,...values,updated_at:account.updated_at})} onSaved={()=>{app.refresh();refresh();}} />{self&&<Muted>Your own role and access status cannot be changed here.</Muted>}</Card>
      <Card style={s.stack}><Title>Change email</Title><AdminForm initial={{email:account.email}} fields={[{name:'email',label:'New email address',email:true,keyboard:'email-address'},{name:'email_verified',label:'I have verified ownership of the new email address',check:true},reasonField]} submit="Update email" onSubmit={values=>adminApi.accountAction({action:'email',id,...values})} onSaved={refresh} /></Card>
      {!account.email_confirmed_at&&<Card style={s.stack}><Title>Verify email</Title><AdminForm fields={[{name:'email_verified',label:'I have verified ownership of the current email address',check:true},reasonField]} submit="Mark email verified" onSubmit={values=>adminApi.accountAction({action:'verify_email',id,...values})} onSaved={refresh} /></Card>}
      <Card style={s.stack}><Title>Reset password</Title><AdminForm fields={[{name:'password',label:'New password (12–128 characters)',secret:true,maxLength:128},{name:'password_confirmation',label:'Confirm new password',secret:true,maxLength:128},reasonField]} submit="Set new password" onSubmit={values=>adminApi.accountAction({action:'password',id,...values})} /></Card>
    </>}
    {self?<Notice>You cannot delete your own administrator account.</Notice>:<DeleteAccount account={account} pending={pending} onPending={()=>setPending(true)} onDeleted={()=>{app.refresh();navigation.replace('AdminAccounts');}} />}
  </>;
}
function confirmDeletion() {
  if(Platform.OS==='web')return Promise.resolve(globalThis.confirm('Permanently erase this account and its related records? This cannot be undone.'));
  return new Promise(resolve=>Alert.alert('Permanently erase account?','The account and related records will be erased. This cannot be undone.',[{text:'Cancel',style:'cancel',onPress:()=>resolve(false)},{text:'Erase permanently',style:'destructive',onPress:()=>resolve(true)}],{cancelable:true,onDismiss:()=>resolve(false)}));
}
function DeleteAccount({account,pending,onPending,onDeleted}) {
  const preview=useData(`purge:${account.id}`,()=>adminApi.preview(account.id));
  const [confirmation,setConfirmation]=useState('');const [reason,setReason]=useState('');const [ack,setAck]=useState(false);const action=useAction();
  const expected=pending?account.id:(account.email||account.id);
  return <Card style={s.stack}><Title>Permanent deletion</Title><Notice error>Erases the account, uploaded files, and related bookings, messages, support cases, reviews and financial records. Shared records for these bookings are also removed. Other users’ accounts remain. This cannot be undone.</Notice>
    <Query query={preview}>{preview.data&&Object.entries(preview.data.counts).map(([name,count])=><Muted key={name}>{name.replaceAll('_',' ')}: {count}</Muted>)}</Query>
    <Muted>Type exactly: {expected}</Muted><Field label="Deletion confirmation" value={confirmation} onChangeText={setConfirmation} autoCapitalize="none" autoCorrect={false} />
    <Field label="Reason for permanent deletion" value={reason} onChangeText={setReason} multiline maxLength={1000} />
    <Check label="I understand this permanently erases the account and its related records" checked={ack} onChange={setAck} />
    {action.error&&<Notice error>{action.error}</Notice>}<Button title={pending?'Retry permanent deletion':'Permanently erase account'} danger busy={action.busy} disabled={!ack||confirmation!==expected||reason.trim().length<5||preview.loading||Boolean(preview.error)} onPress={()=>action.run(async()=>{
      if(!await confirmDeletion())return;
      try{const result=await adminApi.accountAction({action:'delete',id:account.id,confirmation,reason});if(!result.deleted)throw new Error('Deletion has not finished. Retry to complete it.');onDeleted();}
      catch(error){if(error.deletionPending)onPending();throw error;}
    })} />
  </Card>;
}
