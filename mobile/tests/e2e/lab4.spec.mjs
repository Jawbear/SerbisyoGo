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
