'use client';

import { useEffect, useRef, useState } from 'react';
import { Map as MapIcon, Satellite } from 'lucide-react';
import { config } from '@/lib/config';
export function ServiceMap({
  position,
  caption = 'Bunawan, Agusan del Sur. Location is shared only for an active authorized booking.'
}: {
  position?: {
    latitude: number;
    longitude: number;
  };
  caption?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  const [view, setView] = useState<'street' | 'satellite'>('street');
  const latitude = position?.latitude;
  const longitude = position?.longitude;
  useEffect(() => {
    let cancelled = false;
    let map: import('leaflet').Map | undefined;
    void import('leaflet').then(L => {
      if (cancelled || !ref.current) return;
      const hasPosition = latitude !== undefined && longitude !== undefined;
      const center: [number, number] = hasPosition ? [latitude, longitude] : [config.mapDefault.latitude, config.mapDefault.longitude];
      map = L.map(ref.current, {
        scrollWheelZoom: false
      }).setView(center, hasPosition ? 16 : config.mapDefault.zoom);
      const attribution = config.mapAttribution.replace(/[<>"']/g, '');
      const attributionUrl = /^https:\/\//.test(config.mapAttributionUrl) ? config.mapAttributionUrl : 'https://www.openstreetmap.org/copyright';
      const tile = L.tileLayer(config.mapTiles, {
        maxZoom: 19,
        attribution: `<a href="${attributionUrl.replace(/["<>]/g, '')}" target="_blank" rel="noopener">${attribution}</a>`
      }).addTo(map);
      let errors = 0;
      tile.on('tileerror', () => {
        if (++errors > 3) setError('Map tiles are unavailable. Booking status and service details remain available.');
      });
      tile.on('tileload', () => setError(''));
      if (hasPosition) L.marker(center, {
        icon: L.divIcon({
          className: 'provider-marker',
          html: '<div class="map-pin"></div>',
          iconSize: [22, 22],
          iconAnchor: [11, 11]
        })
      }).addTo(map).bindTooltip('Provider’s last shared location');
    }).catch(() => setError('The map could not load. Check your connection.'));
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [latitude, longitude]);
  return <div className="map-frame">
    <div ref={ref} className="map-canvas" style={{ visibility: view === 'street' ? 'visible' : 'hidden' }} aria-hidden={view !== 'street'} role="img" aria-label={position ? 'Light street map showing the provider’s last shared location' : `Light street map of ${config.mapDefault.label}`} />
    {view === 'satellite' && config.googleMapsEmbedUrl && <iframe className="map-satellite-embed" src={config.googleMapsEmbedUrl} title="Google Maps satellite imagery of Bunawan, Agusan del Sur" loading="lazy" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />}
    {error && view === 'street' && <div className="map-fallback"><p>{error}</p></div>}
    <div className="map-view-switch" role="group" aria-label="Map view">
      <button type="button" aria-pressed={view === 'street'} onClick={() => setView('street')}><MapIcon size={16} aria-hidden="true" />Street</button>
      <button type="button" aria-pressed={view === 'satellite'} disabled={!config.googleMapsEmbedUrl} title={config.googleMapsEmbedUrl ? 'View Bunawan satellite imagery inside this page' : 'Satellite imagery is not available yet'} onClick={() => setView('satellite')}><Satellite size={16} aria-hidden="true" />Satellite</button>
      {!config.googleMapsEmbedUrl && <small>Satellite unavailable</small>}
    </div>
    <div className="map-caption">{view === 'street' ? caption : 'Bunawan, Agusan del Sur · Recorded satellite imagery. Shared provider locations are shown in Street view.'}</div>
  </div>;
}
