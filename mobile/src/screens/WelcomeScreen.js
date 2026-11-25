import { useEffect, useState } from 'react';
import { Platform, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '../AppContext';
import { Button, Card, Icon, Muted, Query, Screen, Title, s } from '../components/ui';
import BrandLogo from '../components/BrandLogo';
import HomeScreen from './HomeScreen';
import { ProviderHome } from './ProviderWorkspace';

const steps = [
  ['search-outline', 'Find a local professional', 'Explore services in your municipality. Compare rates, profiles and credentials before you choose.'],
  ['calendar-outline', 'Book a service', 'Describe your job, choose an available time and review the price in Philippine pesos.'],
  ['chatbubbles-outline', 'Follow your booking', 'See status updates and keep messages with your provider in the booking conversation.']
];
const preference = 'serbisyogo.welcome.v1';

export default function WelcomeScreen(props) {
  const { identity, authLoading } = useApp();
  const [ready, setReady] = useState(Platform.OS !== 'android');
  const [seen, setSeen] = useState(Platform.OS !== 'android');
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    let active = true;
    AsyncStorage.getItem(preference).then(value => { if (active) setSeen(value === 'done'); })
      .catch(() => {}).finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);
  async function finish() {
    setSeen(true);
    await AsyncStorage.setItem(preference, 'done').catch(() => {});
  }
  if (!ready || authLoading) return <Screen footer={false}><BrandLogo /><Query query={{ loading: true }} /></Screen>;
  if (identity?.role === 'provider') return <ProviderHome {...props} />;
  if (seen || identity) return <HomeScreen {...props} />;
  const [icon, title, detail] = steps[step];
  return <Screen footer={false}><BrandLogo /><Card style={s.stack}>
    <Icon name={icon} size={42} /><Muted>{step + 1} of {steps.length}</Muted><Title>{title}</Title><Text style={s.muted}>{detail}</Text>
    <Button title={step === steps.length - 1 ? 'Get Started' : 'Continue'} onPress={step === steps.length - 1 ? finish : () => setStep(step + 1)} />
    <Button title="Skip" secondary onPress={finish} />
  </Card></Screen>;
}
