import BrandLogo from '../components/BrandLogo';
import { useEffect, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { Linking, Platform, Pressable, Text, View } from 'react-native';
import { useApp } from '../AppContext';
import { supabase, websiteUrl } from '../data/backend';
import { registration, signInDestination, verificationCode } from '../auth';
import { useAction } from '../hooks';
import { startGoogleAuth } from '../googleAuth';
import { colors as c } from '../theme';
import { Button, Card, Field, GoogleButton, Label, Muted, Notice, Screen, Title, s } from '../components/ui';

const callback = (next = '/login/') => `${websiteUrl}/auth/callback/?next=${encodeURIComponent(next)}`;

export function RegisterScreen({ navigation }) {
  const { liveAvailable, identity, authError } = useApp();
  const [values, setValues] = useState({ name: '', email: '', phone: '', password: '', confirm: '', consent: false });
  const set = (key, value) => setValues(previous => ({ ...previous, [key]: value }));
  const action = useAction();
  const focused = useIsFocused();

  useEffect(() => {
    if (identity && focused) navigation.replace('Home');
  }, [identity, focused, navigation]);

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
        <Label>Join your local community</Label>
        <Title>A little help starts here.</Title>
      </View>
      <Card style={s.stack}>
        <View style={{ gap: 4 }}>
          <Text accessibilityRole="header" style={{ color: c.text, fontSize: 24, fontWeight: '700', letterSpacing: -0.4 }}>Create an account</Text>
          <Muted>Your details stay with your account.</Muted>
        </View>
        <Field label="Full name" value={values.name} onChangeText={value => set('name', value)} maxLength={100} autoComplete="name" />
        <Field label="Email address" value={values.email} onChangeText={value => set('email', value)} keyboardType="email-address" autoCapitalize="none" autoComplete="email" maxLength={254} />
        <Field label="Philippine mobile number" value={values.phone} onChangeText={value => set('phone', value)} keyboardType="phone-pad" placeholder="09xxxxxxxxx" autoComplete="tel" />
        <Field label="Password" value={values.password} onChangeText={value => set('password', value)} secureTextEntry autoComplete="new-password" maxLength={128} />
        <Field label="Confirm password" value={values.confirm} onChangeText={value => set('confirm', value)} secureTextEntry autoComplete="new-password" maxLength={128} />
        <Pressable accessibilityRole="checkbox" accessibilityLabel="Accept privacy notice and service terms" accessibilityState={{ checked: values.consent }} onPress={() => set('consent', !values.consent)} style={[s.row, { minHeight: 48 }]}>
          <Text style={s.fieldLabel}>{values.consent ? '☑' : '☐'}</Text>
          <Muted style={s.flex}>I accept the privacy notice and service terms.</Muted>
        </Pressable>
        <View style={[s.row, { gap: 10 }]}>
          <Pressable accessibilityRole="button" onPress={() => action.run(() => Linking.openURL(`${websiteUrl}/privacy/`))}>
            <Text style={{ color: c.green, fontSize: 12, fontWeight: '600' }}>Privacy notice</Text>
          </Pressable>
          <Muted>•</Muted>
          <Pressable accessibilityRole="button" onPress={() => action.run(() => Linking.openURL(`${websiteUrl}/terms/`))}>
            <Text style={{ color: c.green, fontSize: 12, fontWeight: '600' }}>Service terms</Text>
          </Pressable>
        </View>
        {(action.error || authError) && <Notice error>{action.error || authError}</Notice>}
        <View style={s.actionsRow}>
          <View style={s.flex}>
            <Button title="Create account" disabled={!liveAvailable} busy={action.busy} onPress={() => action.run(async () => {
              const input = registration(values);
              if (!supabase) throw new Error('Authentication is unavailable until Supabase is configured.');
              const { data: availability, error: checkError } = await supabase.rpc('check_registration_availability', {
                p_email: input.email,
                p_full_name: input.data.full_name
              });
              if (checkError) throw checkError;
              if (!availability || typeof availability.available !== 'boolean') {
                throw new Error('Unable to check account details. Please try again.');
              }
              if (!availability.available) {
                throw new Error(availability.error || 'This email or full name is already registered.');
              }
              const { data, error } = await supabase.auth.signUp({ email: input.email, password: input.password, options: { data: input.data, emailRedirectTo: callback() } });
              if (error) {
                const msg = error.message?.toLowerCase() || '';
                if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('user already registered') || msg.includes('email_exists')) {
                  throw new Error('This email address is already in use or registered. Please sign in or use another email.');
                }
                if (msg.includes('profiles_full_name_unique_idx') || (msg.includes('name') && msg.includes('unique'))) {
                  throw new Error('This full name is already registered. Shared first names are allowed; the full name must be different.');
                }
                throw error;
              }
              if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
                throw new Error('This email address is already in use or registered. Please sign in or use another email.');
              }
              if (!data?.user) throw new Error('Account creation could not be confirmed. Please try again.');
              if (!data.session) navigation.replace('VerifyEmail', { email: input.email });
            })} />
          </View>
          <View style={{ flex: 1.25 }}>
            <GoogleButton title="Sign up with Gmail" disabled={!liveAvailable || action.busy} onPress={handleGoogleAuth} />
          </View>
        </View>
        <View style={[s.row, { justifyContent: 'center', marginTop: 10 }]}>
          <Muted>Already registered? </Muted>
          <Pressable accessibilityRole="button" accessibilityLabel="Sign in" onPress={() => navigation.replace('SignIn')}>
            <Text style={{ color: c.green, fontWeight: '700', fontSize: 13 }}>Sign in</Text>
          </Pressable>
        </View>
      </Card>
    </Screen>
  );
}

