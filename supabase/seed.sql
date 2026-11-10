-- Safe catalog initialization only. No accounts, prices, commission policy or APKs.
insert into public.categories(id,slug,name,description,icon) values
 ('10000000-0000-4000-8000-000000000001','electrical','Electrical','Wiring, circuit breakers and electrical diagnostics','zap'),
 ('10000000-0000-4000-8000-000000000002','plumbing','Plumbing','Leaks, drainage and water fixtures','droplets'),
 ('10000000-0000-4000-8000-000000000003','carpentry','Carpentry','Doors, cabinets and woodwork','hammer'),
 ('10000000-0000-4000-8000-000000000004','appliance-repair','Appliance repair','Troubleshooting and household appliance repairs','plug'),
 ('10000000-0000-4000-8000-000000000005','air-conditioning','Air-conditioning','Cleaning, diagnostics and AC maintenance','wind'),
 ('10000000-0000-4000-8000-000000000006','maintenance','General maintenance','Everyday repairs and home upkeep','wrench')
on conflict(id) do nothing;
