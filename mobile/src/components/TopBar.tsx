import { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Menu, ShoppingCart } from 'lucide-react-native';
import { useUIStore } from '@/lib/ui-store';
import { useCartStore } from '@/lib/cart';

export function TopBar({
  title,
  subtitle,
  rightOverride,
}: {
  title?: string;
  subtitle?: string;
  rightOverride?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const openDrawer = useUIStore((s) => s.openDrawer);
  const items = useCartStore((s) => s.items);
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <View style={{ backgroundColor: '#131921', paddingTop: insets.top }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 12,
          paddingVertical: 12,
        }}
      >
        {/* Menu button */}
        <Pressable
          testID="menu-button"
          onPress={openDrawer}
          hitSlop={10}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: 4 })}
        >
          <Menu size={26} color="#FFFFFF" strokeWidth={2} />
        </Pressable>

        {/* Title */}
        <View style={{ flex: 1, alignItems: 'center' }}>
          {title ? (
            <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800', letterSpacing: -0.3 }}>
              {title}
            </Text>
          ) : null}
          {subtitle ? (
            <Text style={{ color: '#FF9900', fontSize: 11, marginTop: 1 }}>{subtitle}</Text>
          ) : null}
        </View>

        {/* Right side: cart by default, or override */}
        {rightOverride ?? (
          <Pressable
            testID="topbar-cart"
            onPress={() => router.push('/cart')}
            hitSlop={10}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: 4 })}
          >
            <View style={{ position: 'relative' }}>
              <ShoppingCart size={24} color="#FFFFFF" strokeWidth={2} />
              {totalItems > 0 ? (
                <View
                  style={{
                    position: 'absolute',
                    top: -6,
                    right: -8,
                    backgroundColor: '#CC0C39',
                    borderRadius: 9,
                    minWidth: 16,
                    height: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 3,
                    borderWidth: 1.5,
                    borderColor: '#131921',
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 9, fontWeight: '800', lineHeight: 12 }}>
                    {totalItems > 99 ? '99+' : String(totalItems)}
                  </Text>
                </View>
              ) : null}
            </View>
          </Pressable>
        )}
      </View>
    </View>
  );
}