export function VerifyEmailScreen({ navigation, route }) {
  const [email, setEmail] = useState(route.params?.email || '');
  const [token, setToken] = useState('');
  const [sent, setSent] = useState(false);
  const action = useAction();
  const { liveAvailable, identity, authError } = useApp();
  const focused = useIsFocused();

  useEffect(() => {
    if (identity && focused) navigation.replace(signInDestination(identity.role, route.params), route.params?.routeParams);
  }, [identity, focused, navigation, route.params]);

  return (
    <Screen footer={false}>
      <BrandLogo />
      <Title>Verify your email</Title>
      <Notice>Enter the verification code from your email. If you confirmed using the email link, go back to sign in. Check your spam folder if the email is missing.</Notice>
      <Card style={s.stack}>
        <Field label="Email address" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <Field label="Verification code" value={token} onChangeText={setToken} keyboardType="number-pad" autoComplete="one-time-code" />
        {(action.error || authError) && <Notice error>{action.error || authError}</Notice>}
        {sent && <Notice>A fresh verification code was sent. Please check your inbox.</Notice>}
        <Button title="Verify code & sign in" disabled={!liveAvailable} busy={action.busy} onPress={() => action.run(async () => {
          const address = email.trim().toLowerCase();
          if (!address) throw new Error('Enter your email address.');
          const { data, error } = await supabase.auth.verifyOtp({
            email: address,
            token: verificationCode(token),
            type: 'email'
          });
          if (error) throw error;
          if (!data?.session) navigation.replace('SignIn', { ...route.params, email: address });
        })} />
        <Button title="Resend verification code" secondary disabled={!liveAvailable} busy={action.busy} onPress={() => action.run(async () => {
          const address = email.trim().toLowerCase();
          if (!address) throw new Error('Enter your email address.');
          const { error } = await supabase.auth.resend({ type: 'signup', email: address, options: { emailRedirectTo: callback() } });
          if (error) throw error;
          setSent(true);
        })} />
        <View style={[s.row, { justifyContent: 'center', marginTop: 10 }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back to sign in" onPress={() => navigation.replace('SignIn', { ...route.params, email })}>
            <Text style={{ color: c.green, fontWeight: '700', fontSize: 13 }}>Back to sign in</Text>
          </Pressable>
        </View>
      </Card>
    </Screen>
  );
}

export function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const { liveAvailable } = useApp();
  const action = useAction();
  return (
    <Screen footer={false}>
      <Title>Reset your password</Title>
      <Muted>We will email a secure link. Choose your new password on the website, then sign in here.</Muted>
      <Card style={s.stack}>
        <Field label="Email address" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
        {action.error && <Notice error>{action.error}</Notice>}
        {sent && <Notice>If the account is eligible, a reset link will arrive shortly.</Notice>}
        <Button title="Send reset link" disabled={!liveAvailable} busy={action.busy} onPress={() => action.run(async () => {
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) throw new Error('Enter a valid email address.');
          const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: callback('/reset-password/') });
          if (error) throw error;
          setSent(true);
        })} />
        <View style={[s.row, { justifyContent: 'center', marginTop: 10 }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back to sign in" onPress={() => navigation.replace('SignIn')}>
            <Text style={{ color: c.green, fontWeight: '700', fontSize: 13 }}>Back to sign in</Text>
          </Pressable>
        </View>
      </Card>
    </Screen>
  );
}
