import { test, expect } from '@playwright/test';
import { installBackend, signIn } from '../fixtures/backend.mjs';

test('customer edits their shared profile and opens a support request', async ({ page }) => {
  await installBackend(page);
  let profile;
  const cases = [];
  await page.route('**/rest/v1/support_cases*', route => route.fulfill({ json:cases }));
  await page.route('**/rest/v1/case_messages*', route => route.fulfill({ json:[] }));
  await page.route('**/rest/v1/rpc/save_profile', route => {
    profile = route.request().postDataJSON(); return route.fulfill({ status:204 });
  });
  await page.route('**/rest/v1/rpc/open_case', route => {
    const input = route.request().postDataJSON();
    cases.push({id:'case-1',subject:input.p_subject,body:input.p_body,created_at:'2026-11-01T02:00:00Z',status:'open'});
    return route.fulfill({ json:'case-1' });
  });
  await page.goto('/sign-in'); await signIn(page);
  await page.getByRole('button',{name:'Navigate to Profile'}).click();
  await page.getByLabel('Full name',{exact:true}).fill('Updated Customer');
  await page.getByLabel('Mobile number',{exact:true}).fill('09171234567');
  await page.getByRole('button',{name:'Save profile'}).click();
  await expect(page.getByText('Profile saved.',{exact:true})).toBeVisible();
  expect(profile).toMatchObject({p_name:'Updated Customer',p_phone:'+639171234567'});
  await page.getByRole('button',{name:'My support requests'}).click();
  await page.getByLabel('Subject',{exact:true}).fill('Booking question');
  await page.getByLabel('Describe your concern').fill('Please check the service request.');
  await page.getByRole('button',{name:'Send support request'}).click();
  await expect(page.getByText('Booking question',{exact:true})).toBeVisible();
  await expect(page.getByLabel('Reply to support')).toBeVisible();
});

test('provider workspace retains split shifts and updates service pricing', async ({ page }) => {
  const state = await installBackend(page); state.role='provider';
  await page.route('**/rest/v1/provider_profiles*',route => route.fulfill({json:{id:'provider-1',status:'approved'}}));
  const week = [{ weekday:1, starts_minute:480, ends_minute:660 },{weekday:1,starts_minute:780,ends_minute:900}];
  await page.route('**/rest/v1/weekly_availability*',route => route.fulfill({json:week}));
  let service, hours;
  await page.route('**/rest/v1/rpc/save_provider_service',route => {service=route.request().postDataJSON();return route.fulfill({json:'service-2'});});
  await page.route('**/rest/v1/rpc/save_availability',route => {hours=route.request().postDataJSON();return route.fulfill({status:204});});
  await page.goto('/sign-in'); await signIn(page);
  await page.getByRole('button',{name:'Manage services and hours'}).click();
  await page.getByRole('button',{name:'Add a service',exact:true}).click();
  await page.getByLabel('Service title').fill('Sink repair');
  await page.getByLabel('Labor price (₱)').fill('750.50');
  await page.getByRole('button',{name:'Save service', exact:true}).click();
  await expect(page.getByText('Service saved.',{exact:true})).toBeVisible();
  expect(service).toMatchObject({p_rate:75050,p_title:'Sink repair',p_mode:'fixed',p_active:true});
  await page.getByLabel('From',{exact:true}).first().fill('07:30');
  await page.getByRole('button',{name:'Save weekly hours'}).click();
  await expect(page.getByText('Weekly hours saved.',{exact:true})).toBeVisible();
  expect(hours.p_week).toEqual([{...week[0],starts_minute:450},week[1]]);
});
