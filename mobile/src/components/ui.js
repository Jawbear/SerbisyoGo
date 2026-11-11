import { useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors as c, statusLabels } from '../theme';
import { money } from '../domain';
import { supabaseUrl } from '../data/backend';

export function Icon({ name, size = 20, color = c.green }) { return <Ionicons name={name} size={size} color={color} accessible={false} />; }
export function Label({ children }) { return <Text style={s.label}>{children}</Text>; }
export function Title({ children }) { return <Text accessibilityRole="header" style={s.title}>{children}</Text>; }
export function Muted({ children, style }) { return <Text style={[s.muted, style]}>{children}</Text>; }
export function Card({ children, style }) { return <View style={[s.card, style]}>{children}</View>; }
export function Badge({ children }) { return <View style={s.badge}><Text style={s.badgeText}>{children}</Text></View>; }
export function StatusBadge({ status }) { return <Badge>{statusLabels[status] || status}</Badge>; }

export function Button({ title, onPress, secondary = false, disabled = false, busy = false, icon, testID }) {
  return <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled: disabled || busy }} disabled={disabled || busy} onPress={onPress} style={({ pressed }) => [s.button, secondary && s.secondary, (disabled || busy) && { opacity: 0.45 }, pressed && { opacity: 0.8 }]}>
    {busy ? <ActivityIndicator color={secondary ? c.green : c.buttonText} /> : icon ? <Icon name={icon} size={18} color={secondary ? c.green : c.buttonText} /> : null}
    <Text style={[s.buttonText, secondary && { color: c.green }]}>{title}</Text>
  </Pressable>;
}

export function Field({ label, multiline = false, ...props }) {
  return <View style={s.field}><Text style={s.fieldLabel}>{label}</Text><TextInput accessibilityLabel={label} placeholderTextColor={c.muted} style={[s.input, multiline && { minHeight: 112, textAlignVertical: 'top' }]} multiline={multiline} {...props} /></View>;
}

export function Notice({ children, error = false }) {
  return <View accessibilityRole={error ? 'alert' : 'text'} style={[s.notice, error && { borderColor: '#855257', backgroundColor: '#302125' }]}><Icon name={error ? 'alert-circle-outline' : 'information-circle-outline'} color={error ? c.error : c.green} /><Text style={[s.noticeText, error && { color: c.error }]}>{children}</Text></View>;
}

export function Empty({ title = 'This record is unavailable', description = 'It may have changed. Please choose another professional.', onPress, action = 'Find a professional' }) {
  const navigation = useNavigation();
  return <Card style={s.empty}><Icon name="leaf-outline" size={34} /><Text accessibilityRole="header" style={s.sectionTitle}>{title}</Text><Muted style={{ textAlign: 'center' }}>{description}</Muted><Button title={action} onPress={onPress || (() => navigation.navigate('FindProfessionals'))} /></Card>;
}

export function Query({ query, children }) {
  if (query.loading) return <View accessibilityLabel="Loading screen" style={s.loading}><ActivityIndicator color={c.green} /><Muted>One moment…</Muted></View>;
  if (query.error) return <View style={s.stack}><Notice error>{query.error}</Notice><Button title="Try again" secondary onPress={query.retry} /></View>;
  return children;
}

export function Chip({ title, selected, onPress }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ selected }} onPress={onPress} style={[s.chip, selected && s.chipSelected]}><Text style={[s.chipText, selected && { color: c.green }]}>{title}</Text></Pressable>;
}

export function ProviderAvatar({ provider, large = false }) {
  const [failed, setFailed] = useState(false);
  const image = provider.avatar_path && supabaseUrl ? `${supabaseUrl}/functions/v1/files?avatar=${encodeURIComponent(provider.id)}&v=${encodeURIComponent(provider.avatar_path)}` : null;
  return image && !failed ? <Image accessibilityLabel={`${provider.display_name} profile photo`} source={{ uri: image }} onError={() => setFailed(true)} style={[s.avatar, large && s.avatarLarge]} /> : <View style={[s.avatar, large && s.avatarLarge]}><Icon name="person-outline" size={large ? 34 : 24} /></View>;
}

export function ProviderCard({ provider }) {
  const navigation = useNavigation();
  return <Pressable accessibilityRole="button" accessibilityLabel={`View ${provider.display_name}`} onPress={() => navigation.navigate('ProviderDetails', { providerId: provider.id })} style={({ pressed }) => [s.card, { gap: 16 }, pressed && { borderColor: c.green }]}>
    <View style={s.row}><ProviderAvatar provider={provider} /><View style={s.flex}><Text style={s.providerName}>{provider.display_name}</Text><Muted>{provider.headline}</Muted></View><Icon name="arrow-forward-outline" size={18} /></View>
    <View style={s.between}><View style={s.inline}><Icon name="location-outline" size={14} color={c.muted} /><Muted>{provider.city}</Muted></View>{Number(provider.review_count) > 0 ? <Text style={s.rating}>★ {Number(provider.rating).toFixed(1)} <Text style={{ color: c.muted }}>({provider.review_count})</Text></Text> : <Badge>New professional</Badge>}</View>
    <View style={s.cardFoot}><Muted>Starting from</Muted><Text style={s.price}>{money(provider.min_rate || 0)}</Text></View>
  </Pressable>;
}

export function Section({ title, children }) { return <View style={s.stack}><Text accessibilityRole="header" style={s.sectionTitle}>{title}</Text>{children}</View>; }

