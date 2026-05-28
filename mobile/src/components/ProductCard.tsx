import { router } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { Heart, ShoppingCart, Star, Zap } from 'lucide-react-native';
import { useAuth } from '@/lib/auth-context';
import { useFavorites } from '@/lib/favorites';
import { useCartStore } from '@/lib/cart';

export interface ProductVariant {
  asin: string;
  title: string;
  url: string;
}

export interface Product {
  id: string;
  title: string;
  price: number | null;
  priceText: string;
  image: string | null;
  platform: 'ebay' | 'amazon' | 'walmart' | 'taobao' | '1688' | 'iherb';
  url: string;
  rating?: number;
  reviewCount?: number;
  seller?: string;
  sales?: number;
  repurchaseRate?: string;
  variants?: ProductVariant[];
}

const PLATFORM_CONFIG: Record<Product['platform'], { label: string; color: string; bg: string }> = {
  ebay:    { label: 'eBay',    color: '#ffffff', bg: '#E53238' },
  amazon:  { label: 'Amazon',  color: '#0F1111', bg: '#FF9900' },
  walmart: { label: 'Walmart', color: '#ffffff', bg: '#0071DC' },
  taobao:  { label: 'Taobao',  color: '#ffffff', bg: '#FF4400' },
  '1688':  { label: '1688',    color: '#ffffff', bg: '#E02020' },
  iherb:   { label: 'iHerb',   color: '#ffffff', bg: '#0F7D3B' },
};

function StarRating({ rating, count }: { rating: number; count?: number }) {
  const full = Math.floor(rating);
  const hasHalf = rating - full >= 0.5;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 4 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={11}
          color={i < full || (i === full && hasHalf) ? '#FF9900' : '#D0D0D0'}
          fill={i < full ? '#FF9900' : 'transparent'}
          strokeWidth={1.5}
        />
      ))}
      {count !== undefined && count > 0 ? (
        <Text style={{ color: '#007185', fontSize: 11, marginLeft: 2 }}>
          {count > 999 ? `${Math.floor(count / 1000)}k` : count}
        </Text>
      ) : null}
    </View>
  );
}

interface ProductCardProps {
  product: Product;
  style?: object;
}

