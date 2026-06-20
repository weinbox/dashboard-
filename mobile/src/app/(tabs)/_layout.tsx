import { Tabs } from 'expo-router';
import { Home, Heart, User, ShoppingCart, Package } from 'lucide-react-native';
import { Text, View } from 'react-native';
import { useCartStore } from '@/lib/cart';

function CartTabIcon({ color, size }: { color: string; size: number }) {
  const items = useCartStore((s) => s.items);
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <View style={{ position: 'relative' }}>
      <ShoppingCart size={size} color={color} strokeWidth={2} />
      {totalItems > 0 ? (
        <View
          testID="cart-badge"
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
            borderColor: '#232F3E',
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 9, fontWeight: '800', lineHeight: 12 }}>
            {totalItems > 99 ? '99+' : String(totalItems)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // Bottom tab bar is hidden — navigation is handled by the side drawer
        // (☰) in the top bar. This avoids a double bottom bar when the site is
        // embedded inside another app.
        tabBarStyle: { display: 'none' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'الرئيسية',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Home size={size} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: 'محفوظاتي',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Heart size={size} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'سلتي',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <CartTabIcon color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'طلباتي',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Package size={size} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'حسابي',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <User size={size} color={color} strokeWidth={2} />
          ),
        }}
      />
    </Tabs>
  );
}
