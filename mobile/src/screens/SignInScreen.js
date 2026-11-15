import { useState } from 'react';
import { Linking, Platform, Pressable, Text, View } from 'react-native';
import { useApp } from '../AppContext';
import { liveAvailable, supabase, websiteUrl } from '../data/backend';
import { useAction } from '../hooks';
import { colors as c } from '../theme';
import { Button, Card, Field, GoogleButton, Label, Muted, Notice, Screen, Title, s } from '../components/ui';

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

  return (
    <Screen footer={false}>
      <View style={s.stack}>
        <Label>Welcome back</Label>
        <Title>Your home services, all together.</Title>
      </View>
      <Card style={s.stack}>
        <View style={{ gap: 4 }}>
          <Text accessibilityRole="header" style={{ color: c.text, fontSize: 24, fontWeight: '700', letterSpacing: -0.4 }}>Sign in</Text>
          <Muted>Your details stay with your account.</Muted>
        </View>
        <Field label="Email address" placeholder="you@example.com" autoCapitalize="none" autoComplete="email" keyboardType="email-address" value={email} onChangeText={setEmail} />
        <Field label="Password" secureTextEntry autoComplete="current-password" value={password} onChangeText={setPassword} onSubmitEditing={submit} />
        <Pressable accessibilityRole="button" accessibilityLabel="Forgot password?" onPress={() => navigation.navigate('ForgotPassword')} style={{ alignSelf: 'flex-start' }}>
          <Text style={{ color: c.green, fontSize: 13, fontWeight: '600' }}>Forgot password?</Text>
        </Pressable>
        {action.error && <Notice error>{action.error}</Notice>}
        {!liveAvailable && <Notice error>The service connection is not configured. Please contact support.</Notice>}
        <View style={s.actionsRow}>
          <View style={s.flex}>
            <Button title="Sign in" disabled={!liveAvailable} busy={action.busy} onPress={submit} />
          </View>
          <View style={{ flex: 1.25 }}>
            <GoogleButton title="Continue with Gmail" disabled={!liveAvailable} onPress={handleGoogleAuth} />
          </View>
        </View>
        <View style={[s.row, { justifyContent: 'center', marginTop: 10 }]}>
          <Muted>New here? </Muted>
          <Pressable accessibilityRole="button" accessibilityLabel="Create an account" onPress={() => navigation.navigate('Register')}>
            <Text style={{ color: c.green, fontWeight: '700', fontSize: 13 }}>Create an account</Text>
          </Pressable>
        </View>
      </Card>
    </Screen>
  );
}
