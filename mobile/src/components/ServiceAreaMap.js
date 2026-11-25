import { useState } from 'react';
import { Image, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Chip, Icon, Muted, s } from './ui';
import { hasServicePin } from '../data/discovery';

const height = 300;
const tileSize = 256;
const template = process.env.EXPO_PUBLIC_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const attribution = process.env.EXPO_PUBLIC_MAP_ATTRIBUTION || '© OpenStreetMap contributors';
const attributionUrl = process.env.EXPO_PUBLIC_MAP_ATTRIBUTION_URL || 'https://www.openstreetmap.org/copyright';
const headers = { 'User-Agent': 'SerbisyoGo Android (+https://serbisyogo.sg-team.workers.dev/contact/)' };

// Web Mercator coordinates, expressed as fractions of the complete tile grid.
function project(latitude, longitude) {
  const radians = latitude * Math.PI / 180;
  return { x: (longitude + 180) / 360, y: (1 - Math.asinh(Math.tan(radians)) / Math.PI) / 2 };
}

export default function ServiceAreaMap({ providers, openProfile }) {
  const pins = providers.filter(hasServicePin);
  const [selectedId, select] = useState('');
  const [zoom, setZoom] = useState(13);
  const [width, setWidth] = useState(0);
  const [failedTile, setFailedTile] = useState('');
  const selected = pins.find(provider => provider.id === selectedId) || pins[0];
  const center = project(selected?.service_latitude ?? 8.1781, selected?.service_longitude ?? 125.9935);
  const count = 2 ** zoom;
  const scale = count * tileSize;
  const left = center.x * scale - width / 2;
  const top = center.y * scale - height / 2;
  const tiles = [];
  if (width) {
    for (let x = Math.floor(left / tileSize); x < (left + width) / tileSize; x++) {
      for (let y = Math.max(0, Math.floor(top / tileSize)); y < Math.min(count, (top + height) / tileSize); y++) {
        const uri = template.replace('{z}', String(zoom)).replace('{x}', String((x % count + count) % count)).replace('{y}', String(y));
        tiles.push({ x: x * tileSize - left, y: y * tileSize - top, uri });
      }
    }
  }
  return <View style={s.stack}>
    {pins.length > 0 && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {pins.map(provider => <Chip key={provider.id} title={provider.display_name} selected={provider.id === selected?.id} onPress={() => select(provider.id)} />)}
    </ScrollView>}
    <View style={styles.map} onLayout={event => setWidth(Math.round(event.nativeEvent.layout.width))}>
      {tiles.map(tile => <Image key={tile.uri} accessible={false}
        source={Platform.OS === 'web' ? { uri: tile.uri } : { uri: tile.uri, headers }}
        onError={() => setFailedTile(tile.uri)} onLoad={() => setFailedTile(previous => previous === tile.uri ? '' : previous)}
        style={[styles.tile, { left: tile.x, top: tile.y }]} />)}
      {pins.map(provider => {
        const at = project(provider.service_latitude, provider.service_longitude);
        const x = at.x * scale - left, y = at.y * scale - top;
        if (x < 0 || y < 0 || x > width || y > height) return null;
        return <Pressable key={provider.id} accessibilityRole="button" accessibilityLabel={'Select ' + provider.display_name}
          accessibilityState={{ selected: provider.id === selected?.id }} onPress={() => select(provider.id)}
          style={[styles.marker, { left: x - 22, top: y - 34 }]}><Icon name="location" size={34} color="#173E29" /></Pressable>;
      })}
      <Pressable accessibilityRole="link" onPress={() => Linking.openURL(attributionUrl).catch(() => {})} style={styles.credit}><Text style={styles.creditText}>{attribution}</Text></Pressable>
    </View>
    <View style={s.row}><Chip title="Zoom out" selected={false} onPress={() => setZoom(Math.max(4, zoom - 1))} /><Chip title="Zoom in" selected={false} onPress={() => setZoom(Math.min(18, zoom + 1))} /></View>
    {tiles.some(tile => tile.uri === failedTile) && <Muted>Some street tiles are unavailable. You can still choose a professional by name.</Muted>}
    {selected ? <><Muted>Public service area · {selected.city}</Muted><Button title={'View ' + selected.display_name} onPress={() => openProfile(selected.id)} /></> :
      <Muted>No matching professionals have published a service-area pin yet.</Muted>}
  </View>;
}

const styles = StyleSheet.create({
  map: { height, borderRadius: 16, overflow: 'hidden', backgroundColor: '#D9E1D8' },
  tile: { position: 'absolute', width: tileSize, height: tileSize },
  marker: { position: 'absolute', width: 44, height: 44, alignItems: 'center' },
  credit: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#fff', paddingHorizontal: 6, paddingVertical: 4 },
  creditText: { color: '#24372B', fontSize: 11 }
});
