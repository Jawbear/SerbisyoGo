import { useState } from 'react';
import { Linking, Platform, View } from 'react-native';
import { useApp } from '../AppContext';
import { liveAvailable, supabase, websiteUrl } from '../data/backend';
import { useAction } from '../hooks';
import { Button, Card, Field, Label, Muted, Notice, Screen, Title, s } from '../components/ui';

const destinations = new Set(['Home', 'BookingForm', 'BookingReview', 'BookingRecord', 'MyBookings', 'Messages']);

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

  async function handleGoogleAuth() {
    await action.run(async () => {
      if (!liveAvailable || !supabase) throw new Error('Authentication is unavailable until Supabase is configured.');
      if (Platform.OS === 'web') {
        const redirect = typeof window !== 'undefined' ? `${window.location.origin}` : `${websiteUrl}/dashboard/`;
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: redirect
          }
        });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: 'serbisyogo://sign-in'
          }
        });
        if (error) throw error;
        if (data?.url) {
          await Linking.openURL(data.url);
        }
      }
    });
  }

  return <Screen footer={false}><View style={s.stack}><Label>Welcome back</Label><Title>Your home services, all together.</Title><Muted>Sign in with your existing SerbisyoGo account.</Muted></View><Card style={s.stack}>
    <Field label="Email address" placeholder="you@example.com" autoCapitalize="none" autoComplete="email" keyboardType="email-address" value={email} onChangeText={setEmail} />
    <Field label="Password" secureTextEntry autoComplete="current-password" value={password} onChangeText={setPassword} onSubmitEditing={submit} />
    {action.error && <Notice error>{action.error}</Notice>}
    {!liveAvailable && <Notice error>The service connection is not configured. Please contact support.</Notice>}
    <Button title="Sign in" disabled={!liveAvailable} busy={action.busy} onPress={submit} />
    <Button title="Continue with Google (Gmail)" secondary disabled={!liveAvailable} onPress={handleGoogleAuth} />
    <Button title="Create an account" secondary onPress={() => navigation.navigate('Register')} />
    <Button title="Forgot password?" secondary onPress={() => navigation.navigate('ForgotPassword')} />
  </Card></Screen>;
}
