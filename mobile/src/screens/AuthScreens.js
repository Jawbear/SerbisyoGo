import { useState } from 'react';
import { Linking, Platform, Pressable, Text, View } from 'react-native';
import { useApp } from '../AppContext';
import { supabase, websiteUrl } from '../data/backend';
import { registration } from '../auth';
import { useAction } from '../hooks';
import { colors as c } from '../theme';
import { Button, Card, Field, GoogleButton, Label, Muted, Notice, Screen, Title, s } from '../components/ui';

const callback = (next = '/login/') => `${websiteUrl}/auth/callback/?next=${encodeURIComponent(next)}`;

export function RegisterScreen({ navigation }) {
  const { liveAvailable } = useApp();
  const [values, setValues] = useState({ name: '', email: '', phone: '', password: '', confirm: '', consent: false });
  const set = (key, value) => setValues(previous => ({ ...previous, [key]: value }));
  const action = useAction();

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
        {action.error && <Notice error>{action.error}</Notice>}
        <View style={s.actionsRow}>
          <View style={s.flex}>
            <Button title="Create account" disabled={!liveAvailable} busy={action.busy} onPress={() => action.run(async () => {
              const input = registration(values);
              const { data, error } = await supabase.auth.signUp({ email: input.email, password: input.password, options: { data: input.data, emailRedirectTo: callback() } });
              if (error) throw error;
              navigation.replace(data.session ? 'Home' : 'VerifyEmail', { email: input.email });
            })} />
          </View>
          <View style={{ flex: 1.25 }}>
            <GoogleButton title="Sign up with Gmail" disabled={!liveAvailable} onPress={handleGoogleAuth} />
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
  const [sent, setSent] = useState(false);
  const action = useAction();
  const { liveAvailable } = useApp();
  return (
    <Screen footer={false}>
      <Title>Check your email</Title>
      <Notice>Open the verification link in your email, then return here to sign in. Check your spam folder too.</Notice>
      <Card style={s.stack}>
        <Field label="Email address" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        {action.error && <Notice error>{action.error}</Notice>}
        {sent && <Notice>Verification email requested. Please check your inbox.</Notice>}
        <Button title="Resend verification email" disabled={!liveAvailable} busy={action.busy} onPress={() => action.run(async () => {
          if (!email.trim()) throw new Error('Enter your email address.');
          const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo: callback() } });
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
