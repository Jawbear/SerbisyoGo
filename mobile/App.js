import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AppProvider, useApp } from './src/AppContext';
import { colors as c } from './src/theme';
import { Icon } from './src/components/ui';
import HomeScreen from './src/screens/HomeScreen';
import FindScreen from './src/screens/FindScreen';
import ProviderScreen from './src/screens/ProviderScreen';
import BookingFormScreen from './src/screens/BookingFormScreen';
import BookingReviewScreen from './src/screens/BookingReviewScreen';
import MyBookingsScreen from './src/screens/MyBookingsScreen';
import BookingRecordScreen from './src/screens/BookingRecordScreen';
import SignInScreen from './src/screens/SignInScreen';

const Stack = createNativeStackNavigator();
const theme = { ...DarkTheme, colors: { ...DarkTheme.colors, primary: c.green, background: c.background, card: c.background, text: c.text, border: c.border } };
const linking = {
  prefixes: ['serbisyogo://'],
  config: { screens: {
    Home: '', FindProfessionals: 'find', ProviderDetails: 'providers/:providerId',
    BookingForm: 'book/:providerId/:serviceId', BookingReview: 'review/:draftId',
    MyBookings: 'bookings', BookingRecord: 'bookings/:bookingId', SignIn: 'sign-in'
  } }
};

function Navigator() {
  const { mode } = useApp();
  return <NavigationContainer key={mode} theme={theme} linking={linking}>
    <Stack.Navigator screenOptions={({ navigation }) => ({
      headerStyle: { backgroundColor: c.background }, headerTintColor: c.text,
      headerTitleStyle: { fontSize: 16, fontWeight: '700' }, headerShadowVisible: false,
      headerBackVisible: false, contentStyle: { backgroundColor: c.background },
      headerLeft: ({ canGoBack }) => canGoBack ? <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => navigation.goBack()} style={styles.back}><Icon name="arrow-back-outline" color={c.text} /></Pressable> : null
    })}>
      <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'SerbisyoGo', headerTitle: () => <View style={styles.brand}><Image source={require('./assets/logo.png')} style={styles.logo} /><Text style={styles.brandText}>SerbisyoGo</Text></View> }} />
      <Stack.Screen name="FindProfessionals" component={FindScreen} options={{ title: 'Find a professional' }} />
      <Stack.Screen name="ProviderDetails" component={ProviderScreen} options={{ title: 'Provider details' }} />
      <Stack.Screen name="BookingForm" component={BookingFormScreen} options={{ title: 'Your service request' }} />
      <Stack.Screen name="BookingReview" component={BookingReviewScreen} options={{ title: 'Review request' }} />
      <Stack.Screen name="MyBookings" component={MyBookingsScreen} options={{ title: 'My bookings' }} />
      <Stack.Screen name="BookingRecord" component={BookingRecordScreen} options={{ title: 'Booking details' }} />
      <Stack.Screen name="SignIn" component={SignInScreen} options={{ title: 'Sign in', presentation: 'modal' }} />
    </Stack.Navigator>
  </NavigationContainer>;
}

export default function App() {
  return <SafeAreaProvider><AppProvider><StatusBar style="light" /><Navigator /></AppProvider></SafeAreaProvider>;
}

const styles = StyleSheet.create({
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 }, logo: { width: 30, height: 30, borderRadius: 8 },
  brandText: { color: c.text, fontSize: 18, fontWeight: '800', letterSpacing: -0.4 }, back: { padding: 10, marginLeft: -8, marginRight: 6, minWidth: 44, minHeight: 44, justifyContent: 'center' }
});
