import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Package, ShoppingBag } from 'lucide-react-native';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

type OrderStatus = 'new' | 'confirmed' | 'shipping' | 'delivered' | 'cancelled';

interface OrderItem {
  id: string;
  title: string;
  price_text: string | null;
  quantity: number;
  image: string | null;
  variant_title: string | null;
}

interface Order {
  id: string;
  status: OrderStatus;
  total_items: number;
  note: string | null;
  created_at: string;
  order_items: OrderItem[];
}

const STATUS_META: Record<OrderStatus, { label: string; color: string; bg: string }> = {
  new:       { label: 'قيد المراجعة', color: '#8A6D00', bg: '#FFF3CD' },
  confirmed: { label: 'تم التأكيد',   color: '#0A5C36', bg: '#D4EDDA' },
  shipping:  { label: 'قيد الشحن',    color: '#0B4A8F', bg: '#D6E4FF' },
  delivered: { label: 'تم التسليم',   color: '#1B5E20', bg: '#C8E6C9' },
  cancelled: { label: 'ملغي',         color: '#8B1A1A', bg: '#F8D7DA' },
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('ar-IQ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const meta = STATUS_META[status] ?? STATUS_META.new;
  return (
    <View style={{ backgroundColor: meta.bg, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 }}>
      <Text style={{ color: meta.color, fontSize: 12, fontWeight: '800' }}>{meta.label}</Text>
    </View>
  );
}

function OrderCard({ order }: { order: Order }) {
  return (
    <View
      style={{
        backgroundColor: '#FFFFFF',
        marginHorizontal: 12,
        marginBottom: 12,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#E8E8E8',
        overflow: 'hidden',
      }}
    >
      {/* Header: order number + status */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 14,
          paddingVertical: 12,
          backgroundColor: '#FAFAFA',
          borderBottomWidth: 1,
          borderBottomColor: '#EEEEEE',
        }}
      >
        <View>
          <Text style={{ color: '#0F1111', fontSize: 14, fontWeight: '800' }}>
            طلب #{order.id.slice(0, 8).toUpperCase()}
          </Text>
          <Text style={{ color: '#999', fontSize: 11, marginTop: 2 }}>
            {formatDate(order.created_at)}
          </Text>
        </View>
        <StatusBadge status={order.status} />
      </View>

      {/* Items */}
      <View style={{ paddingHorizontal: 14, paddingVertical: 10, gap: 10 }}>
        {order.order_items?.map((it) => (
          <View key={it.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {it.image ? (
              <Image
                source={{ uri: it.image }}
                style={{ width: 46, height: 46, borderRadius: 8, backgroundColor: '#F2F2F2' }}
                resizeMode="contain"
              />
            ) : (
              <View
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 8,
                  backgroundColor: '#F2F2F2',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ShoppingBag size={20} color="#CCC" />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text numberOfLines={2} style={{ color: '#0F1111', fontSize: 12, lineHeight: 17 }}>
                {it.title}
              </Text>
              {it.variant_title ? (
                <Text style={{ color: '#999', fontSize: 10 }}>{it.variant_title}</Text>
              ) : null}
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              {it.price_text ? (
                <Text style={{ color: '#B12704', fontSize: 12, fontWeight: '700' }}>{it.price_text}</Text>
              ) : null}
              <Text style={{ color: '#565959', fontSize: 11 }}>الكمية: {it.quantity}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Footer */}
      <View
        style={{
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderTopWidth: 1,
          borderTopColor: '#EEEEEE',
          flexDirection: 'row',
          justifyContent: 'space-between',
        }}
      >
        <Text style={{ color: '#565959', fontSize: 12 }}>إجمالي القطع</Text>
        <Text style={{ color: '#0F1111', fontSize: 12, fontWeight: '700' }}>{order.total_items} قطعة</Text>
      </View>
    </View>
  );
}

export default function OrdersScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = useCallback(async () => {
    if (!user) {
      setOrders([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('orders')
      .select('id, status, total_items, note, created_at, order_items(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);
    if (!error && data) setOrders(data as unknown as Order[]);
    setLoading(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchOrders();
    }, [fetchOrders])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  }, [fetchOrders]);

  const Header = (
    <View style={{ backgroundColor: '#131921', paddingTop: insets.top }}>
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 14,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View>
          <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '800', letterSpacing: -0.3 }}>
            طلباتي
          </Text>
          {user ? (
            <Text style={{ color: '#FF9900', fontSize: 12, marginTop: 2 }}>
              {orders.length} طلب
            </Text>
          ) : null}
        </View>
        <Package size={22} color="#FF9900" strokeWidth={1.5} />
      </View>
    </View>
  );

  // Not signed in
  if (!user) {
    return (
      <View testID="orders-screen" style={{ flex: 1, backgroundColor: '#EAEDED' }}>
        {Header}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80, paddingHorizontal: 32 }}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: '#FFFFFF',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
              borderWidth: 2,
              borderColor: '#E0E0E0',
            }}
          >
            <Package size={36} color="#FF9900" strokeWidth={1.5} />
          </View>
          <Text style={{ color: '#0F1111', fontSize: 20, fontWeight: '700', marginBottom: 8, textAlign: 'center' }}>
            تابع طلباتك
          </Text>
          <Text style={{ color: '#565959', fontSize: 14, textAlign: 'center', lineHeight: 21, marginBottom: 28 }}>
            سجّل دخولك لعرض طلباتك ومتابعة حالتها
          </Text>
          <Pressable
            testID="sign-in-button"
            onPress={() => router.push('/auth')}
            style={({ pressed }) => ({
              backgroundColor: '#FFD814',
              borderRadius: 8,
              paddingHorizontal: 40,
              paddingVertical: 14,
              borderWidth: 1,
              borderColor: '#FFA41C',
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text style={{ color: '#0F1111', fontSize: 15, fontWeight: '700' }}>تسجيل الدخول</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Loading
  if (loading) {
    return (
      <View testID="orders-screen" style={{ flex: 1, backgroundColor: '#EAEDED' }}>
        {Header}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80 }}>
          <ActivityIndicator size="large" color="#FF9900" />
        </View>
      </View>
    );
  }

  // Empty
  if (orders.length === 0) {
    return (
      <View testID="orders-screen" style={{ flex: 1, backgroundColor: '#EAEDED' }}>
        {Header}
        <FlatList
          data={[]}
          renderItem={null}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF9900" />}
          contentContainerStyle={{ flexGrow: 1 }}
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 120 }}>
              <Package size={56} color="#CCCCCC" strokeWidth={1} style={{ marginBottom: 20 }} />
              <Text style={{ color: '#0F1111', fontSize: 18, fontWeight: '700', marginBottom: 8 }}>
                لا توجد طلبات بعد
              </Text>
              <Text style={{ color: '#565959', fontSize: 13, textAlign: 'center', paddingHorizontal: 40, marginBottom: 24 }}>
                عند إرسال طلب عبر السلة سيظهر هنا لمتابعة حالته
              </Text>
              <Pressable
                onPress={() => router.push('/')}
                style={({ pressed }) => ({
                  backgroundColor: '#FFD814',
                  borderRadius: 8,
                  paddingHorizontal: 28,
                  paddingVertical: 12,
                  borderWidth: 1,
                  borderColor: '#FFA41C',
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Text style={{ color: '#0F1111', fontSize: 14, fontWeight: '700' }}>ابدأ التسوق</Text>
              </Pressable>
            </View>
          }
        />
      </View>
    );
  }

  return (
    <View testID="orders-screen" style={{ flex: 1, backgroundColor: '#EAEDED' }}>
      {Header}
      <FlatList
        data={orders}
        keyExtractor={(o) => o.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: insets.bottom + 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF9900" />}
        renderItem={({ item }) => <OrderCard order={item} />}
      />
    </View>
  );
}
