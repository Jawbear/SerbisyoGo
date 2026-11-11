import {test,expect} from '@playwright/test';

test('admin website edits the chosen account and completes a confirmed permanent deletion',async({page})=>{
 const adminId='11000000-0000-4000-8000-000000000001';const id='22000000-0000-4000-8000-000000000001';
 const user={id:adminId,aud:'authenticated',role:'authenticated',email:'admin@example.test'};
 const encode=(value:unknown)=>Buffer.from(JSON.stringify(value)).toString('base64url');
 const token=`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:adminId,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})}.fixture`;
 let rows=[{id,full_name:'Selected Customer',email:'selected@example.test',phone:'+639171234567',role:'customer',status:'active',created_at:'2026-11-11T00:00:00Z',updated_at:'2026-11-11T00:00:00Z',email_confirmed_at:'2026-11-11T00:00:00Z',purge_id:null}];
 const mutations:Record<string,unknown>[]=[];
 await page.route('**/auth/v1/**',route=>route.fulfill({json:route.request().url().includes('/user')?user:{access_token:token,refresh_token:'fixture',expires_in:3600,token_type:'bearer',user}}));
 await page.route('**/rest/v1/**',route=>route.fulfill({json:route.request().url().includes('user_context')?{profile:{id:adminId,full_name:'Test Administrator',status:'active'},role:'admin'}:[]}));
 await page.route('**/functions/v1/admin-accounts*',async route=>{
  const url=new URL(route.request().url());
  if(route.request().method()==='GET')return route.fulfill({json:url.searchParams.has('preview')?{counts:{bookings:2,files:1}}:{rows:url.searchParams.has('id')?rows.filter(row=>row.id===url.searchParams.get('id')):rows,total:rows.length,offset:0,limit:25}});
  const body=route.request().postDataJSON();mutations.push(body);
  if(body.action==='profile'){Object.assign(rows[0],{full_name:body.full_name,updated_at:new Date().toISOString()});return route.fulfill({json:{account:rows[0]}});}
  if(body.action==='delete'){expect(body.confirmation).toBe('selected@example.test');rows=[];return route.fulfill({json:{deleted:true}});}
  throw new Error('Unexpected account mutation');
 });
 await page.goto('/admin/login/?next=%2Fadmin%2Faccounts%2F');await page.getByLabel('Work email',{exact:true}).fill('admin@example.test');await page.getByLabel('Password',{exact:true}).fill('fixture-password');await page.getByRole('button',{name:'Administrator sign in',exact:true}).click();
 await page.getByRole('button',{name:'Manage Selected Customer',exact:true}).click();
 const dialog=page.getByRole('dialog');await dialog.getByLabel('Full name',{exact:true}).fill('Updated Selected Customer');
 const profileForm=dialog.locator('form').filter({has:page.getByRole('button',{name:'Save account changes',exact:true})});
 await profileForm.getByLabel('Reason for this action',{exact:true}).fill('Correct selected customer name');await profileForm.getByRole('button',{name:'Save account changes',exact:true}).click();
 await expect(dialog.getByRole('heading',{name:'Updated Selected Customer',exact:true})).toBeVisible();expect(mutations[0].id).toBe(id);
 await dialog.getByRole('button',{name:'Review permanent deletion',exact:true}).click();
 await dialog.getByLabel('Type selected@example.test to confirm deletion',{exact:true}).fill('selected@example.test');
 const deletion=dialog.locator('form').filter({has:page.getByRole('button',{name:'Permanently erase account and records',exact:true})});
 await deletion.getByLabel('Reason for this action',{exact:true}).fill('Remove disposable UI test account');await deletion.getByRole('checkbox').check();
 page.on('dialog',prompt=>prompt.accept());await deletion.getByRole('button',{name:'Permanently erase account and records',exact:true}).click();
 await expect(page.getByText('The account and its related application records were permanently erased.',{exact:true})).toBeVisible();expect(rows).toEqual([]);
});

