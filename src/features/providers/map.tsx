'use client';

import { useEffect, useRef, useState } from 'react';
import { Map as MapIcon, Satellite } from 'lucide-react';
import type { Provider } from '@/lib/types';
import { hasServicePin } from '../../../mobile/src/data/discovery.js';
import { config } from '@/lib/config';
export function ServiceMap({
  position,
  providers,
  caption = 'Bunawan, Agusan del Sur. Location is shared only for an active authorized booking.'
}: {
  providers?: Provider[];
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
      const points: [number, number][] = [];
      for (const provider of providers || []) {
        if (!hasServicePin(provider)) continue;
        const point: [number, number] = [provider.service_latitude!, provider.service_longitude!];
        points.push(point);
        const link = document.createElement('a');
        link.href = config.basePath + '/providers/profile/?id=' + encodeURIComponent(provider.id);
        link.textContent = 'View ' + provider.display_name;
        L.marker(point, {
          title: provider.display_name, alt: provider.display_name,
          icon: L.divIcon({ className: 'provider-marker', html: '<div class="map-pin"></div>', iconSize: [22, 22] })
        }).addTo(map).bindPopup(link);
      }
      if (points.length) map.fitBounds(L.latLngBounds(points), { padding: [32, 32], maxZoom: 14 });
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
  }, [latitude, longitude, providers]);
  return <div className="map-frame">
    <div ref={ref} className="map-canvas" style={{ visibility: view === 'street' ? 'visible' : 'hidden' }} aria-hidden={view !== 'street'} role="region" aria-label={providers ? "Street map of public service areas" : position ? 'Light street map showing the provider’s last shared location' : `Light street map of ${config.mapDefault.label}`} />
    {view === 'satellite' && config.googleMapsEmbedUrl && <iframe className="map-satellite-embed" src={config.googleMapsEmbedUrl} title="Google Maps satellite imagery of Bunawan, Agusan del Sur" loading="lazy" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />}
    <div className="map-view-switch" role="group" aria-label="Map view">
      <button type="button" aria-pressed={view === 'street'} onClick={() => setView('street')}><MapIcon size={16} aria-hidden="true" />Street</button>
      <button type="button" aria-pressed={view === 'satellite'} disabled={!config.googleMapsEmbedUrl} title={config.googleMapsEmbedUrl ? 'View Bunawan satellite imagery inside this page' : 'Satellite imagery is not available yet'} onClick={() => setView('satellite')}><Satellite size={16} aria-hidden="true" />Satellite</button>
      {!config.googleMapsEmbedUrl && <small>Satellite unavailable</small>}
    </div>
    <div className="map-caption" role="status">{view === 'street' ? error || (providers ? (providers.some(hasServicePin) ? 'Select a service-area pin to view the professional’s profile.' : 'No matching professionals have published a service-area pin yet.') : caption) : 'Bunawan, Agusan del Sur · Recorded satellite imagery. Shared provider locations are shown in Street view.'}</div>
  </div>;
}
