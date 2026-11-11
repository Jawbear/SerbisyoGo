import { useState } from 'react';
import { View } from 'react-native';
import { useApp } from '../AppContext';
import { useAction } from '../hooks';
import { Button, Card, Field, Label, Muted, Notice, Screen, Title, s } from '../components/ui';

const destinations = new Set(['Home', 'BookingForm', 'BookingReview', 'BookingRecord', 'MyBookings']);

export default function SignInScreen({ navigation, route }) {
  const { signIn, liveAvailable } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const action = useAction();
  async function submit() {
    await action.run(async () => {
      if (!email.trim() || !password) throw new Error('Enter your email address and password.');
      const identity = await signIn(email, password);
      if (!identity) throw new Error('Your account could not be verified. Please try again.');
      const destination = destinations.has(route.params?.returnTo) ? route.params.returnTo : 'Home';
      if (['BookingForm', 'BookingReview'].includes(destination) && identity.role !== 'customer') throw new Error('Submitting a service request requires a customer account.');
      navigation.replace(destination, route.params?.routeParams);
    });
  }
  return <Screen footer={false}><View style={s.stack}><Label>Welcome back</Label><Title>Your home services, all together.</Title><Muted>Sign in with your existing SerbisyoGo account.</Muted></View><Card style={s.stack}>
    <Field label="Email address" placeholder="you@example.com" autoCapitalize="none" autoComplete="email" keyboardType="email-address" value={email} onChangeText={setEmail} />
    <Field label="Password" secureTextEntry autoComplete="current-password" value={password} onChangeText={setPassword} onSubmitEditing={submit} />
    {action.error && <Notice error>{action.error}</Notice>}
    {!liveAvailable && <Notice error>The service connection is not configured. Please contact support.</Notice>}
    <Button title="Sign in" disabled={!liveAvailable} busy={action.busy} onPress={submit} />
    <Muted>Account registration and password recovery remain available on the SerbisyoGo website.</Muted>
  </Card></Screen>;
}
