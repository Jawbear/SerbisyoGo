import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Modal, Pressable, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import config from '../../app.json';
import { updater } from './native';
import { mayPrompt } from './policy';
import { loadAvailableRelease } from './release';
import { colors as c } from '../theme';

const Context = createContext(null);
const REMINDER = 'serbisyogo:update-reminder';
export function UpdateProvider({ children }) {
  const installed = updater?.installedVersion() || { versionName: config.expo.version, versionCode: config.expo.android.versionCode, sdkInt: 999 };
  const [release, setRelease] = useState(null); const [checking, setChecking] = useState(false);
  const [error, setError] = useState(''); const [prompt, setPrompt] = useState(false);
  const [stage, setStage] = useState('idle'); const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState(''); const [checked, setChecked] = useState(false);
  const lock = useRef(false); const checkLock = useRef(false); const lastCheck = useRef(0);
  const installedCode = installed.versionCode, sdkInt = installed.sdkInt;
  const check = useCallback(async (automatic = false) => {
    if (checkLock.current || lock.current) return;
    checkLock.current = true; setChecking(true); setError('');
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const value = await loadAvailableRelease(installedCode, sdkInt, controller.signal);
      setRelease(value); setChecked(true); lastCheck.current = Date.now();
      if (value && automatic && updater) {
        let reminder = null;
        try { reminder = JSON.parse(await AsyncStorage.getItem(REMINDER)); } catch { /* An unavailable reminder must not block the app. */ }
        if (mayPrompt(reminder, value.version_code)) setPrompt(true);
      }
      return value;
    } catch (failure) {
      if (!automatic) setError(failure.name === 'AbortError' ? 'The update check timed out. Check your connection and try again.' : failure.message);
    } finally { clearTimeout(timer); checkLock.current = false; setChecking(false); }
  }, [installedCode, sdkInt]);
  useEffect(() => {
    if (!updater) return;
    const start = setTimeout(() => { void check(true); }, 0);
    const listener = AppState.addEventListener('change', state => {
      if (state === 'active' && Date.now() - lastCheck.current >= 6 * 3600000) void check(true);
    });
    return () => { clearTimeout(start); listener.remove(); };
  }, [check]);
  useEffect(() => {
    if (!updater) return;
    const subscription = updater.addListener('downloadProgress', value => setProgress(Math.min(100, Math.floor(value.received / value.total * 100))));
    return () => subscription.remove();
  }, []);
  async function later() {
    setPrompt(false);
    if (release) try { await AsyncStorage.setItem(REMINDER, JSON.stringify({ version: release.version_code, at: Date.now() })); } catch { /* The app stays usable if reminder storage fails. */ }
  }
  async function download() {
    if (lock.current || !release || !updater) return;
    lock.current = true; setPrompt(false); setError(''); setMessage(''); setProgress(0); setStage('downloading');
    try {
      await updater.prepareUpdate(release.download_url, release.sha256, release.byte_size, release.version_code);
      setStage('ready'); setProgress(100); setMessage('Download verified. Tap Install update to continue.');
    } catch (failure) { setStage('idle'); setError(failure.message || 'The download failed. Try again.'); }
    finally { lock.current = false; }
  }
  async function install() {
    if (lock.current || stage !== 'ready' || !updater) return;
    lock.current = true; setError('');
    try {
      const result = await updater.installUpdate();
      setMessage(result === 'permission_required' ? 'Allow SerbisyoGo to install app updates in Android settings, return here, then tap Install update again.' : 'Android installation opened. Confirm Update there. If you cancel, you can tap Install update again.');
    } catch (failure) { setError(failure.message || 'Android could not open the installer. Try again.'); }
    finally { lock.current = false; }
  }
  return <Context.Provider value={{installed,release,checking,checked,error,stage,progress,message,check,download,install,canInstall:Boolean(updater),cancel:()=>updater?.cancelDownload()}}>
    {children}
    <Modal visible={prompt} transparent animationType="fade" onRequestClose={later}>
      <View style={{flex:1,backgroundColor:'#0009',justifyContent:'center',padding:24}}><View accessibilityViewIsModal style={{backgroundColor:c.panel,borderColor:c.border,borderWidth:1,borderRadius:20,padding:24,gap:18,maxWidth:440,width:'100%',alignSelf:'center'}}>
        <Text accessibilityRole="header" style={{color:c.text,fontSize:23,fontWeight:'700'}}>A new version is available</Text><Text style={{color:c.muted,lineHeight:22}}>SerbisyoGo {release?.version_name} is ready. You can update now or keep using your current version.</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Download app update" onPress={download} style={{backgroundColor:c.green,padding:16,borderRadius:12}}><Text style={{color:c.buttonText,textAlign:'center',fontWeight:'700'}}>Download update</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Remind me later" onPress={later} style={{padding:14}}><Text style={{color:c.green,textAlign:'center'}}>Later</Text></Pressable>
      </View></View>
    </Modal>
  </Context.Provider>;
}
export function useUpdates() { return useContext(Context); }
