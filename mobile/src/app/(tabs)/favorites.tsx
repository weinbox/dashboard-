import { FlatList, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Heart, ShoppingBag } from 'lucide-react-native';
import { useAuth } from '@/lib/auth-context';
import { useFavorites } from '@/lib/favorites';
import { ProductCard, Product } from '@/components/ProductCard';

export default function FavoritesScreen() {
  const { user } = useAuth();
  const { favorites } = useFavorites();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const cardWidth = (width - 16) / 2;

  if (!user) {
    return (
      <View testID="favorites-screen" style={{ flex: 1, backgroundColor: '#EAEDED' }}>
        {/* Header */}
        <View style={{
          backgroundColor: '#131921',
          paddingTop: insets.top,
          paddingBottom: 14,
          paddingHorizontal: 16,
        }}>
          <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '800', letterSpacing: -0.3, marginTop: 10 }}>
            قائمة محفوظاتي
          </Text>
        </View>

        <View style={{
          flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80, paddingHorizontal: 32,
        }}>
          <View style={{
            width: 80, height: 80, borderRadius: 40,
            backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
            marginBottom: 20, borderWidth: 2, borderColor: '#E0E0E0',
            shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
          }}>
            <Heart size={36} color="#FF9900" strokeWidth={1.5} />
          </View>
          <Text style={{ color: '#0F1111', fontSize: 20, fontWeight: '700', marginBottom: 8, textAlign: 'center' }}>
            قائمة محفوظاتي
          </Text>
          <Text style={{ color: '#565959', fontSize: 14, textAlign: 'center', lineHeight: 21, marginBottom: 28 }}>
            سجّل دخولك لحفظ منتجاتك المفضلة ومتابعة العروض
          </Text>
          <Pressable
            testID="sign-in-button"
            onPress={() => router.push('/auth')}
            style={({ pressed }) => ({
              backgroundColor: '#FFD814',
              borderRadius: 8, paddingHorizontal: 40, paddingVertical: 14,
              borderWidth: 1, borderColor: '#FFA41C',
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text style={{ color: '#0F1111', fontSize: 15, fontWeight: '700' }}>تسجيل الدخول</Text>
          </Pressable>
          <Text style={{ color: '#565959', fontSize: 12, marginTop: 14, textAlign: 'center' }}>
            عميل جديد؟{' '}
            <Text
              style={{ color: '#007185', fontWeight: '600' }}
              onPress={() => router.push('/auth')}
            >
              ابدأ هنا
            </Text>
          </Text>
        </View>
      </View>
    );
  }

  if (favorites.length === 0) {
    return (
      <View testID="favorites-screen" style={{ flex: 1, backgroundColor: '#EAEDED' }}>
        <View style={{
          backgroundColor: '#131921',
          paddingTop: insets.top,
          paddingBottom: 14,
          paddingHorizontal: 16,
        }}>
          <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '800', letterSpacing: -0.3, marginTop: 10 }}>
            قائمة محفوظاتي
          </Text>
        </View>

        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80 }}>
          <ShoppingBag size={56} color="#CCCCCC" strokeWidth={1} style={{ marginBottom: 20 }} />
          <Text style={{ color: '#0F1111', fontSize: 18, fontWeight: '700', marginBottom: 8 }}>
            قائمتك فارغة
          </Text>
          <Text style={{ color: '#565959', fontSize: 13, textAlign: 'center', paddingHorizontal: 40, marginBottom: 24 }}>
            اضغط على القلب في أي منتج لإضافته إلى قائمة محفوظاتك
          </Text>
          <Pressable
            onPress={() => router.push('/')}
            style={({ pressed }) => ({
              backgroundColor: '#FFD814', borderRadius: 8,
              paddingHorizontal: 28, paddingVertical: 12,
              borderWidth: 1, borderColor: '#FFA41C',
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text style={{ color: '#0F1111', fontSize: 14, fontWeight: '700' }}>ابدأ التسوق</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const products: Product[] = favorites.map((f) => ({
    id: f.product_id,
    title: f.title,
    price: null,
    priceText: f.price_text,
    image: f.image,
    platform: f.platform as Product['platform'],
    url: f.url,
  }));

  return (
    <View testID="favorites-screen" style={{ flex: 1, backgroundColor: '#EAEDED' }}>
      {/* Amazon-style header */}
      <View style={{ backgroundColor: '#131921', paddingTop: insets.top }}>
        <View style={{
          paddingHorizontal: 16, paddingVertical: 14,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <View>
            <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '800', letterSpacing: -0.3 }}>
              قائمة محفوظاتي
            </Text>
            <Text style={{ color: '#FF9900', fontSize: 12, marginTop: 2 }}>
              {favorites.length} منتج محفوظ
            </Text>
          </View>
          <Heart size={22} color="#FF9900" fill="#FF9900" strokeWidth={1.5} />
        </View>
      </View>

      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={{ padding: 4, paddingBottom: insets.bottom + 20 }}
        columnWrapperStyle={{ gap: 0 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={{ width: cardWidth }}>
            <ProductCard product={item} />
          </View>
        )}
        ListHeaderComponent={
          <View style={{
            backgroundColor: '#FFFFFF', marginBottom: 4,
            paddingHorizontal: 14, paddingVertical: 10,
          }}>
            <Text style={{ color: '#565959', fontSize: 13 }}>
              {favorites.length} منتج في قائمتك
            </Text>
          </View>
        }
      />
    </View>
  );
}
