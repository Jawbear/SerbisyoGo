import { Button, Card, Muted, Title, s } from './ui';

export default function LoginPrompt({ navigation, returnTo, routeParams }) {
  return <Card style={s.stack}><Title>Your account, your bookings.</Title><Muted>Sign in to save a request or view your private service records.</Muted><Button title="Sign in to continue" onPress={() => navigation.navigate('SignIn', { returnTo, routeParams })} /></Card>;
}
