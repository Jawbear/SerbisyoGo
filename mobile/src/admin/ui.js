import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useApp } from '../AppContext';
import { useAction } from '../hooks';
import { Badge, Button, Card, Chip, Field, Muted, Notice, Screen, Title, s } from '../components/ui';
import { colors as c } from '../theme';

export function AdminScreen({children,navigation}) {
  const {identity,authLoading}=useApp();
  return <Screen>{authLoading?<Muted>Checking administrator access…</Muted>:identity?.role==='admin'?children:<Card style={s.stack}><Title>Administrator access required.</Title><Muted>Sign in with an authorized administrator account to manage SerbisyoGo.</Muted><Button title="Administrator sign in" onPress={()=>navigation.navigate('SignIn',{returnTo:'AdminHome'})} /><Button title="Return to Home" secondary onPress={()=>navigation.navigate('Home')} /></Card>}</Screen>;
}
export const reasonField={name:'reason',label:'Reason for this action',multiline:true,maxLength:1000};
export function Check({label,checked,onChange}) {
  return <Pressable accessibilityRole="checkbox" accessibilityLabel={label} accessibilityState={{checked}} onPress={()=>onChange(!checked)} style={[s.row,{minHeight:48,paddingVertical:8}]}><Text style={{color:checked?c.green:c.muted,fontSize:24}}>{checked?'☑':'☐'}</Text><Muted style={s.flex}>{label}</Muted></Pressable>;
}
export function Choice({label,options,value,onChange}) {
  return <View style={{gap:10}}><Text style={s.fieldLabel}>{label}</Text><View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{options.map(option=>{const [id,title]=Array.isArray(option)?option:[option,option];return <Chip key={id} title={title} selected={value===id} onPress={()=>onChange(id)} />;})}</View></View>;
}
export function AdminForm({fields,initial={},submit='Save changes',onSubmit,onSaved,danger=false,disabled=false}) {
  const [values,setValues]=useState(()=>Object.fromEntries(fields.map(field=>[field.name,initial[field.name]??field.value??(field.check?false:'')])));
  const [saved,setSaved]=useState(false);const action=useAction();
  const set=(name,value)=>setValues(previous=>({...previous,[name]:value}));
  return <View style={s.stack}>{fields.map(field=>field.check?<Check key={field.name} label={field.label} checked={Boolean(values[field.name])} onChange={value=>set(field.name,value)} />:field.options?<Choice key={field.name} label={field.label} options={field.options} value={values[field.name]} onChange={value=>set(field.name,value)} />:<Field key={field.name} label={field.label} value={String(values[field.name]??'')} onChangeText={value=>set(field.name,value)} editable={!disabled&&!field.readOnly&&!action.busy} multiline={field.multiline} secureTextEntry={field.secret} keyboardType={field.keyboard||'default'} autoCapitalize={field.email||field.secret?'none':'sentences'} autoCorrect={!field.email&&!field.secret} maxLength={field.maxLength||250} />)}
    {action.error&&<Notice error>{action.error}</Notice>}{saved&&<Notice>Changes saved.</Notice>}
    <Button title={submit} danger={danger} disabled={disabled} busy={action.busy} onPress={()=>action.run(async()=>{setSaved(false);await onSubmit(values);setSaved(true);onSaved?.();})} />
  </View>;
}
export function RecordFields({row}) {
  const hidden=new Set(['id','avatar_path','artifact_path','verified_at','updated_at','idempotency_key']);
  return <Card style={s.stack}>{Object.entries(row).filter(([key,value])=>!hidden.has(key)&&value!==null&&value!==undefined).map(([key,value])=><View key={key} style={{gap:4}}><Muted>{key.replaceAll('_',' ')}</Muted>{['status','role'].includes(key)?<Badge>{String(value)}</Badge>:<Text selectable style={{color:c.text,lineHeight:22}}>{typeof value==='object'?JSON.stringify(value,null,2):String(value)}</Text>}</View>)}</Card>;
}
