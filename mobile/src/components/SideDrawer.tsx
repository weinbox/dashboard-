import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Home, Heart, ShoppingCart, Package, User, LogOut, LogIn, X } from 'lucide-react-native';
import { useUIStore } from '@/lib/ui-store';
import { useAuth } from '@/lib/auth-context';
import { useCartStore } from '@/lib/cart';

const NAV_ITEMS = [
  { label: 'الرئيسية', icon: Home, path: '/' },
  { label: 'محفوظاتي', icon: Heart, path: '/favorites' },
  { label: 'سلتي', icon: ShoppingCart, path: '/cart' },
  { label: 'طلباتي', icon: Package, path: '/orders' },
  { label: 'حسابي', icon: User, path: '/profile' },
] as const;

const PANEL_WIDTH = Math.min(300, Dimensions.get('window').width * 0.82);

export function SideDrawer() {
  const drawerOpen = useUIStore((s) => s.drawerOpen);
  const closeDrawer = useUIStore((s) => s.closeDrawer);
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const cartCount = useCartStore((s) => s.items.reduce((sum, i) => sum + i.quantity, 0));
  const translateX = useRef(new Animated.Value(PANEL_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const [rendered, setRendered] = useState(false);
  const useNative = Platform.OS !== 'web';

  useEffect(() => {
    if (drawerOpen) {
      setRendered(true);
      Animated.parallel([
        Animated.timing(translateX, { toValue: 0, duration: 220, useNativeDriver: useNative }),
        Animated.timing(backdropOpacity, { toValue: 1, duration: 220, useNativeDriver: useNative }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateX, { toValue: PANEL_WIDTH, duration: 200, useNativeDriver: useNative }),
        Animated.timing(backdropOpacity, { toValue: 0, duration: 200, useNativeDriver: useNative }),
      ]).start(({ finished }) => {
        if (finished) setRendered(false);
      });
    }
  }, [drawerOpen, translateX, backdropOpacity, useNative]);

  if (!rendered) return null;

  const go = (path: string) => {
    closeDrawer();
    setTimeout(() => router.push(path as never), 60);
  };

  const phone =
    user?.user_metadata?.phone ||
    user?.email?.replace(/@phone\.boxglobal\.app$/, '').replace(/^964/, '+964 ');

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 1000, elevation: 1000 }]}>
      {/* Backdrop (tap to close) */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)', opacity: backdropOpacity }]}
      >
        <Pressable style={{ flex: 1 }} onPress={closeDrawer} />
      </Animated.View>

      {/* Panel */}
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          right: 0,
          width: PANEL_WIDTH,
          backgroundColor: '#131921',
          transform: [{ translateX }],
          shadowColor: '#000',
          shadowOffset: { width: -2, height: 0 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
        }}
      >
        <View style={{ flex: 1 }}>
            {/* Header / user */}
            <View
              style={{
                paddingTop: insets.top + 16,
                paddingHorizontal: 18,
                paddingBottom: 18,
                borderBottomWidth: 1,
                borderBottomColor: 'rgba(255,255,255,0.1)',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      backgroundColor: '#E52222',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ShoppingCart size={20} color="#FFFFFF" strokeWidth={2.2} />
                  </View>
                  <View>
                    <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800' }}>Box Global</Text>
                    <Text style={{ color: '#AABBCC', fontSize: 11 }}>
                      {user ? phone : 'زائر'}
                    </Text>
                  </View>
                </View>
                <Pressable onPress={closeDrawer} hitSlop={10} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
                  <X size={22} color="#AABBCC" />
                </Pressable>
              </View>
            </View>

            {/* Nav items */}
            <View style={{ paddingTop: 10 }}>
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const showBadge = item.path === '/cart' && cartCount > 0;
                return (
                  <Pressable
                    key={item.path}
                    onPress={() => go(item.path)}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 14,
                      paddingVertical: 15,
                      paddingHorizontal: 20,
                      backgroundColor: pressed ? 'rgba(255,255,255,0.08)' : 'transparent',
                    })}
                  >
                    <Icon size={22} color="#FF9900" strokeWidth={2} />
                    <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '600', flex: 1 }}>
                      {item.label}
                    </Text>
                    {showBadge ? (
                      <View
                        style={{
                          backgroundColor: '#CC0C39',
                          borderRadius: 10,
                          minWidth: 20,
                          height: 20,
                          alignItems: 'center',
                          justifyContent: 'center',
                          paddingHorizontal: 5,
                        }}
                      >
                        <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>
                          {cartCount > 99 ? '99+' : String(cartCount)}
                        </Text>
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>

            {/* Footer: sign in / out */}
            <View style={{ marginTop: 'auto', paddingHorizontal: 18, paddingBottom: insets.bottom + 20 }}>
              {user ? (
                <Pressable
                  onPress={() => {
                    closeDrawer();
                    signOut();
                  }}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    paddingVertical: 12,
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  <LogOut size={20} color="#FF6B6B" strokeWidth={2} />
                  <Text style={{ color: '#FF6B6B', fontSize: 14, fontWeight: '700' }}>تسجيل الخروج</Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => go('/auth')}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    backgroundColor: '#FFD814',
                    borderRadius: 10,
                    paddingVertical: 13,
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <LogIn size={18} color="#0F1111" strokeWidth={2.2} />
                  <Text style={{ color: '#0F1111', fontSize: 14, fontWeight: '700' }}>تسجيل الدخول</Text>
                </Pressable>
              )}
            </View>
        </View>
      </Animated.View>
    </View>
  );
}
