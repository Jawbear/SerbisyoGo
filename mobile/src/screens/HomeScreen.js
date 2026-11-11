import { Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useApp } from '../AppContext';
import { useAction, useData } from '../hooks';
import { colors as c, roleLabels } from '../theme';
import { Badge, Button, Card, Icon, Label, Muted, Notice, ProviderGrid, Query, Screen, Section, s } from '../components/ui';

const categoryIcons = { zap: 'flash-outline', droplets: 'water-outline', hammer: 'hammer-outline', plug: 'construct-outline', wind: 'snow-outline', wrench: 'construct-outline' };

export default function HomeScreen({ navigation }) {
  const app = useApp();
  const { width } = useWindowDimensions();
  const wide = width >= 760;
  const query = useData('home-catalog', app.api.catalog);
  const action = useAction();
  return <Screen>
    <View style={s.between}><View style={[s.inline, { flexShrink: 1 }]}><Icon name="location-outline" size={15} /><Muted style={{ flexShrink: 1 }}>Bunawan, Agusan del Sur</Muted></View>{app.identity ? <Badge>{roleLabels[app.identity.role]}</Badge> : <Button title="Sign in" secondary disabled={app.authLoading || !app.liveAvailable} onPress={() => navigation.navigate('SignIn', { returnTo: 'Home' })} />}</View>
    {!app.liveAvailable && <Notice error>The service connection is not configured. Please contact support.</Notice>}
    <View style={styles.hero}>
      <View style={[s.stack, wide && { flexDirection: 'row', alignItems: 'center', gap: 28 }]}>
      <View style={[s.stack, wide && s.flex]}>
      <Label>Local skills. Everyday care.</Label>
      <Text accessibilityRole="header" style={styles.heroTitle}>Your home.{"\n"}<Text style={{ color: c.green }}>In good hands.</Text></Text>
      <Muted>Find a helping hand nearby. Choose a professional and plan your next home service.</Muted>
      <Button title="Find a professional" icon="search-outline" onPress={() => navigation.navigate('FindProfessionals', { categoryId: '' })} />
      </View>
      <Image source={require('../../assets/hero.png')} accessibilityLabel="Home service professional ready to help" style={[styles.heroImage, wide && { width: '42%', height: 310 }]} />
      </View>
      <View style={s.row}><Icon name="shield-checkmark-outline" /><Muted style={s.flex}>Profiles, schedules, and service requests in one place.</Muted></View>
    </View>
    <Query query={query}>{query.data && <>
      <Section title="What needs attention at home?">
        <ScrollView horizontal style={{ flexGrow: 0, flexShrink: 0, height: 164 }} showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
          {query.data.categories.map(category => <Pressable key={category.id} accessibilityRole="button" accessibilityLabel={`Browse ${category.name}`} onPress={() => navigation.navigate('FindProfessionals', { categoryId: category.id })} style={styles.category}>
            <View style={styles.categoryIcon}><Icon name={categoryIcons[category.icon] || (category.icon?.endsWith('-outline') ? category.icon : 'construct-outline')} size={25} /></View><Text style={styles.categoryName}>{category.name}</Text><Icon name="arrow-forward-outline" size={16} />
          </Pressable>)}
        </ScrollView>
      </Section>
      <Section title="A reliable helping hand"><ProviderGrid providers={query.data.providers.slice(0, 4)} /><Button title="See all professionals" secondary onPress={() => navigation.navigate('FindProfessionals', { categoryId: '' })} /></Section>
    </>}</Query>
    <Card style={s.stack}><Label>Your service records</Label><Text style={s.sectionTitle}>A little less to worry about.</Text><Muted>Review requests you have saved and keep your next appointment close at hand.</Muted><Button title="Open my bookings" secondary icon="calendar-outline" onPress={() => navigation.navigate('MyBookings')} /></Card>
    <Card style={s.stack}>
      <View style={s.between}><Text style={s.sectionTitle}>{app.identity ? `Hello, ${app.identity.profile.full_name.split(' ')[0]}` : 'Your SerbisyoGo account'}</Text>{app.identity && <Badge>{roleLabels[app.identity.role]}</Badge>}</View>
      <Muted>Manage your home-service requests and keep your appointments together.</Muted>
      {app.authLoading && <Muted>Checking your account…</Muted>}
      {app.authError ? <Notice error>{app.authError}</Notice> : null}
      {action.error ? <Notice error>{action.error}</Notice> : null}
      {app.identity || app.authError ? <Button title="Sign out of this device" secondary busy={action.busy} onPress={() => action.run(app.signOut)} /> : <Button title="Sign in to your account" disabled={app.authLoading || !app.liveAvailable} onPress={() => navigation.navigate('SignIn', { returnTo: 'Home' })} />}
    </Card>
  </Screen>;
}

const styles = StyleSheet.create({
  hero: { padding: 22, borderRadius: 24, borderWidth: 1, borderColor: c.border, backgroundColor: '#112219', gap: 18 },
  heroTitle: { color: c.text, fontSize: 41, lineHeight: 47, letterSpacing: -1.2, fontWeight: '700' },
  heroImage: { width: '100%', height: 175, borderRadius: 16, resizeMode: 'cover' },
  category: { width: 136, padding: 17, borderWidth: 1, borderColor: c.border, borderRadius: 18, backgroundColor: c.panel, gap: 15 },
  categoryIcon: { backgroundColor: c.soft, width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  categoryName: { fontSize: 13, fontWeight: '700', color: c.text, minHeight: 34 }
});
