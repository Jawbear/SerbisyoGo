import { Image } from 'react-native';

export default function BrandLogo({ size = 64 }) {
  return <Image accessible={false} source={require('../../assets/logo.png')} resizeMode="contain" style={{ width: size, height: size }} />;
}
