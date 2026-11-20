import BrandLogo from '../components/BrandLogo';
import { useEffect, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { Linking, Platform, Pressable, Text, View } from 'react-native';
import { useApp } from '../AppContext';
import { signInDestination } from '../auth';
import { supabase, websiteUrl } from '../data/backend';
import { useAction } from '../hooks';
import { startGoogleAuth } from '../googleAuth';
import { colors as c } from '../theme';
import { Button, Card, Field, GoogleButton, Label, Muted, Notice, Screen, Title, s } from '../components/ui';

export default function SignInScreen({ navigation, route }) {
  const { signIn, liveAvailable, identity, authError } = useApp();
  const [email, setEmail] = useState(route.params?.email || '');
  const [password, setPassword] = useState('');
  const action = useAction();
  const focused = useIsFocused();
  async function submit() {
    await action.run(async () => {
      if (!email.trim() || !password) throw new Error('Enter your email address and password.');
      const address = email.trim().toLowerCase();
      try {
        const account = await signIn(address, password);
        if (!account) throw new Error('Your account could not be verified. Please try again.');
      } catch (error) {
        const needsVerification = error.code === 'email_not_confirmed' || (!error.code && error.message === 'Email not confirmed');
        if (!needsVerification) throw error;
        navigation.replace('VerifyEmail', { ...route.params, email: address });
      }
    });
  }

  useEffect(() => {
    if (!identity || !focused) return;
    navigation.replace(signInDestination(identity.role, route.params), route.params?.routeParams);
  }, [identity, focused, navigation, route.params]);

  async function handleGoogleAuth() {
    await action.run(async () => {
      if (!liveAvailable || !supabase) throw new Error('Authentication is unavailable until Supabase is configured.');
      await startGoogleAuth(supabase, Platform.OS, url => Linking.openURL(url), globalThis.window?.location?.origin || websiteUrl);
    });
  }

  return (
    <Screen footer={false}>
      <View style={s.stack}>
        <BrandLogo />
        <Label>Welcome back</Label>
        <Title>Your home services, all together.</Title>
      </View>
      <Card style={s.stack}>
        <View style={{ gap: 4 }}>
          <Text accessibilityRole="header" style={{ color: c.text, fontSize: 24, fontWeight: '700', letterSpacing: -0.4 }}>Sign in</Text>
          <Muted>Your details stay with your account.</Muted>
        {route.params?.fromOpening && <Button title="Browse as guest" secondary onPress={() => navigation.replace('Home')} />}
        </View>
        <Field label="Email address" placeholder="you@example.com" autoCapitalize="none" autoComplete="email" keyboardType="email-address" value={email} onChangeText={setEmail} />
        <Field label="Password" secureTextEntry autoComplete="current-password" value={password} onChangeText={setPassword} onSubmitEditing={submit} />
        <Pressable accessibilityRole="button" accessibilityLabel="Forgot password?" onPress={() => navigation.navigate('ForgotPassword')} style={{ alignSelf: 'flex-start' }}>
          <Text style={{ color: c.green, fontSize: 13, fontWeight: '600' }}>Forgot password?</Text>
        </Pressable>
        {(action.error || authError) && <Notice error>{action.error || authError}</Notice>}
        {!liveAvailable && <Notice error>The service connection is not configured. Please contact support.</Notice>}
        <View style={s.actionsRow}>
          <View style={s.flex}>
            <Button title="Sign in" disabled={!liveAvailable} busy={action.busy} onPress={submit} />
          </View>
          <View style={{ flex: 1.25 }}>
            <GoogleButton title="Continue with Gmail" disabled={!liveAvailable || action.busy} onPress={handleGoogleAuth} />
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
