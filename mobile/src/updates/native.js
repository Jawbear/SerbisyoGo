import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

export const updater = Platform.OS === 'android' ? requireOptionalNativeModule('SerbisyoGoUpdater') : null;
