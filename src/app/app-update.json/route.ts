import release from '@/features/app-releases/android-release.json';

export const dynamic = 'force-static';

// Derived from the same verified release as the public download page.
export function GET() {
  return Response.json({
    ...release,
    package_name: 'com.serbisyogo.mobile',
    min_sdk: 24,
    certificate_sha256: '671506d9e3247ef43ae8d77d17f0a59afc9ba9b26cde855e90456a2a3becfefa'
  }, { headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-cache' } });
}
