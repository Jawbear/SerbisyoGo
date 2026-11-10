import {mkdir,writeFile} from 'node:fs/promises';
const routes={
 '':'home','find':'find','services':'services','providers/profile':'provider-profile',
 'book':'book','book/schedule':'schedule','book/payment':'payment','bookings/confirmed':'confirmed',
 'dashboard':'dashboard','provider':'provider-dashboard','messages':'messages','login':'login','register':'register','verify':'verify',
 'bookings/track':'track','bookings':'bookings','bookings/detail':'booking-detail','bookings/invoice':'invoice','bookings/review':'review',
 'account':'account','support':'support','download':'download','forgot-password':'forgot','reset-password':'reset','auth/callback':'callback',
 'provider/apply':'provider-apply','provider/profile':'provider-apply','provider/availability':'availability','notifications':'notifications','preview':'preview','privacy':'privacy','terms':'terms',
 'admin/login':'admin-login','admin':'admin-dashboard','admin/providers':'admin-providers','admin/customers':'admin-customers','admin/bookings':'admin-bookings',
 'admin/services':'admin-services','admin/payouts':'admin-payouts','admin/transactions':'admin-transactions','admin/reports':'admin-reports','admin/complaints':'admin-complaints','admin/announcements':'admin-announcements','admin/settings':'admin-settings'
};
for(const [route,name] of Object.entries(routes)){const dir=`src/app/${route}`;await mkdir(dir,{recursive:true});await writeFile(`${dir}/page.tsx`,`import {Suspense} from 'react';\nimport {Screen} from '@/components/screens';\nimport {Skeleton} from '@/components/ui';\nexport default function Page(){return <Suspense fallback={<Skeleton/>}><Screen name="${name}"/></Suspense>}\n`);}
await writeFile('docs/routes.json',JSON.stringify(routes,null,2)+'\n');
console.log(`Created ${Object.keys(routes).length} static routes for GitHub Pages. Record IDs use query parameters.`);
