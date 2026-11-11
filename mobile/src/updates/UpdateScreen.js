import { Linking, View } from 'react-native';
import { useEffect } from 'react';
import { useUpdates } from './UpdateContext';
import { Button, Card, Label, Muted, Notice, Screen, Title, s } from '../components/ui';

export default function UpdateScreen() {
  const update = useUpdates();
  const {checked,check} = update;
  useEffect(() => { if (!checked) void check(); }, [checked,check]);
  return <Screen><Label>App updates</Label><Title>Keep SerbisyoGo up to date.</Title><Muted>Installed version: {update.installed.versionName} (build {update.installed.versionCode})</Muted>
    {update.error && <Notice error>{update.error}</Notice>}
    {update.message && <Notice>{update.message}</Notice>}
    {update.stage === 'downloading' ? <Card style={s.stack}><Title>Downloading update: {update.progress}%</Title><Muted>Keep the app open while the update downloads. Your account and bookings stay in place.</Muted><Button title="Cancel update download" secondary onPress={update.cancel} /></Card> : update.release ? <Card style={s.stack}>
      <Title>Version {update.release.version_name} is available</Title><Muted>{(update.release.byte_size/1048576).toFixed(1)} MB · Android {update.release.min_android} or later</Muted><Muted>{update.release.release_notes}</Muted>
      {update.canInstall ? <><Button title={update.stage==='ready'?'Install update':'Download app update'} icon="download-outline" onPress={update.stage==='ready'?update.install:update.download} /><Muted>Android may first ask you to allow updates from SerbisyoGo. Confirm installation when prompted. You do not need to uninstall the app.</Muted></> : <><Button title="Download Android APK" onPress={()=>Linking.openURL(update.release.download_url)} /><Muted>In-app installation is available in the installed Android app. Browser previews and Expo Go cannot install APK updates.</Muted></>}
    </Card> : update.checked && !update.error ? <Notice>You’re up to date.</Notice> : null}
    <View style={s.stack}><Button title="Check for updates" secondary busy={update.checking} disabled={update.stage==='downloading'} onPress={()=>update.check()} /><Muted>Updates are optional. You can continue using the app and update later.</Muted></View>
  </Screen>;
}
