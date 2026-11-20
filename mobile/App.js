import BrandLogo from './src/components/BrandLogo';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { requireOptionalNativeModule } from 'expo';
import { NavigationContainer, DarkTheme, useIsFocused } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AppProvider, useApp } from './src/AppContext';
import { openingDestination } from './src/opening';
import { colors as c } from './src/theme';
import { Icon } from './src/components/ui';
import WelcomeScreen from './src/screens/WelcomeScreen';
import SupportCases from './src/screens/SupportCases';
import ProfileScreen from './src/screens/ProfileScreen';
import { ProviderSettings } from './src/screens/ProviderWorkspace';
import FindScreen from './src/screens/FindScreen';
import ProviderScreen from './src/screens/ProviderScreen';
import BookingFormScreen from './src/screens/BookingFormScreen';
import BookingReviewScreen from './src/screens/BookingReviewScreen';
import MyBookingsScreen from './src/screens/MyBookingsScreen';
import BookingRecordScreen from './src/screens/BookingRecordScreen';
import SignInScreen from './src/screens/SignInScreen';
import { UpdateProvider } from './src/updates/UpdateContext';
import UpdateScreen from './src/updates/UpdateScreen';
import { RegisterScreen, VerifyEmailScreen, ForgotPasswordScreen } from './src/screens/AuthScreens';
import { isGoogleAuthCallback } from './src/googleAuth';
import MessagesScreen from './src/screens/MessagesScreen';
import ProviderVerificationScreen from './src/screens/ProviderVerificationScreen';

import InformationScreen from './src/screens/InformationScreen';

const Stack = createNativeStackNavigator();
const android = Platform.OS === 'android';
const intro = android ? requireOptionalNativeModule('SerbisyoGoIntro') : null;
const theme = { ...DarkTheme, colors: { ...DarkTheme.colors, primary: c.green, background: c.background, card: c.background, text: c.text, border: c.border } };
const linking = {
  prefixes: ['serbisyogo://'],
  filter: url => !isGoogleAuthCallback(url),
  config: { screens: {
    Home: '', FindProfessionals: 'find', ProviderDetails: 'providers/:providerId',
    BookingForm: 'book/:providerId/:serviceId', BookingReview: 'review/:draftId',
    MyBookings: 'bookings', BookingRecord: 'bookings/:bookingId', SignIn: 'sign-in',
    Register: 'register', VerifyEmail: 'verify-email', ForgotPassword: 'forgot-password', Messages: 'messages/:bookingId?', Profile: 'profile', SupportCases: 'support', ProviderSettings: 'provider/services', AppUpdates: 'app-updates', ProviderVerification: 'provider/verification', Information: 'info/:page'
  } }
};

function StartupDestination({ navigation, finished }) {
  const { identity } = useApp();
  const focused = useIsFocused();
  useEffect(() => {
    if (finished && focused) {
      navigation.reset({ index: 0, routes: [openingDestination(identity)] });
    }
  }, [finished, focused, identity, navigation]);
  return <View style={styles.opening} />;
}

function Navigator({ finished }) {
  return <NavigationContainer theme={theme} linking={linking}>
    <Stack.Navigator initialRouteName={android ? 'Startup' : 'Home'} screenOptions={({ navigation }) => ({
      headerStyle: { backgroundColor: c.background }, headerTintColor: c.text,
      headerTitleStyle: { fontSize: 16, fontWeight: '700' }, headerShadowVisible: false,
      headerBackVisible: false, contentStyle: { backgroundColor: c.background },
      headerLeft: ({ canGoBack }) => canGoBack ? <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => navigation.goBack()} style={styles.back}><Icon name="arrow-back-outline" color={c.text} /></Pressable> : null
    })}>
      {android && <Stack.Screen name="Startup" options={{ headerShown: false, animation: 'none' }}>
        {props => <StartupDestination {...props} finished={finished} />}
      </Stack.Screen>}
      <Stack.Screen name="Home" component={WelcomeScreen} options={{ title: 'SerbisyoGo', headerTitle: () => <View style={styles.brand}><BrandLogo size={36} /><Text style={styles.brandText}>SerbisyoGo</Text></View> }} />
      <Stack.Screen name="SupportCases" component={SupportCases} options={{ title:'Support requests' }} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'My account' }} />
      <Stack.Screen name="ProviderSettings" component={ProviderSettings} options={{ title: 'Provider settings' }} />
      <Stack.Screen name="FindProfessionals" component={FindScreen} options={{ title: 'Find a professional' }} />
      <Stack.Screen name="ProviderDetails" component={ProviderScreen} options={{ title: 'Provider details' }} />
      <Stack.Screen name="BookingForm" component={BookingFormScreen} options={{ title: 'Your service request' }} />
      <Stack.Screen name="BookingReview" component={BookingReviewScreen} options={{ title: 'Review request' }} />
      <Stack.Screen name="MyBookings" component={MyBookingsScreen} options={{ title: 'My bookings' }} />
      <Stack.Screen name="BookingRecord" component={BookingRecordScreen} options={{ title: 'Booking details' }} />
      <Stack.Screen name="SignIn" component={SignInScreen} options={{ title: 'Sign in', presentation: 'modal' }} />
      <Stack.Screen name="AppUpdates" component={UpdateScreen} options={{title:'App updates'}} />
      <Stack.Screen name="Register" component={RegisterScreen} options={{title:'Create account'}} />
      <Stack.Screen name="Messages" component={MessagesScreen} options={{title:'Messages'}} />
      <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} options={{title:'Verify email'}} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{title:'Reset password'}} />
      <Stack.Screen name="Information" component={InformationScreen} options={{title:'About SerbisyoGo'}}/>
      <Stack.Screen name="ProviderVerification" component={ProviderVerificationScreen} options={{title:'Provider credentials'}} />
    </Stack.Navigator>
  </NavigationContainer>;
}

export default function App() {
  const [opening, setOpening] = useState(Boolean(intro));
  const started = useRef(false);
  async function playOpening() {
    if (started.current) return;
    started.current = true;
    try { await intro.play(); }
    catch { /* Continue startup when Android cannot present or decode the movie. */ }
    finally { setOpening(false); }
  }
  return <SafeAreaProvider><AppProvider><UpdateProvider allowPrompt={!opening}>
    <StatusBar style="light" />
    <View style={{ flex: 1 }}>
      <Navigator finished={!opening} />
      {opening && <View style={[StyleSheet.absoluteFill, styles.opening]} onLayout={playOpening} />}
    </View>
  </UpdateProvider></AppProvider></SafeAreaProvider>;
}

const styles = StyleSheet.create({
  opening: { flex: 1, backgroundColor: '#000' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandText: { color: c.text, fontSize: 18, fontWeight: '800', letterSpacing: -0.4 }, back: { padding: 10, marginLeft: -8, marginRight: 6, minWidth: 44, minHeight: 44, justifyContent: 'center' }
});
