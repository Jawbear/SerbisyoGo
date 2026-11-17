import {test,expect} from '@playwright/test';
import {publicFixtures} from './public-fixtures';
test.beforeEach(async({page})=>{await publicFixtures(page);});
test('all five public guides have working navigation and fit the viewport',async({page},testInfo)=>{
 for(const route of ['how-it-works','for-clients','for-workers','faq','contact']){
  await page.goto(`/${route}/`);await expect(page.locator('main h1')).toHaveCount(1);
  await expect(page.getByRole('navigation',{name:'Explore SerbisyoGo'})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  if(route==='how-it-works'||route==='faq')await page.screenshot({path:testInfo.outputPath(`${route}.png`),fullPage:true});
 }
 await expect(page.getByRole('link',{name:'Help & support',exact:true})).toHaveAttribute('href','/support/');
});
test('FAQ search and topics explain the one-document and separate badge rules',async({page})=>{
 await page.goto('/faq/');await page.getByLabel('Search frequently asked questions').fill('every document');
 const answer=page.locator('details').filter({hasText:'Do workers need to upload every document?'});
 await answer.locator('summary').click();await expect(answer).toContainText('One accepted ID or credential');
 await page.getByLabel('Search frequently asked questions').fill('zzzz-no-results');await expect(page.getByText('No matching answers',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Clear search and filters'}).click();await page.getByRole('button',{name:'Provider documents',exact:true}).click();
 await expect(page.locator('details')).toHaveCount(4);
 const identity=page.locator('details').filter({hasText:'What does Identity reviewed mean?'});await identity.locator('summary').click();await expect(identity).toContainText('does not mean a TESDA');
});
test('public provider badges reflect explicit independent server reviews',async({page})=>{
 let identity=false,skills=false;
 const provider={id:'20000000-0000-4000-8000-000000000001',display_name:'Review Example',headline:'Local plumbing professional',bio:'Fictional browser fixture for reviewed credential badges.',city:'Bunawan',service_areas:['Bunawan'],rating:0,review_count:0,min_rate:50000,status:'approved',avatar_path:null};
 await page.route('**/rest/v1/public_providers*',route=>route.fulfill({json:{...provider,trust_badges:{identity_reviewed:identity,skills_reviewed:skills,skills_label:skills?'TESDA NC II reviewed':null}}}));
 const visit=()=>page.goto(`/providers/profile/?id=${provider.id}`);
 await visit();await expect(page.getByText('Identity reviewed',{exact:true})).toHaveCount(0);await expect(page.getByText('TESDA NC II reviewed',{exact:true})).toHaveCount(0);
 identity=true;await visit();await expect(page.getByText('Identity reviewed',{exact:true})).toBeVisible();await expect(page.getByText('TESDA NC II reviewed',{exact:true})).toHaveCount(0);
 skills=true;await visit();await expect(page.getByText('Identity reviewed',{exact:true})).toBeVisible();await expect(page.getByText('TESDA NC II reviewed',{exact:true})).toBeVisible();
 identity=false;await visit();await expect(page.getByText('Identity reviewed',{exact:true})).toHaveCount(0);await expect(page.getByText('TESDA NC II reviewed',{exact:true})).toBeVisible();
});
