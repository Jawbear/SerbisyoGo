import {test,expect} from '@playwright/test';
import {installBackend} from '../fixtures/backend.mjs';
test('public guides and FAQ are available without signing in',async({page})=>{
 await installBackend(page);await page.goto('/info/faq');
 await expect(page.getByText('A little clarity goes a long way.',{exact:true})).toBeVisible();
 await page.getByRole('textbox',{name:'Search frequently asked questions'}).fill('every document');
 await page.getByRole('button',{name:'Do workers need to upload every document?',exact:true}).click();
 await expect(page.getByText(/One accepted ID or credential is sufficient for submission readiness/)).toBeVisible();
 await page.getByRole('button',{name:'For Workers',exact:true}).click();await expect(page.getByText('Bring your skills closer to home.',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Contact',exact:true}).click();await expect(page.getByRole('button',{name:'Open support center',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});
