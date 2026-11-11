import { useState } from 'react';
import { Image, ScrollView, Text, View } from 'react-native';
import { serviceCover } from '../data/covers';
import { useApp } from '../AppContext';
import { useData } from '../hooks';
import { filterProviders } from '../domain';
import { Button, Chip, Empty, Field, Label, Muted, ProviderGrid, Query, Screen, Title, s } from '../components/ui';

export default function FindScreen({ navigation, route }) {
  const { api } = useApp();
  const query = useData('discovery', api.catalog);
  const [search, setSearch] = useState('');
  const categoryId = route.params?.categoryId || '';
  const providers = query.data ? filterProviders(query.data, search, categoryId) : [];
  const category = query.data?.categories.find(item=>item.id===categoryId);
  const cover = category && serviceCover(category.name);
  function clear() { setSearch(''); navigation.setParams({ categoryId: '' }); }
  return <Screen>
    <View style={s.stack}><Label>Find local expertise</Label><Title>A helping hand, nearby.</Title><Muted>Compare professionals and choose the service that fits your home.</Muted></View>
    <Field label="Search professionals" placeholder="Name, service, or city" value={search} onChangeText={setSearch} returnKeyType="search" />
    <Query query={query}>{query.data && <>
      {cover && <Image source={cover} accessibilityLabel={`${category.name} service cover`} style={{width:'100%',height:170,borderRadius:18,resizeMode:'cover'}} />}
      <ScrollView horizontal style={s.chipStrip} showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}><Chip title="All services" selected={!categoryId} onPress={() => navigation.setParams({ categoryId: '' })} />{query.data.categories.map(category => <Chip key={category.id} title={category.name} selected={categoryId === category.id} onPress={() => navigation.setParams({ categoryId: category.id })} />)}</ScrollView>
      <View style={s.between}><Text style={s.sectionTitle}>{providers.length} {providers.length === 1 ? 'professional' : 'professionals'}</Text><Muted>Choose a profile to learn more</Muted></View>
      <ProviderGrid providers={providers} />
      {!providers.length && <Empty title="No professionals found" description="Try another service or search term." action="Clear filters" onPress={clear} />}
      {Boolean(search || categoryId) && providers.length > 0 && <Button title="Clear filters" secondary onPress={clear} />}
    </>}</Query>
  </Screen>;
}
