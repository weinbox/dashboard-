import { FlatList, Image, Linking, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ShoppingCart, Trash2, Plus, Minus, ExternalLink, MessageCircle } from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import { useCartStore, CartItem } from '@/lib/cart';
import { supabase } from '@/lib/supabase';

function parsePriceNumeric(priceText: string): number | null {
  if (!priceText) return null;
  const n = parseFloat(String(priceText).replace(/[^0-9.]/g, ''));
  return isNaN(n) ? null : n;
}

async function saveOrder(items: CartItem[], totalItems: number): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const customerPhone = (user?.user_metadata?.phone as string) ?? null;
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({
        user_id: user?.id ?? null,
        customer_phone: customerPhone,
        total_items: totalItems,
      })
      .select('id')
      .single();
    if (orderErr || !order) return;
    const rows = items.map((item) => ({
      order_id: order.id,
      title: item.title,
      price_text: item.priceText || null,
      price_numeric: parsePriceNumeric(item.priceText),
      quantity: item.quantity,
      url: item.url || null,
      image: item.image,
      platform: item.platform,
      variant_title: item.variantTitle ?? null,
    }));
    await supabase.from('order_items').insert(rows);
  } catch {
    // saving the order should never block the WhatsApp checkout
  }
}

const ORDER_WHATSAPP_NUMBER = '9647800800173';

function buildOrderMessage(items: CartItem[], totalItems: number): string {
  let msg = '🛍 طلب جديد من Box Global\n\n';
  items.forEach((item, i) => {
    msg += `${i + 1}. ${item.title}\n`;
    if (item.variantTitle) msg += `   المواصفات: ${item.variantTitle}\n`;
    msg += `   السعر: ${item.priceText || 'غير محدد'}\n`;
    msg += `   الكمية: ${item.quantity}\n`;
    if (item.url) msg += `   الرابط: ${item.url}\n`;
    msg += '\n';
  });
  msg += `──────────\n`;
  msg += `إجمالي عدد القطع: ${totalItems}`;
  return msg;
}

const PLATFORM_CONFIG: Record<CartItem['platform'], { label: string; color: string; bg: string }> = {
  ebay:    { label: 'eBay',    color: '#ffffff', bg: '#E53238' },
  amazon:  { label: 'Amazon',  color: '#0F1111', bg: '#FF9900' },
  walmart: { label: 'Walmart', color: '#ffffff', bg: '#0071DC' },
  taobao:  { label: 'Taobao',  color: '#ffffff', bg: '#FF4400' },
  '1688':  { label: '1688',    color: '#ffffff', bg: '#E62E04' },
  temu:    { label: 'Temu',    color: '#ffffff', bg: '#FA5130' },
  iherb:   { label: 'iHerb',   color: '#ffffff', bg: '#9DC41B' },
};