export function ProviderGrid({ providers }) {
  const { width } = useWindowDimensions();
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>{providers.map(provider => <View key={provider.id} style={{ flexBasis: width >= 760 ? '46%' : '100%', flexGrow: 1, minWidth: 0 }}><ProviderCard provider={provider} /></View>)}</View>;
}

export function QuickNav() {
  const navigation = useNavigation();
  const route = useRoute();
  const active = ['ProviderDetails', 'BookingForm', 'BookingReview'].includes(route.name) ? 'FindProfessionals' : route.name === 'BookingRecord' ? 'MyBookings' : route.name;
  return <View style={s.bottom}><View style={s.navRow}>{[
    ['Home', 'Home', 'home-outline'], ['FindProfessionals', 'Find help', 'search-outline'], ['MyBookings', 'Bookings', 'calendar-outline']
  ].map(([name, title, icon]) => <Pressable key={name} accessibilityRole="button" accessibilityLabel={`Navigate to ${title}`} accessibilityState={{ selected: active === name }} onPress={() => navigation.navigate(name)} style={s.navItem}><Icon name={icon} color={active === name ? c.green : c.muted} /><Text style={[s.navLabel, { color: active === name ? c.green : c.muted }]}>{title}</Text></Pressable>)}</View><Text style={s.tagline}>LOCAL SKILLS. EVERYDAY CARE.</Text></View>;
}

export function Screen({ children, footer = true }) {
  const route = useRoute();
  return <SafeAreaView testID={`screen-${route.name}`} style={s.screen} edges={['left', 'right', 'bottom']}><KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={80}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>{children}</ScrollView></KeyboardAvoidingView>{footer && <QuickNav />}</SafeAreaView>;
}

export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background }, flex: { flex: 1, minWidth: 0 },
  content: { padding: 22, gap: 24, paddingBottom: 30, width: '100%', maxWidth: 960, alignSelf: 'center', flexGrow: 1 },
  stack: { gap: 16 }, row: { flexDirection: 'row', gap: 14, alignItems: 'center' }, inline: { flexDirection: 'row', gap: 5, alignItems: 'center' },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
  label: { color: c.green, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },
  title: { color: c.text, fontSize: 30, lineHeight: 38, fontWeight: '700', letterSpacing: -0.8 },
  sectionTitle: { color: c.text, fontSize: 19, fontWeight: '700', letterSpacing: -0.3 },
  muted: { color: c.muted, fontSize: 13, lineHeight: 21 },
  card: { backgroundColor: c.panel, borderWidth: 1, borderColor: c.border, borderRadius: 20, padding: 20 },
  button: { minHeight: 50, paddingHorizontal: 18, paddingVertical: 14, backgroundColor: c.green, borderWidth: 1, borderColor: c.green, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  secondary: { backgroundColor: c.input, borderColor: c.border },
  buttonText: { color: c.buttonText, fontSize: 14, fontWeight: '700', textAlign: 'center', flexShrink: 1 },
  field: { gap: 8 }, fieldLabel: { color: c.text, fontSize: 13, fontWeight: '600' },
  input: { color: c.text, backgroundColor: c.input, borderWidth: 1, borderColor: '#63776b', borderRadius: 12, minHeight: 50, padding: 14, fontSize: 16 },
  notice: { flexDirection: 'row', gap: 10, padding: 16, backgroundColor: '#142a1e', borderWidth: 1, borderColor: '#3c7859', borderRadius: 14, alignItems: 'flex-start' },
  noticeText: { flex: 1, color: c.text, fontSize: 13, lineHeight: 21 },
  badge: { alignSelf: 'flex-start', backgroundColor: c.soft, borderRadius: 30, paddingHorizontal: 10, paddingVertical: 5 }, badgeText: { color: c.green, fontSize: 11, fontWeight: '600' },
  chip: { paddingHorizontal: 15, paddingVertical: 11, borderRadius: 30, borderWidth: 1, borderColor: c.border, backgroundColor: c.panel, minHeight: 44, justifyContent: 'center' },
  chipStrip: { flexGrow: 0, flexShrink: 0, height: 48 },
  chipSelected: { borderColor: c.green, backgroundColor: c.soft }, chipText: { fontSize: 13, color: c.muted, fontWeight: '600' },
  avatar: { width: 54, height: 54, borderRadius: 16, backgroundColor: c.soft, alignItems: 'center', justifyContent: 'center' }, avatarLarge: { width: 88, height: 88, borderRadius: 24 },
  providerName: { color: c.text, fontSize: 16, fontWeight: '700', marginBottom: 3 }, rating: { color: c.green, fontSize: 12, fontWeight: '600' },
  cardFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 14, borderTopWidth: 1, borderTopColor: c.border }, price: { color: c.green, fontSize: 18, fontWeight: '700' },
  empty: { gap: 16, alignItems: 'center', paddingVertical: 32 }, loading: { minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: 15 },
  bottom: { backgroundColor: c.background, borderTopColor: c.border, borderTopWidth: 1, paddingTop: 8, paddingBottom: 6 }, navRow: { flexDirection: 'row', maxWidth: 960, width: '100%', alignSelf: 'center' },
  navItem: { flex: 1, minHeight: 50, alignItems: 'center', justifyContent: 'center', gap: 4 }, navLabel: { fontSize: 11, fontWeight: '600' }, tagline: { color: c.muted, textAlign: 'center', fontSize: 8, letterSpacing: 1, marginTop: 5 }
});
