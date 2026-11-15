import { useState } from 'react';
import { Linking, Pressable, Text } from 'react-native';
import { useApp } from '../AppContext';
import { supabase, websiteUrl } from '../data/backend';
import { registration } from '../auth';
import { useAction } from '../hooks';
import { Button, Card, Field, Muted, Notice, Screen, Title, s } from '../components/ui';

const callback = (next = '/login/') => `${websiteUrl}/auth/callback/?next=${encodeURIComponent(next)}`;

export function RegisterScreen({ navigation }) {
  const { liveAvailable } = useApp();
  const [values, setValues] = useState({ name: '', email: '', phone: '', password: '', confirm: '', consent: false });
  const set = (key, value) => setValues(previous => ({ ...previous, [key]: value }));
  const action = useAction();
  return <Screen footer={false}><Title>Create your account</Title><Muted>Use the same account on the mobile app and website.</Muted><Card style={s.stack}>
    <Field label="Full name" value={values.name} onChangeText={value => set('name', value)} maxLength={100} autoComplete="name" />
    <Field label="Email address" value={values.email} onChangeText={value => set('email', value)} keyboardType="email-address" autoCapitalize="none" autoComplete="email" maxLength={254} />
    <Field label="Philippine mobile number" value={values.phone} onChangeText={value => set('phone', value)} keyboardType="phone-pad" placeholder="09xxxxxxxxx" autoComplete="tel" />
    <Field label="Password" value={values.password} onChangeText={value => set('password', value)} secureTextEntry autoComplete="new-password" maxLength={128} />
    <Field label="Confirm password" value={values.confirm} onChangeText={value => set('confirm', value)} secureTextEntry autoComplete="new-password" maxLength={128} />
    <Pressable accessibilityRole="checkbox" accessibilityLabel="Accept privacy notice and service terms" accessibilityState={{ checked: values.consent }} onPress={() => set('consent', !values.consent)} style={[s.row, { minHeight: 48 }]}><Text style={s.fieldLabel}>{values.consent ? '☑' : '☐'}</Text><Muted style={s.flex}>I accept the privacy notice and service terms.</Muted></Pressable>
    <Button title="Read privacy notice" secondary onPress={() => action.run(() => Linking.openURL(`${websiteUrl}/privacy/`))} />
    <Button title="Read service terms" secondary onPress={() => action.run(() => Linking.openURL(`${websiteUrl}/terms/`))} />
    {action.error && <Notice error>{action.error}</Notice>}
    <Button title="Create account" disabled={!liveAvailable} busy={action.busy} onPress={() => action.run(async () => {
      const input = registration(values);
      const { data, error } = await supabase.auth.signUp({ email: input.email, password: input.password, options: { data: input.data, emailRedirectTo: callback() } });
      if (error) throw error;
      navigation.replace(data.session ? 'Home' : 'VerifyEmail', { email: input.email });
    })} />
    <Button title="Sign up with Google (Gmail)" secondary onPress={() => action.run(() => Linking.openURL(`${websiteUrl}/register/?next=/dashboard/`))} />
    <Button title="Already registered? Sign in" secondary onPress={() => navigation.replace('SignIn')} />
  </Card></Screen>;
}

export function VerifyEmailScreen({ navigation, route }) {
  const [email, setEmail] = useState(route.params?.email || '');
  const [sent, setSent] = useState(false);
  const action = useAction();
  const { liveAvailable } = useApp();
  return <Screen footer={false}><Title>Check your email</Title><Notice>Open the verification link in your email, then return here to sign in. Check your spam folder too.</Notice><Card style={s.stack}>
    <Field label="Email address" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
    {action.error && <Notice error>{action.error}</Notice>}{sent && <Notice>Verification email requested. Please check your inbox.</Notice>}
    <Button title="Resend verification email" disabled={!liveAvailable} busy={action.busy} onPress={() => action.run(async () => {
      if (!email.trim()) throw new Error('Enter your email address.');
      const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo: callback() } });
      if (error) throw error; setSent(true);
    })} />
    <Button title="Back to sign in" secondary onPress={() => navigation.replace('SignIn')} />
  </Card></Screen>;
}

export function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState(''); const [sent, setSent] = useState(false);
  const { liveAvailable } = useApp(); const action = useAction();
  return <Screen footer={false}><Title>Reset your password</Title><Muted>We will email a secure link. Choose your new password on the website, then sign in here.</Muted><Card style={s.stack}>
    <Field label="Email address" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
    {action.error && <Notice error>{action.error}</Notice>}{sent && <Notice>If the account is eligible, a reset link will arrive shortly.</Notice>}
    <Button title="Send reset link" disabled={!liveAvailable} busy={action.busy} onPress={() => action.run(async () => {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) throw new Error('Enter a valid email address.');
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: callback('/reset-password/') });
      if (error) throw error; setSent(true);
    })} />
    <Button title="Back to sign in" secondary onPress={() => navigation.replace('SignIn')} />
  </Card></Screen>;
}
