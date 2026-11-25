import LocationPicker from '../components/LocationPicker';
import SavedSearches from '../components/SavedSearches';
import { useState } from 'react';
import { Image, ScrollView, Text, View } from 'react-native';
import { serviceCover } from '../data/covers';
import { useApp } from '../AppContext';
import { useData } from '../hooks';
import { dayLabel, manilaDay } from '../domain';
import { matchProfessionals, availableServiceIds } from '../data/discovery';
import ServiceAreaMap from '../components/ServiceAreaMap';
import { Button, Chip, Empty, Field, Label, Muted, ProviderGrid, Query, Screen, Title, s } from '../components/ui';

export default function FindScreen({ navigation, route }) {
  const { api } = useApp();
  const query = useData('discovery', api.catalog);
  const search = route.params?.search || '';
  const setSearch = value => navigation.setParams({ search: value });
  const [maximum, setMaximum] = useState('');
  const [sort, setSort] = useState('rating');
  const [day, setDay] = useState('');
  const [map, setMap] = useState(false);
  const [filters, setFilters] = useState(false);
  const city = route.params?.city || '';
  const place = city ? { name: city, code: route.params?.cityCode || '' } : null;
  const setPlace = value => navigation.setParams({ city: value?.name || '', cityCode: value?.code || '' });
  const categoryId = route.params?.categoryId || '';
  const availability = useData('discovery-availability-' + day, () => availableServiceIds(query.data.services, day, api.availableServices), Boolean(day && query.data));
  const providers = query.data ? matchProfessionals(query.data, { search, category: categoryId, city, maximum, sort, available: day ? availability.data || [] : null }) : [];
  const category = query.data?.categories.find(item=>item.id===categoryId);
  const cover = category && serviceCover(category.name);
  const categoryName = categoryId ? category?.name || route.params?.categoryName || '' : 'All services';
  function clear() { setMaximum(''); setSort('rating'); setDay(''); navigation.setParams({ search: '', city: '', cityCode: '', categoryId: '', categoryName: '' }); }
  function apply(row) {
    setSearch('');
    setPlace({ code: row.cityCode, name: row.city });
    navigation.setParams({ categoryId: row.categoryId, categoryName: row.categoryName });
  }
  return <Screen>
    <View style={s.stack}><Label>Find local expertise</Label><Title>A helping hand, nearby.</Title><Muted>Compare professionals and choose the service that fits your home.</Muted></View>
    <Field label="Search professionals" placeholder="Name, service, or city" value={search} onChangeText={setSearch} returnKeyType="search" />
    {query.data && <ScrollView horizontal style={s.chipStrip} showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}><Chip title="All services" selected={!categoryId} onPress={() => navigation.setParams({ categoryId: '' })} />{query.data.categories.map(category => <Chip key={category.id} title={category.name} selected={categoryId === category.id} onPress={() => navigation.setParams({ categoryId: category.id, categoryName: category.name })} />)}</ScrollView>}
    {place && <View style={s.between}><Muted>Municipality: {place.name}</Muted><Chip title="Clear municipality" onPress={() => setPlace(null)} /></View>}
    <LocationPicker selected={place} onSelect={setPlace} />
    <SavedSearches place={place} categoryId={categoryId} categoryName={categoryName} apply={apply} />
    <Button title={filters ? 'Hide search options' : 'Price, rating and availability'} secondary onPress={() => setFilters(!filters)} />
    {filters && <View style={s.stack}><Field label="Maximum starting price (₱)" value={maximum} keyboardType="decimal-pad" onChangeText={setMaximum} />
      <View style={s.row}><Chip title="Highest rated" selected={sort === 'rating'} onPress={() => setSort('rating')} /><Chip title="Lowest price" selected={sort === 'price'} onPress={() => setSort('price')} /></View>
      <Muted>Available appointments · Philippine time</Muted><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}><Chip title="Any day" selected={!day} onPress={() => setDay('')} />{Array.from({ length: 14 }, (_, index) => manilaDay(new Date(), index)).map(date => <Chip key={date} title={dayLabel(date)} selected={day === date} onPress={() => setDay(date)} />)}</ScrollView>
    </View>}
    <Query query={query}><Query query={availability}>{query.data && <>
      {cover && <Image source={cover} accessibilityLabel={`${category.name} service cover`} style={{width:'100%',height:170,borderRadius:18,resizeMode:'cover'}} />}

      <View style={s.between}><Text style={s.sectionTitle}>{providers.length} {providers.length === 1 ? 'professional' : 'professionals'}</Text><Muted>Choose a profile to learn more</Muted></View>
      <View style={s.row}><Chip title="List" selected={!map} onPress={() => setMap(false)} /><Chip title="Map" selected={map} onPress={() => setMap(true)} /></View>
      {map ? <ServiceAreaMap providers={providers} openProfile={providerId => navigation.navigate('ProviderDetails', { providerId })} /> : <ProviderGrid providers={providers} />}
      {!providers.length && <Empty title="No professionals found" description="Try another service or search term." action="Clear filters" onPress={clear} />}
      {Boolean(search || categoryId || place || maximum || day) && providers.length > 0 && <Button title="Clear filters" secondary onPress={clear} />}
    </>}</Query></Query>
  </Screen>;
}
