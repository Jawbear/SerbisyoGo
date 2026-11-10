'use client';

import { useEffect, useRef, useState } from 'react';
import { config } from '@/lib/config';
export function ServiceMap({
  position,
  caption = 'Location is shared only for an active authorized booking.'
}: {
  position?: {
    latitude: number;
    longitude: number;
  };
  caption?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    let map: import('leaflet').Map | undefined;
    void import('leaflet').then(L => {
      if (cancelled || !ref.current) return;
      map = L.map(ref.current, {
        scrollWheelZoom: false
      }).setView(position ? [position.latitude, position.longitude] : [14.5547, 121.0244], position ? 16 : 14);
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
      if (position) L.marker([position.latitude, position.longitude], {
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
  }, [position?.latitude, position?.longitude]);
  return <div className="map-frame"><div ref={ref} className="map-canvas" role="img" aria-label="Light street map showing service area or shared provider location" />{error && <div className="map-fallback"><p>{error}</p></div>}<div className="map-caption">{caption}</div></div>;
}
