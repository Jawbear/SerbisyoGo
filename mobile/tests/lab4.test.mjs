import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { loadLocations, locationError } from '../src/data/locations.js';
import { createSearchStore } from '../src/data/searchStore.js';
import { filterProviders } from '../src/domain.js';
import { fixtureCatalog } from './fixtures/catalog.mjs';

const bunawan = { code: '1600302000', name: 'Bunawan' };
const search = { categoryId: 'plumbing', categoryName: 'Plumbing', cityCode: bunawan.code, city: bunawan.name, label: 'Home' };
const response = data => async () => ({ ok: true, json: async () => ({ data }) });
test('network adapter sorts, deduplicates and distinguishes an empty response', async () => {
  const rows = [bunawan, {code:'1600301000',name:'Bayugan'}, bunawan];
  assert.deepEqual((await loadLocations(undefined, response(rows))).map(r => r.name), ['Bayugan','Bunawan']);
  assert.deepEqual(await loadLocations(undefined, response([])), []);
});
test('HTTP, network, malformed JSON, invalid records and timeouts produce a useful error', async () => {
  for (const request of [
    async () => ({ok:false}), async () => { throw Error(); },
    async () => ({ok:true,json:()=>JSON.parse('{')}), response({}), response([{}]),
    (_, {signal}) => new Promise((_,reject) => signal.addEventListener('abort',reject))
  ]) await assert.rejects(loadLocations(undefined,request,15), {message:locationError});
});
test('saved searches survive reopening the store and update in place', async () => {
  let raw=null;
  const disk={getItem: async()=>raw,setItem:async(_,v)=>{raw=v;}};
  const open=()=>createSearchStore(disk,randomUUID);
  const store=open();
  assert.deepEqual(await store.getSavedPreferences(),[]);
  const [row]=await store.savePreference(search);
  assert.deepEqual(await open().getSavedPreferences(),[row]);
  await assert.rejects(store.savePreference(search),/already saved/);
  const [updated]=await open().updatePreference(row.id,{...search,label:'Workshop',categoryId:'repair',categoryName:'Repair'});
  assert.equal(updated.id,row.id);
  assert.deepEqual(await open().getSavedPreferences(),[updated]);
  await open().deletePreference(row.id);
  assert.deepEqual(await open().getSavedPreferences(),[]);
});
test('failed storage and corrupt JSON are reported without replacing saved content',async()=>{
  let raw='bad';
  const store=createSearchStore({getItem:async()=>raw,setItem:async()=>{throw Error();}},randomUUID);
  await assert.rejects(store.savePreference(search),/preserved/);
  assert.equal(raw,'bad');
  raw='[]';
  await assert.rejects(store.savePreference({...search,city:''}),/municipality/);
  await assert.rejects(store.savePreference(search),/Could not save/);
  await assert.rejects(store.updatePreference('missing',search),/no longer exists/);
  const broken=createSearchStore({getItem:async()=>{throw Error();}},randomUUID);
  await assert.rejects(broken.getSavedPreferences(),/Cannot access/);
});
test('concurrent changes preserve distinct records',async()=>{
  let raw=null;
  const store=createSearchStore({getItem:async()=>raw,setItem:async(_,v)=>{raw=v;}},randomUUID);
  await Promise.all([store.savePreference(search),store.savePreference({...search,categoryId:'carpentry',categoryName:'Carpentry'})]);
  assert.equal((await store.getSavedPreferences()).length,2);
});
test('municipality combines with service and text including service coverage and city aliases',()=>{
  const catalog={...fixtureCatalog,providers:fixtureCatalog.providers.map(p=>({...p,service_areas:['Bayugan City, Agusan del Sur']}))};
  assert.equal(filterProviders(catalog,'Francis','category-2','City of Bayugan').length,1);
  assert.equal(filterProviders(catalog,'','category-2','Esperanza').length,0);
});
