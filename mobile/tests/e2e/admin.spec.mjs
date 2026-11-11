import {test,expect} from '@playwright/test';
import {installBackend,signIn} from '../fixtures/backend.mjs';

test('admin edits the selected account and requires confirmation before permanent deletion',async({page})=>{
 const backend=await installBackend(page);backend.role='admin';await page.goto('/sign-in');await signIn(page);
 await page.getByRole('button',{name:'Open administration',exact:true}).click();
 await page.getByRole('button',{name:'User accounts',exact:true}).click();
 await page.getByRole('button',{name:'Manage Managed Customer',exact:true}).click();
 const profile=page.getByRole('textbox',{name:'Full name',exact:true});await profile.fill('Updated Customer');
 await page.getByRole('textbox',{name:'Reason for this action',exact:true}).first().fill('Correct the selected customer name');
 await page.getByRole('button',{name:'Save changes',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Updated Customer',exact:true})).toBeVisible();
 expect(backend.accounts[0].full_name).toBe('Updated Customer');expect(backend.accountActions[0].id).toBe(backend.accounts[0].id);
 const erase=page.getByRole('button',{name:'Permanently erase account',exact:true});await expect(erase).toBeDisabled();
 await page.getByRole('textbox',{name:'Deletion confirmation',exact:true}).fill('managed@example.test');
 await page.getByRole('textbox',{name:'Reason for permanent deletion',exact:true}).fill('Remove disposable test account and records');
 await page.getByRole('checkbox',{name:'I understand this permanently erases the account and its related records',exact:true}).check();
 backend.failDelete=true;page.on('dialog',dialog=>dialog.accept());await erase.click();
 await expect(page.getByRole('alert').filter({hasText:'Permanent deletion is incomplete'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Retry permanent deletion',exact:true})).toBeDisabled();
 await page.getByRole('textbox',{name:'Deletion confirmation',exact:true}).fill(backend.accounts[0].id);
 backend.failDelete=false;await page.getByRole('button',{name:'Retry permanent deletion',exact:true}).click();
 await expect(page.getByText('No accounts match your search.',{exact:true})).toBeVisible();expect(backend.accounts).toEqual([]);
});
test('customer cannot open admin account controls through a direct URL',async({page})=>{
 const backend=await installBackend(page);await page.goto('/sign-in');await signIn(page);await page.goto('/admin/accounts');
 await expect(page.getByRole('heading',{name:'Administrator access required.',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Create an account',exact:true})).toHaveCount(0);expect(backend.accountActions).toEqual([]);
});
