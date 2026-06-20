import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { View } from 'react-native';
import { AuthProvider } from '@/lib/auth-context';
import { SideDrawer } from '@/components/SideDrawer';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <View
      style={{ flex: 1, backgroundColor: '#FFFFFF' }}
      onLayout={() => SplashScreen.hideAsync()}
    >
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#FFFFFF' },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="product" options={{ headerShown: false }} />
        <Stack.Screen
          name="auth"
          options={{
            presentation: 'formSheet',
            sheetAllowedDetents: [0.6],
            sheetGrabberVisible: true,
            headerShown: false,
          }}
        />
        <Stack.Screen name="store" options={{ headerShown: false }} />
        <Stack.Screen name="iherb-browser" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <SideDrawer />
    </View>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <KeyboardProvider>
          <AuthProvider>
            <StatusBar style="dark" />
            <RootLayoutNav />
          </AuthProvider>
        </KeyboardProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
