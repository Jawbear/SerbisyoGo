import { test, expect } from '@playwright/test';
import { installBackend } from '../fixtures/backend.mjs';
import { locationUrl, locationError } from '../../src/data/locations.js';

test('location picker displays loading, HTTP error, empty and refreshed records',async({page})=>{
  await installBackend(page);
  let requests=0;
  let resume;
  const release = new Promise(resolve=>{resume=resolve;});
  await page.route(locationUrl, async route=>{
    requests++;
    if(requests===1){await release;return route.fulfill({status:503,body:''});}
    return route.fulfill({json:{data:requests===2?[]:[{code:'1600302000',name:'Bunawan'}]}});
  });
  await page.goto('/find');
  const button=name=>page.getByRole('button',{name,exact:true});
  await button('Choose municipality').click();
  await expect(page.getByText('Loading available locations...')).toBeVisible();
  resume();
  await expect(page.getByText(locationError)).toBeVisible();
  await button('Retry').click();
  await expect(page.getByText('No locations available.')).toBeVisible();
  await button('Refresh locations').click();
  await button('Bunawan').click();
  await button('Plumbing').click();
  await expect(button('View Francis Romay')).toBeVisible();
  await expect(button('View Art Ecleo')).toHaveCount(0);
  expect(requests).toBe(3);
});

test('saved service filters can be restored, edited and deleted across reloads during a location outage', async ({ page }) => {
  await installBackend(page);
  await page.route(locationUrl, route => route.fulfill({
    json: { data: [{ code: '1600302000', name: 'Bunawan' }] }
  }));
  const button = name => page.getByRole('button', { name, exact: true });
  const label = page.getByLabel('Search label (optional)', { exact: true });
  await page.goto('/find');
  await button('Plumbing').click();
  await button('Choose municipality').click();
  await button('Bunawan').click();
  await button('Saved searches').click();
  await label.fill('Workshop');
  await button('Save search').click();
  await expect(page.getByText('Search saved on this device.')).toBeVisible();

  await page.unroute(locationUrl);
  await page.route(locationUrl, route => route.abort('internetdisconnected'));
  await page.reload();
  await expect(page.getByText('Municipality: Bunawan')).toBeVisible();
  await button('Change municipality').click();
  await expect(page.getByText(locationError)).toBeVisible();
  await button('Saved searches').click();
  await expect(page.getByText('Workshop', { exact: true })).toBeVisible();
  await button('Edit').click();
  await expect(page.getByText('Municipality: Bunawan')).toBeVisible();
  await label.fill('Garage');
  await button('Update saved search').click();
  await expect(page.getByText('Saved search updated.')).toBeVisible();

  await page.reload();
  await button('Saved searches').click();
  await expect(page.getByText('Garage', { exact: true })).toBeVisible();
  await expect(button('Edit')).toHaveCount(1);
  await button('Delete').click();
  await button('Confirm delete').click();
  await expect(page.getByText('Saved search deleted.')).toBeVisible();
  await page.reload();
  await button('Saved searches').click();
  await expect(page.getByText('No saved searches on this device.')).toBeVisible();
});