export function ProductCard({ product, style }: ProductCardProps) {
  const platform = PLATFORM_CONFIG[product.platform];
  const [selectedVariantIndex, setSelectedVariantIndex] = useState<number>(0);
  const [imageError, setImageError] = useState<boolean>(false);
  const { user } = useAuth();
  const { isFavorite, addFav, removeFav } = useFavorites();

  const hasVariants = product.variants !== undefined && product.variants.length > 0;
  const MAX_CHIPS = 4;
  const visibleVariants = hasVariants ? product.variants!.slice(0, MAX_CHIPS) : [];
  const overflowCount = hasVariants ? Math.max(0, product.variants!.length - MAX_CHIPS) : 0;

  const favored = isFavorite(product.id);
  const addToCart = useCartStore((s) => s.addToCart);
  const cartItems = useCartStore((s) => s.items);
  const inCart = cartItems.some((i) => i.id === product.id);

  // Show deal badge for lower-priced items (heuristic)
  const isDeal = product.price !== null && product.price > 0 && product.price < 50;

  const handlePress = () => {
    const selectedVariant = hasVariants ? product.variants![selectedVariantIndex] : undefined;
    const productToNavigate = selectedVariant
      ? { ...product, id: `amazon-${selectedVariant.asin}`, url: selectedVariant.url }
      : product;
    router.push({ pathname: '/product', params: { data: JSON.stringify(productToNavigate) } });
  };

  const handleVariantPress = (index: number) => {
    const v = product.variants![index];
    router.push({
      pathname: '/product',
      params: {
        data: JSON.stringify({ ...product, id: `amazon-${v.asin}`, url: v.url }),
      },
    });
  };

  const handleFavoritePress = () => {
    if (!user) { router.push('/auth'); return; }
    if (favored) { removeFav.mutate(product.id); }
    else { addFav.mutate(product); }
  };

  const handleAddToCart = () => {
    addToCart({
      id: product.id,
      title: product.title,
      price: product.price,
      priceText: product.priceText,
      image: product.image,
      platform: product.platform,
      url: product.url,
    });
  };

  return (
    <Pressable
      testID="product-card"
      onPress={handlePress}
      style={({ pressed }) => [
        {
          flex: 1,
          backgroundColor: '#FFFFFF',
          overflow: 'hidden',
          margin: 4,
          borderRadius: 4,
          borderWidth: 1,
          borderColor: '#E0E0E0',
          shadowColor: '#000',
          shadowOpacity: 0.06,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 2 },
          elevation: 2,
          opacity: pressed ? 0.9 : 1,
        },
        style,
      ]}
    >
      {/* Image area */}
      <View style={{ height: 170, backgroundColor: '#F7F7F7', position: 'relative' }}>
        {product.image && !imageError ? (
          <Image
            source={{ uri: product.image }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="contain"
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 36 }}>🛍</Text>
          </View>
        )}

        {/* Deal badge */}
        {isDeal ? (
          <View style={{
            position: 'absolute', top: 8, left: 8,
            backgroundColor: '#CC0C39',
            borderRadius: 3, paddingHorizontal: 6, paddingVertical: 3,
            flexDirection: 'row', alignItems: 'center', gap: 3,
          }}>
            <Zap size={9} color="#fff" fill="#fff" strokeWidth={0} />
            <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '700' }}>عرض</Text>
          </View>
        ) : null}

        {/* Platform badge */}
        <View style={{
          position: 'absolute', bottom: 8, left: 8,
          backgroundColor: platform.bg,
          borderRadius: 3, paddingHorizontal: 6, paddingVertical: 2,
        }}>
          <Text style={{ color: platform.color, fontSize: 10, fontWeight: '700' }}>
            {platform.label}
          </Text>
        </View>

        {/* Favorite button */}
        <Pressable
          testID="favorite-button"
          onPress={handleFavoritePress}
          style={{
            position: 'absolute', top: 8, right: 8,
            width: 30, height: 30, borderRadius: 15,
            backgroundColor: 'rgba(255,255,255,0.9)',
            alignItems: 'center', justifyContent: 'center',
            borderWidth: 1, borderColor: '#E0E0E0',
          }}
        >
          <Heart
            size={14}
            color={favored ? '#CC0C39' : '#999999'}
            fill={favored ? '#CC0C39' : 'transparent'}
            strokeWidth={2}
          />
        </Pressable>
      </View>

      {/* Content */}
      <View style={{ padding: 10 }}>
        {/* Prime badge for Amazon */}
        {product.platform === 'amazon' ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
            <View style={{
              backgroundColor: '#007185', borderRadius: 2,
              paddingHorizontal: 5, paddingVertical: 1,
            }}>
              <Text style={{ color: '#FFF', fontSize: 9, fontWeight: '700', letterSpacing: 0.3 }}>
                prime
              </Text>
            </View>
            <Text style={{ color: '#007185', fontSize: 10 }}>شحن مجاني</Text>
          </View>
        ) : null}

        <Text
          numberOfLines={2}
          style={{ color: '#0F1111', fontSize: 12, lineHeight: 17, fontWeight: '400' }}
        >
          {product.title}
        </Text>

        {/* Rating */}
        {product.rating !== undefined && product.rating > 0 ? (
          <StarRating rating={product.rating} count={product.reviewCount} />
        ) : null}

        {/* Price */}
        <View style={{ marginTop: 6, flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
          {product.priceText ? (
            <>
              <Text style={{ color: '#B12704', fontSize: 16, fontWeight: '700' }}>
                {product.priceText}
              </Text>
            </>
          ) : (
            <Text style={{ color: '#007185', fontSize: 13 }}>عرض السعر</Text>
          )}
        </View>

        {/* Color variant chips */}
        {hasVariants ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0, marginTop: 8 }}
            contentContainerStyle={{ gap: 4, paddingRight: 2 }}
          >
            {visibleVariants.map((variant, index) => {
              const isSelected = index === selectedVariantIndex;
              return (
                <Pressable
                  key={variant.asin}
                  testID={`variant-chip-${index}`}
                  onPress={() => {
                    setSelectedVariantIndex(index);
                    handleVariantPress(index);
                  }}
                  style={{
                    height: 24, paddingHorizontal: 8, borderRadius: 3,
                    backgroundColor: isSelected ? '#232F3E' : '#F3F3F3',
                    borderWidth: 1,
                    borderColor: isSelected ? '#FF9900' : '#DDDDDD',
                    justifyContent: 'center', alignItems: 'center',
                  }}
                >
                  <Text style={{
                    fontSize: 10,
                    fontWeight: isSelected ? '600' : '400',
                    color: isSelected ? '#FF9900' : '#555555',
                  }} numberOfLines={1}>
                    {variant.title}
                  </Text>
                </Pressable>
              );
            })}
            {overflowCount > 0 ? (
              <View style={{
                height: 24, paddingHorizontal: 8, borderRadius: 3,
                backgroundColor: '#F3F3F3', borderWidth: 1, borderColor: '#DDDDDD',
                justifyContent: 'center', alignItems: 'center',
              }}>
                <Text style={{ fontSize: 10, color: '#565959' }}>+{overflowCount}</Text>
              </View>
            ) : null}
          </ScrollView>
        ) : null}

        {/* View product button */}
        <Pressable
          onPress={handlePress}
          style={({ pressed }) => ({
            marginTop: 10, backgroundColor: '#FFD814',
            borderRadius: 4, paddingVertical: 7,
            alignItems: 'center',
            borderWidth: 1, borderColor: '#FFA41C',
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Text style={{ color: '#0F1111', fontSize: 12, fontWeight: '600' }}>
            عرض المنتج
          </Text>
        </Pressable>

        {/* Add to cart button */}
        <Pressable
          testID="add-to-cart-button"
          onPress={handleAddToCart}
          style={({ pressed }) => ({
            marginTop: 6,
            backgroundColor: inCart ? '#E8F5E9' : '#1A8C4E',
            borderRadius: 4,
            paddingVertical: 7,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 5,
            borderWidth: 1,
            borderColor: inCart ? '#66BB6A' : '#146B3C',
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <ShoppingCart
            size={13}
            color={inCart ? '#2E7D32' : '#FFFFFF'}
            fill={inCart ? '#2E7D32' : 'transparent'}
            strokeWidth={2}
          />
          <Text style={{
            color: inCart ? '#2E7D32' : '#FFFFFF',
            fontSize: 12,
            fontWeight: '600',
          }}>
            {inCart ? 'في السلة' : 'أضف للسلة'}
          </Text>
        </Pressable>
      </View>
    </Pressable>
  );
}
