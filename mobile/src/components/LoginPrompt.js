import { Button, Card, Muted, Notice, Title, s } from './ui';
import { useApp } from '../AppContext';

export default function LoginPrompt({ navigation, returnTo, routeParams }) {
  const { authLoading, authError } = useApp();
  return <Card style={s.stack}><Title>Your account, your bookings.</Title><Muted>{authLoading ? 'Checking your account…' : 'Sign in to save a request or view your private service records.'}</Muted>{authError && <Notice error>{authError}</Notice>}<Button title="Sign in to continue" disabled={authLoading} onPress={() => navigation.navigate('SignIn', { returnTo, routeParams })} /></Card>;
}
