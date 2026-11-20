# Production recovery approval and restore rehearsal

**Production backup POSTPONED. Production recovery UNVERIFIED.** Keep this procedure for future authorized use. The last inventory returned an empty backup list and PITR disabled. WAL-G was enabled. The only database restored in the rehearsal contained synthetic records.

## Owner decision

Authorize a read-only logical export of project `qkopbbxmeqqzomrawltf`, including Auth, private Storage objects and migration history, to an access-controlled encrypted volume. Designate its custodian, retention, acceptable data loss and restore time. Name the private restore host and the window for obtaining a consistent baseline. Supply credentials through the operator's secret store. A production write pause, billing change or creation of Storage access keys needs separate authorization. The export contains personal data and password hashes.

Alternatively, an eligible paid project can use a managed physical backup. Open **SerbisyoGo → Database → Backups**. If there is no point, confirm plan eligibility with the owner and wait for a daily backup or obtain approval for an appropriate backup plan. Record the point in UTC. Only use **Restore to a New Project** after reviewing the displayed charge and establishing isolation at startup. Enabled cron jobs, webhooks and wrappers can run immediately in a managed clone, and Vault secrets can remain readable. Use the offline logical procedure below if startup isolation cannot be guaranteed. Storage object bytes require a separate backup on either path. [Managed backup coverage](https://supabase.com/docs/guides/platform/backups) · [Restore to a new project](https://supabase.com/docs/guides/platform/clone-project)

## Logical capture after approval

Use the pinned Supabase CLI, Docker and PostgreSQL 17 client tools on the controlled backup workstation. Use a repo checkout linked to the approved source. Configure a password-file-backed libpq service named `sg056_source` for the same project using the dashboard's direct or session connection with certificate verification. Set `SG056_ARCHIVE` to a new, empty directory on the encrypted volume outside the repository and cloud-sync folders. Disable transcripts and keep tool logs there. Treat SQL files as private, including schema definitions.

Capture while application writes, uploads and schema changes are quiescent in the approved window. Record UTC start/end and source migration history. The CLI runs several dumps in separate transactions. If consistency across DB, Auth and Storage cannot be established, discard the attempt as a recovery candidate. Run in PowerShell 7.3+ from the repo root.

```powershell
$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $true
$prodRef = 'qkopbbxmeqqzomrawltf'
if ((Get-Content -Raw supabase/.temp/project-ref).Trim() -ne $prodRef) { throw 'Wrong source project' }
$archive = (Get-Item -LiteralPath $env:SG056_ARCHIVE).FullName
if (!(Test-Path -LiteralPath $archive -PathType Container) -or
    $archive.StartsWith((Get-Location).Path, [StringComparison]::OrdinalIgnoreCase) -or
    (Get-ChildItem -Force -LiteralPath $archive)) { throw 'Use a fresh encrypted archive directory outside the checkout' }
$cli = (Resolve-Path node_modules/.bin/supabase.cmd).Path
& $cli backups list --project-ref $prodRef
psql -XAtq -d 'service=sg056_source' -f scripts/recovery-manifest.sql -o "$archive/source.tsv"
& $cli db dump --linked --role-only -f "$archive/roles.sql"
& $cli db dump --linked -f "$archive/schema.sql"
& $cli db dump --linked --data-only --use-copy -x storage.buckets_vectors -x storage.vector_indexes -f "$archive/data.sql"
& $cli db dump --linked --schema supabase_migrations -f "$archive/history-schema.sql"
& $cli db dump --linked --schema supabase_migrations --data-only --use-copy -f "$archive/history-data.sql"
pg_dump --dbname='service=sg056_source' --schema-only --schema=auth --schema=storage --file="$archive/managed-schema-reference.sql"
```

If vector Storage is in use, inventory and back it up under its own supported procedure before accepting coverage. The managed-schema reference is for extracting application-specific changes, including the Auth user trigger and Storage policies. Compare it with a clean matching Supabase installation. Save the reviewed application-specific DDL in `managed-custom.sql`. Inventory extensions, jobs, publications, roles/grants, Auth settings, redirect URLs, SMTP, Edge configuration and secret references. Handle any Vault or encrypted columns according to the project's key-custody procedure. [Supabase CLI backup and restore](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore)

For ordinary Storage buckets, use a private Linux backup volume or other case-sensitive filesystem that preserves every object key. Use an existing operator-approved S3 profile named `sg056-source` and the endpoint and region from the source dashboard. Compare the uploaded object names, sizes and counts per bucket with the database inventory. If local filesystem naming cannot represent a key losslessly, use an object-to-object archive that preserves keys. [Supabase Storage download](https://supabase.com/docs/guides/storage/management/download-objects) · [S3 connection settings](https://supabase.com/docs/guides/storage/s3/authentication)

```powershell
$endpoint = "https://$prodRef.storage.supabase.co/storage/v1/s3"
$s3 = @('--profile','sg056-source','--endpoint-url',$endpoint,'--region','ap-south-1')
$bucketList = aws @s3 s3api list-buckets --query 'Buckets[].Name' --output json | ConvertFrom-Json
foreach ($bucket in $bucketList) {
  aws @s3 s3 sync "s3://$bucket/" "$archive/objects/$bucket/" --only-show-errors
}
psql -XAtq -d 'service=sg056_source' -f scripts/recovery-manifest.sql -o "$archive/source-end.tsv"
if (Compare-Object (Get-Content "$archive/source.tsv") (Get-Content "$archive/source-end.tsv")) { throw 'Source changed during capture' }
$checksums = Get-ChildItem -LiteralPath $archive -File -Recurse | Get-FileHash -Algorithm SHA256
$checksums | Select-Object @{n='Path';e={[IO.Path]::GetRelativePath($archive, $_.Path).Replace('\','/')}},Hash |
  Export-Csv "$archive/checksums.csv" -NoTypeInformation
Get-FileHash "$archive/checksums.csv" -Algorithm SHA256
```

Record the checksum CSV's digest in the custodian's independent protected record before transfer. Keep the encrypted backup and a separately protected copy under the custodian's control. Record only the reference, UTC window and verification result in the release record.

## Restore into quarantine

1. Prepare a fresh Supabase installation matching the source PostgreSQL major, Auth/Storage schema versions and required extensions. Use a separate private host with outbound traffic blocked, ingress limited to the recovery operator, background workers and application endpoints stopped, and independent service keys. Preload required images before isolation. Do not use the developer staging workspace with real data.
2. Verify that no production database credentials, tunnels, mounts or cloud integrations are available to this host. Use a local PostgreSQL socket or the verified loopback port bound to the **new** database. Check that `public.bookings` is absent. Review dump SQL for external jobs, role changes, wrappers and triggers before import. Restore required platform extensions and the reviewed managed-schema customizations in dependency order. If a managed baseline or key dependency differs, stop and resolve the difference before importing.
3. From the protected archive on the isolated restore host, use the following PowerShell commands. Set `SG056_RESTORE_PORT` to the fresh installation's local port and `SG056_TOOLS` to the reviewed tools checkout on that host. Set `SG056_CHECKSUMS_SHA256` from the custodian's independent record. Supply the local password via an operator-only password file. Apply custom triggers/policies after their referenced public tables and functions exist. Use the Supabase procedure for any installation-specific managed-role or Vault handling.

```powershell
$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $true
if ((Get-FileHash ./checksums.csv -Algorithm SHA256).Hash -ne $env:SG056_CHECKSUMS_SHA256) { throw 'Archive manifest differs from the independently recorded digest' }
foreach ($entry in (Import-Csv ./checksums.csv)) {
  if ((Get-FileHash -LiteralPath $entry.Path -Algorithm SHA256).Hash -ne $entry.Hash) { throw 'Archive file missing or changed' }
}
$dest = @('-X','-h','127.0.0.1','-p',$env:SG056_RESTORE_PORT,'-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1')
if ((psql @dest -Atc "select to_regclass('public.bookings') is null") -ne 't') { throw 'Restore target already contains bookings schema' }
psql @dest --single-transaction -f roles.sql -f schema.sql -f managed-custom.sql -c 'SET session_replication_role = replica' -f data.sql
psql @dest --single-transaction -f history-schema.sql -f history-data.sql
psql @dest -Atq -f "$env:SG056_TOOLS/scripts/recovery-manifest.sql" -o restored.tsv
if (Compare-Object (Get-Content source.tsv) (Get-Content restored.tsv)) { throw 'Restored data differs from source baseline' }
```

4. Compare migration history through 023, schema, grant/policy definitions, publication membership, FK relationships and sequences. Check Auth users and identities, payment and booking totals, and sender memberships. The manifest compares row counts and content hashes without returning records. Investigate any table or relationship mismatch. A failed import needs a fresh private destination.
5. Recover Storage bytes into isolated storage using its supported object API or storage migration process. Preserve bucket privacy, object names, owners and file metadata. Account for API-generated metadata differences against the preserved baseline. Download representative private documents, avatars and receipts through authorized test access and compare byte hashes. Verify that an unrelated session cannot obtain the private objects. Exercise Auth read and login with a designated recovery test identity and an isolated mail sink. Keep production SMTP, payments and customer-facing traffic disconnected.
6. Record archive reference, source point, restore ID, elapsed time, actual data-loss window, manifest comparisons, object checks, permissions and operator sign-off. Keep recovery **unverified** until these checks succeed against the production-derived archive.
