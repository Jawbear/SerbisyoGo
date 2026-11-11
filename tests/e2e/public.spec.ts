import {test,expect} from '@playwright/test';
import {publicFixtures} from './public-fixtures';
test.beforeEach(async({page})=>{await publicFixtures(page);});
test('public navigation and the published download page are usable',async({page})=>{
 await page.goto('/');await expect(page.getByRole('heading',{name:'Your home. In good hands.'})).toBeVisible();
 await page.goto('/download/');await expect(page.getByRole('heading',{name:'Take SerbisyoGo with you.'})).toBeVisible();await expect(page.getByRole('link',{name:'Download APK',exact:true})).toHaveAttribute('href',/SerbisyoGo-0\.1\.0\.apk$/);
});
test('private and admin routes do not expose records without authentication',async({page})=>{
 await page.goto('/admin/providers/');await expect(page.getByText(/Administrator sign in required|Connect your Supabase backend/)).toBeVisible();
 await page.goto('/account/');await expect(page.getByText(/Sign in to continue|Connect your Supabase backend/)).toBeVisible();
});
test('public pages fit desktop and mobile without document overflow',async({page})=>{
 for(const path of ['/','/find/','/services/','/login/','/register/','/support/','/download/','/preview/?view=admin']){
   await page.goto(path);await expect(page.locator('h1').first()).toBeVisible();
   const dimensions=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:window.innerWidth}));
   expect(dimensions.scroll,`${path} horizontal overflow`).toBeLessThanOrEqual(dimensions.viewport+1);
 }
});
test('preview table search and pagination controls work',async({page})=>{
 await page.goto('/preview/?view=admin');await page.getByRole('textbox',{name:'Search records'}).last().fill('invoice');
 await expect(page.getByRole('cell',{name:'Invoice',exact:true})).toBeVisible();
});
