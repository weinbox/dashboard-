import { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function IherbBrowser() {
  const insets = useSafeAreaInsets();
  const { url } = useLocalSearchParams<{ url?: string }>();
  const targetUrl = url ?? 'https://www.iherb.com';

  useEffect(() => {
    async function open() {
      await WebBrowser.openBrowserAsync(targetUrl, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
        toolbarColor: '#0F7D3B',
        controlsColor: '#ffffff',
        enableBarCollapsing: true,
      });
      router.back();
    }
    open();
  }, [targetUrl]);

  return (
    <View style={{
      flex: 1,
      backgroundColor: '#0F7D3B',
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: insets.top,
    }}>
      <Text style={{ color: '#ffffff', fontSize: 22, fontWeight: '700', marginBottom: 16 }}>
        iHerb
      </Text>
      <ActivityIndicator color="#ffffff" size="large" />
      <Text style={{ color: 'rgba(255,255,255,0.7)', marginTop: 12, fontSize: 14 }}>
        جاري فتح المتصفح...
      </Text>
    </View>
  );
}