function CartItemRow({ item }: { item: CartItem }) {
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeFromCart = useCartStore((s) => s.removeFromCart);
  const platform = PLATFORM_CONFIG[item.platform];

  const handleBuyNow = async () => {
    if (!item.url) return;
    await WebBrowser.openBrowserAsync(item.url, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
    });
  };

  return (
    <View
      testID="cart-item"
      style={{
        backgroundColor: '#FFFFFF',
        marginHorizontal: 12,
        marginBottom: 10,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#E8E8E8',
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
      }}
    >
      <View style={{ flexDirection: 'row', padding: 12, gap: 12 }}>
        {/* Product image */}
        <View style={{
          width: 90,
          height: 90,
          backgroundColor: '#F7F7F7',
          borderRadius: 8,
          overflow: 'hidden',
          flexShrink: 0,
        }}>
          {item.image ? (
            <Image
              source={{ uri: item.image }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="contain"
            />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 32 }}>{'🛍'}</Text>
            </View>
          )}
        </View>

        {/* Info */}
        <View style={{ flex: 1, gap: 4 }}>
          {/* Platform badge */}
          <View style={{
            alignSelf: 'flex-start',
            backgroundColor: platform.bg,
            borderRadius: 4,
            paddingHorizontal: 7,
            paddingVertical: 2,
          }}>
            <Text style={{ color: platform.color, fontSize: 10, fontWeight: '700' }}>
              {platform.label}
            </Text>
          </View>

          {/* Title */}
          <Text
            numberOfLines={2}
            style={{ color: '#0F1111', fontSize: 13, lineHeight: 18, fontWeight: '500' }}
          >
            {item.title}
          </Text>

          {/* Variant */}
          {item.variantTitle ? (
            <Text style={{ color: '#565959', fontSize: 11 }}>{item.variantTitle}</Text>
          ) : null}

          {/* Price */}
          <Text style={{ color: '#B12704', fontSize: 16, fontWeight: '700', marginTop: 2 }}>
            {item.priceText || 'عرض السعر'}
          </Text>
        </View>

        {/* Remove button */}
        <Pressable
          testID="remove-cart-item-button"
          onPress={() => removeFromCart(item.id)}
          style={({ pressed }) => ({
            padding: 6,
            opacity: pressed ? 0.6 : 1,
            alignSelf: 'flex-start',
          })}
        >
          <Trash2 size={18} color="#CC0C39" strokeWidth={2} />
        </Pressable>
      </View>

      {/* Bottom row: quantity controls + buy now */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingBottom: 12,
        gap: 12,
      }}>
        {/* Quantity controls */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 0,
          borderWidth: 1,
          borderColor: '#DDD',
          borderRadius: 8,
          overflow: 'hidden',
        }}>
          <Pressable
            testID="decrease-quantity-button"
            onPress={() => updateQuantity(item.id, item.quantity - 1)}
            style={({ pressed }) => ({
              width: 36,
              height: 36,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: pressed ? '#F0F0F0' : '#FAFAFA',
            })}
          >
            <Minus size={14} color="#333" strokeWidth={2.5} />
          </Pressable>
          <View style={{
            width: 40,
            height: 36,
            alignItems: 'center',
            justifyContent: 'center',
            borderLeftWidth: 1,
            borderRightWidth: 1,
            borderColor: '#DDD',
          }}>
            <Text style={{ color: '#0F1111', fontSize: 14, fontWeight: '700' }}>
              {item.quantity}
            </Text>
          </View>
          <Pressable
            testID="increase-quantity-button"
            onPress={() => updateQuantity(item.id, item.quantity + 1)}
            style={({ pressed }) => ({
              width: 36,
              height: 36,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: pressed ? '#F0F0F0' : '#FAFAFA',
            })}
          >
            <Plus size={14} color="#333" strokeWidth={2.5} />
          </Pressable>
        </View>

        {/* Buy now */}
        <Pressable
          testID="buy-now-button"
          onPress={handleBuyNow}
          style={({ pressed }) => ({
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            backgroundColor: platform.bg,
            borderRadius: 8,
            paddingVertical: 9,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <ExternalLink size={14} color={platform.color} strokeWidth={2.5} />
          <Text style={{ color: platform.color, fontSize: 13, fontWeight: '700' }}>
            اشتري الآن
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clearCart);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

  const handleCheckout = async () => {
    if (items.length === 0) return;
    // Persist the order for the admin dashboard (non-blocking on failure)
    await saveOrder(items, totalItems);
    const message = buildOrderMessage(items, totalItems);
    const url = `https://wa.me/${ORDER_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    try {
      await Linking.openURL(url);
    } catch {
      // ignore
    }
  };

  if (items.length === 0) {
    return (
      <View testID="cart-screen" style={{ flex: 1, backgroundColor: '#EAEDED' }}>
        {/* Header */}
        <View style={{
          backgroundColor: '#131921',
          paddingTop: insets.top,
          paddingBottom: 14,
          paddingHorizontal: 16,
        }}>
          <Text style={{
            color: '#FFFFFF',
            fontSize: 20,
            fontWeight: '800',
            letterSpacing: -0.3,
            marginTop: 10,
          }}>
            سلة التسوق
          </Text>
        </View>

        <View style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingBottom: 80,
          paddingHorizontal: 32,
        }}>
          <View style={{
            width: 90,
            height: 90,
            borderRadius: 45,
            backgroundColor: '#FFFFFF',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
            borderWidth: 2,
            borderColor: '#E0E0E0',
            shadowColor: '#000',
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 3,
          }}>
            <ShoppingCart size={40} color="#CCCCCC" strokeWidth={1.5} />
          </View>
          <Text style={{
            color: '#0F1111',
            fontSize: 20,
            fontWeight: '700',
            marginBottom: 8,
            textAlign: 'center',
          }}>
            سلتك فارغة
          </Text>
          <Text style={{
            color: '#565959',
            fontSize: 14,
            textAlign: 'center',
            lineHeight: 21,
          }}>
            أضف منتجات من المتاجر المختلفة لمتابعتها في مكان واحد
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View testID="cart-screen" style={{ flex: 1, backgroundColor: '#EAEDED' }}>
      {/* Header */}
      <View style={{ backgroundColor: '#131921', paddingTop: insets.top }}>
        <View style={{
          paddingHorizontal: 16,
          paddingVertical: 14,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <View>
            <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '800', letterSpacing: -0.3 }}>
              سلة التسوق
            </Text>
            <Text style={{ color: '#FF9900', fontSize: 12, marginTop: 2 }}>
              {totalItems} {totalItems === 1 ? 'منتج' : 'منتجات'}
            </Text>
          </View>
          <Pressable
            testID="clear-cart-button"
            onPress={clearCart}
            style={({ pressed }) => ({
              backgroundColor: pressed ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.1)',
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 7,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.2)',
            })}
          >
            <Text style={{ color: '#FF9900', fontSize: 13, fontWeight: '600' }}>مسح الكل</Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: insets.bottom + 20 }}
        renderItem={({ item }) => <CartItemRow item={item} />}
        ListFooterComponent={
          items.length > 0 ? (
            <View style={{
              marginHorizontal: 12,
              marginTop: 4,
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              padding: 16,
              borderWidth: 1,
              borderColor: '#E8E8E8',
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: '#565959', fontSize: 14 }}>عدد المنتجات:</Text>
                <Text style={{ color: '#0F1111', fontSize: 14, fontWeight: '600' }}>
                  {totalItems} قطعة
                </Text>
              </View>
              <Text style={{ color: '#999', fontSize: 11, marginTop: 8, lineHeight: 16 }}>
                الأسعار والتوافر يتحدد عند الشراء من الموقع الأصلي
              </Text>

              {/* Checkout via WhatsApp */}
              <Pressable
                testID="checkout-button"
                onPress={handleCheckout}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  backgroundColor: '#25D366',
                  borderRadius: 10,
                  paddingVertical: 14,
                  marginTop: 14,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <MessageCircle size={18} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700' }}>
                  اطلب الآن عبر واتساب
                </Text>
              </Pressable>
            </View>
          ) : null
        }
      />
    </View>
  );
}
