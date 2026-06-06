import { useLocalSearchParams, router } from 'expo-router';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { ArrowLeft, CheckCircle, ExternalLink, Heart, ShoppingCart, Star } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useRef, useCallback } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import type { Product } from '@/components/ProductCard';
import { useAuth } from '@/lib/auth-context';
import { useFavorites } from '@/lib/favorites';
import { useCartStore } from '@/lib/cart';
import { VoiceAssistant } from '@/components/VoiceAssistant';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Simulated progress hook ────────────────────────────────────────────────
function useSimulatedProgress(isActive: boolean, isDone: boolean) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (isDone) {
      progress.value = withTiming(100, { duration: 300, easing: Easing.out(Easing.ease) });
    } else if (isActive) {
      progress.value = 0;
      // Fast to 30%, then slow to 70%, then very slow to 90%
      progress.value = withSequence(
        withTiming(30, { duration: 800, easing: Easing.out(Easing.ease) }),
        withTiming(60, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(85, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
        withTiming(92, { duration: 6000, easing: Easing.inOut(Easing.ease) })
      );
    } else {
      progress.value = 0;
    }
  }, [isActive, isDone]);

  return progress;
}

// ─── Top progress bar ──────────────────────────────────────────────────────
function TopProgressBar({ progress, color = '#E52222' }: { progress: Animated.SharedValue<number>; color?: string }) {
  const barStyle = useAnimatedStyle(() => ({
    width: `${progress.value}%`,
    opacity: progress.value >= 100 ? withTiming(0, { duration: 500 }) : 1,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: progress.value >= 100 ? 0 : interpolate(progress.value, [0, 50, 100], [0.3, 0.8, 0.3]),
  }));

  return (
    <View style={{ height: 3, backgroundColor: '#f0f0f0', overflow: 'hidden' }}>
      <Animated.View style={[{ height: '100%', backgroundColor: color, borderRadius: 3 }, barStyle]}>
        <Animated.View style={[{
          position: 'absolute', right: 0, top: 0, bottom: 0, width: 40,
          backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: 3,
        }, glowStyle]} />
      </Animated.View>
    </View>
  );
}

// ─── Loading overlay for translate ─────────────────────────────────────────
function TranslateProgressOverlay({ isActive }: { isActive: boolean }) {
  const rotation = useSharedValue(0);
  const progress = useSimulatedProgress(isActive, false);

  useEffect(() => {
    if (isActive) {
      rotation.value = withRepeat(
        withTiming(360, { duration: 1000, easing: Easing.linear }),
        -1, false
      );
    } else {
      rotation.value = 0;
    }
  }, [isActive]);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const progressText = useAnimatedStyle(() => ({
    opacity: 1,
  }));

  if (!isActive) return null;

  return (
    <View style={{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center',
      zIndex: 999, borderRadius: 0,
    }}>
      <View style={{
        backgroundColor: '#fff', borderRadius: 20, padding: 28,
        alignItems: 'center', gap: 16, minWidth: 180,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
      }}>
        <Animated.View style={spinStyle}>
          <Text style={{ fontSize: 32 }}>{'🔄'}</Text>
        </Animated.View>
        <Text style={{ color: '#1a1a1a', fontSize: 15, fontWeight: '700' }}>جاري الترجمة...</Text>
        <View style={{
          width: 140, height: 6, backgroundColor: '#f0f0f0',
          borderRadius: 3, overflow: 'hidden',
        }}>
          <TopProgressBar progress={progress} color="#E52222" />
        </View>
      </View>
    </View>
  );
}

interface VariantItem {
  asin: string;
  name: string;
  image?: string;
  selected: boolean;
}

interface VariantGroup {
  title: string;
  items: VariantItem[];
}

interface ProductDetail {
  title: string;
  price: string;
  images: string[];
  rating: number | null;
  reviewCount: number | null;
  availability: string | null;
  brand: string | null;
  aboutItem: string[];
  specifications: { name: string; value: string }[];
  badges: string[];
  description: string | null;
  variantGroups: VariantGroup[];
}

const PLATFORM_CONFIG: Record<
  Product['platform'],
  { label: string; color: string; bg: string; ctaLabel: string }
> = {
  ebay: { label: 'eBay', color: '#ffffff', bg: '#E53238', ctaLabel: 'اعرض على eBay' },
  amazon: { label: 'Amazon', color: '#000000', bg: '#FF9900', ctaLabel: 'اعرض على Amazon' },
  walmart: { label: 'Walmart', color: '#ffffff', bg: '#0071DC', ctaLabel: 'اعرض على Walmart' },
  taobao: { label: 'Taobao', color: '#ffffff', bg: '#FF4400', ctaLabel: 'اعرض على Taobao' },
  '1688': { label: '1688', color: '#ffffff', bg: '#E02020', ctaLabel: 'اعرض على 1688' },
  iherb: { label: 'iHerb', color: '#ffffff', bg: '#0F7D3B', ctaLabel: 'عرض على iHerb' },
};

// ─── Skeleton shimmer block ───────────────────────────────────────────────────
function SkeletonBlock({ width, height, style }: { width?: number | string; height: number; style?: object }) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 700, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        {
          width: width ?? '100%',
          height,
          backgroundColor: '#e8e8e8',
          borderRadius: 8,
        },
        style,
        animStyle,
      ]}
    />
  );
}

function SkeletonContent({ progress }: { progress: Animated.SharedValue<number> }) {
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 0, gap: 12 }}>
      {/* Progress bar */}
      <TopProgressBar progress={progress} />
      {/* Loading status */}
      <View style={{ alignItems: 'center', paddingVertical: 8 }}>
        <Text style={{ color: '#999', fontSize: 13, fontWeight: '600' }}>جاري تحميل تفاصيل المنتج...</Text>
      </View>
      {/* badges row */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <SkeletonBlock width={90} height={26} />
        <SkeletonBlock width={70} height={26} />
      </View>
      {/* title */}
      <SkeletonBlock height={20} />
      <SkeletonBlock width="80%" height={20} />
      {/* price */}
      <SkeletonBlock width={120} height={32} style={{ marginTop: 4 }} />
      {/* rating */}
      <SkeletonBlock width={160} height={18} />
      {/* divider */}
      <View style={{ height: 1, backgroundColor: '#e8e8e8', marginVertical: 8 }} />
      {/* about */}
      <SkeletonBlock width={140} height={18} />
      <SkeletonBlock height={14} />
      <SkeletonBlock height={14} />
      <SkeletonBlock width="90%" height={14} />
      {/* specs */}
      <View style={{ height: 1, backgroundColor: '#e8e8e8', marginVertical: 8 }} />
      <SkeletonBlock width={120} height={18} />
      {[1, 2, 3, 4].map((n) => (
        <View key={n} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <SkeletonBlock width="40%" height={14} />
          <SkeletonBlock width="40%" height={14} />
        </View>
      ))}
    </View>
  );
}

// ─── Star rating ──────────────────────────────────────────────────────────────
function StarRating({ rating, count }: { rating: number; count?: number | null }) {
  const full = Math.floor(rating);
  const hasHalf = rating - full >= 0.5;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 6 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={16}
          color={i < full || (i === full && hasHalf) ? '#F5C518' : '#e0e0e0'}
          fill={i < full ? '#F5C518' : 'transparent'}
          strokeWidth={1.5}
        />
      ))}
      {count != null && count > 0 ? (
        <Text style={{ color: '#666666', fontSize: 13, marginLeft: 4 }}>
          ({count > 999 ? `${(count / 1000).toFixed(1)}k` : count} تقييم)
        </Text>
      ) : null}
    </View>
  );
}

// ─── Image gallery ────────────────────────────────────────────────────────────
function ImageGallery({
  images,
  fallback,
  activeIndex,
  onIndexChange,
}: {
  images: string[];
  fallback: string | null;
  activeIndex: number;
  onIndexChange: (i: number) => void;
}) {
  const [fallbackError, setFallbackError] = useState<boolean>(false);
  const [itemErrors, setItemErrors] = useState<Record<number, boolean>>({});

  if (images.length > 0) {
    return (
      <FlatList
        data={images}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
          onIndexChange(idx);
        }}
        renderItem={({ item, index }) =>
          itemErrors[index] ? (
            <View
              style={{
                width: SCREEN_WIDTH,
                height: 300,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f0f0f0',
              }}
            >
              <Text style={{ fontSize: 64 }}>{'🛍'}</Text>
            </View>
          ) : (
            <Image
              source={{ uri: item }}
              style={{ width: SCREEN_WIDTH, height: 300 }}
              resizeMode="contain"
              onError={() => setItemErrors((prev) => ({ ...prev, [index]: true }))}
            />
          )
        }
        style={{ backgroundColor: '#FFFFFF' }}
        testID="image-gallery"
      />
    );
  }
  if (fallback && !fallbackError) {
    return (
      <Image
        source={{ uri: fallback }}
        style={{ width: SCREEN_WIDTH, height: 300 }}
        resizeMode="cover"
        testID="product-hero-image"
        onError={() => setFallbackError(true)}
      />
    );
  }
  return (
    <View
      style={{
        width: SCREEN_WIDTH,
        height: 300,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f0f0f0',
      }}
    >
      <Text style={{ fontSize: 64 }}>{'🛍'}</Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function ProductScreen() {
  const { data } = useLocalSearchParams<{ data: string }>();
  const product: Product = JSON.parse(data);
  const platform = PLATFORM_CONFIG[product.platform];

  const { user } = useAuth();
  const { isFavorite, addFav, removeFav } = useFavorites();

  const addToCart = useCartStore((s) => s.addToCart);
  const cartItems = useCartStore((s) => s.items);
  const inCart = cartItems.some((i) => i.id === product.id);
  const [cartAdded, setCartAdded] = useState<boolean>(false);

  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [isTranslated, setIsTranslated] = useState<boolean>(false);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [translatedDetail, setTranslatedDetail] = useState<Partial<ProductDetail> | null>(null);
  const [autoTranslatedTitle, setAutoTranslatedTitle] = useState<string | null>(null);
  const [isAutoTranslating, setIsAutoTranslating] = useState<boolean>(false);

  const strippedId = product.id.replace(/^(amazon|walmart|ebay|taobao|1688|temu|iherb)-/, '');
  const baseUrl = process.env.EXPO_PUBLIC_BACKEND_URL!;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
  const supportsDetailApi = ['amazon', 'walmart', 'iherb', 'ebay'].includes(product.platform);

  const { data: detail, isLoading } = useQuery<ProductDetail>({
    queryKey: ['product-detail', product.platform, strippedId, baseUrl],
    queryFn: async () => {
      let apiUrl: string;
      if (product.platform === 'iherb') {
        apiUrl = `${baseUrl}/product?platform=iherb&id=${encodeURIComponent(strippedId)}&url=${encodeURIComponent(product.url)}&title=${encodeURIComponent(product.title)}&price=${encodeURIComponent(product.priceText ?? '')}`;
      } else {
        apiUrl = `${baseUrl}/product?platform=${product.platform}&id=${encodeURIComponent(strippedId)}`;
      }
      const res = await fetch(apiUrl, {
        headers: { "Authorization": `Bearer ${anonKey}`, "apikey": anonKey },
      });
      if (!res.ok) throw new Error('Failed to fetch product detail');
      const json = await res.json() as { data: { detail: ProductDetail } };
      return json.data.detail;
    },
    enabled: supportsDetailApi,
    staleTime: 5 * 60 * 1000,
  });

  const isChinesePlatform = product.platform === '1688' || product.platform === 'taobao';
  const detailLoading = isLoading && supportsDetailApi;
  const detailDone = !!detail && !isLoading;
  const loadingProgress = useSimulatedProgress(detailLoading, detailDone);

  const contentOpacity = useSharedValue(0);

  useEffect(() => {
    if (!supportsDetailApi || (!isLoading && detail)) {
      contentOpacity.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) });
    }
  }, [isLoading, detail, supportsDetailApi]);

  useEffect(() => {
    if (!isChinesePlatform || !product.title) return;
    setIsAutoTranslating(true);
    fetch(`${baseUrl}/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: product.title }),
    })
      .then((res) => res.json())
      .then((json: { data?: { translated?: { title?: string } } }) => {
        const t = json?.data?.translated?.title;
        if (t) setAutoTranslatedTitle(t);
      })
      .catch(() => {})
      .finally(() => setIsAutoTranslating(false));
  }, []);

  const contentStyle = useAnimatedStyle(() => ({ opacity: contentOpacity.value }));

  const displayImages = detail?.images && detail.images.length > 0 ? detail.images : [];
  const displayRating = detail?.rating ?? product.rating ?? null;
  const displayReviewCount = detail?.reviewCount ?? product.reviewCount ?? null;
  const displayDetail = isTranslated && translatedDetail
    ? { ...detail, ...translatedDetail } as ProductDetail
    : detail;

  const handleTranslate = async () => {
    if (isTranslated) {
      setIsTranslated(false);
      return;
    }
    if (translatedDetail) {
      setIsTranslated(true);
      return;
    }
    if (!detail) return;

    setIsTranslating(true);
    try {
      const res = await fetch(`${baseUrl}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', "Authorization": `Bearer ${anonKey}`, "apikey": anonKey },
        body: JSON.stringify({
          title: detail.title,
          aboutItem: detail.aboutItem,
          specifications: detail.specifications,
          description: detail.description,
          badges: detail.badges,
        }),
      });
      if (!res.ok) throw new Error('Translation failed');
      const json = await res.json() as { data: { translated: Partial<ProductDetail> } };
      setTranslatedDetail(json.data.translated);
      setIsTranslated(true);
    } catch (e) {
      // silently fail — just show original
    } finally {
      setIsTranslating(false);
    }
  };

  const handleAddToCart = () => {
    if (detailLoading) return;
    const selectedVariant = detail?.variantGroups?.[0]?.items?.find((i) => i.selected);
    addToCart({
      id: product.id,
      title: product.title,
      price: product.price,
      priceText: detail?.price || product.priceText,
      image: product.image,
      platform: product.platform,
      url: product.url,
      variantTitle: selectedVariant?.name,
    });
    setCartAdded(true);
    setTimeout(() => setCartAdded(false), 2000);
  };

  const handleOpenInBrowser = async () => {
    if (!product.url) return;
    if (product.platform === 'iherb') {
      await WebBrowser.openBrowserAsync(product.url, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
      });
    } else {
      WebBrowser.openBrowserAsync(product.url);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} testID="product-detail-screen">
      {/* Translate overlay */}
      <TranslateProgressOverlay isActive={isTranslating} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 200 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero image area ── */}
        <View style={{ height: 300, position: 'relative' }}>
          <ImageGallery
            images={displayImages}
            fallback={product.image}
            activeIndex={activeImageIndex}
            onIndexChange={setActiveImageIndex}
          />

          {/* Bottom gradient */}
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.9)']}
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 100,
            }}
          />

          {/* Button overlay — box-none lets FlatList scroll while children still receive taps */}
          <View
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 }}
            pointerEvents="box-none"
          >
            {/* Back button */}
            <Pressable
              testID="back-button"
              onPress={() => router.back()}
              style={{
                position: 'absolute',
                top: 16,
                left: 16,
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: 'rgba(0,0,0,0.6)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ArrowLeft size={20} color="#ffffff" strokeWidth={2.5} />
            </Pressable>

            {/* Heart / favorite button */}
            <Pressable
              testID="detail-favorite-button"
              onPress={() => {
                if (!user) {
                  router.push('/auth');
                  return;
                }
                if (isFavorite(product.id)) {
                  removeFav.mutate(product.id);
                } else {
                  addFav.mutate(product);
                }
              }}
              style={({ pressed }) => ({
                position: 'absolute',
                top: 16,
                right: 64,
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: 'rgba(0,0,0,0.6)',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Heart
                size={18}
                color={isFavorite(product.id) ? '#f87171' : '#ffffff'}
                fill={isFavorite(product.id) ? '#f87171' : 'transparent'}
                strokeWidth={2}
              />
            </Pressable>

            {/* Translate button */}
            <Pressable
              testID="translate-button"
              onPress={handleTranslate}
              style={({ pressed }) => ({
                position: 'absolute',
                top: 16,
                right: 16,
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: isTranslated ? 'rgba(229,34,34,0.9)' : 'rgba(0,0,0,0.6)',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.8 : 1,
              })}
            >
              {isTranslating ? (
                <ActivityIndicator size="small" color={isTranslated ? '#ffffff' : '#ffffff'} />
              ) : (
                <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '800' }}>
                  {'ع'}
                </Text>
              )}
            </Pressable>
          </View>

          {/* Platform badge */}
          <View
            style={{
              position: 'absolute',
              bottom: 14,
              left: 16,
              backgroundColor: platform.bg,
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 5,
            }}
          >
            <Text
              style={{
                color: platform.color,
                fontSize: 12,
                fontWeight: '800',
                letterSpacing: 0.4,
              }}
            >
              {platform.label}
            </Text>
          </View>

          {/* Dot indicators */}
          {displayImages.length > 1 ? (
            <View
              style={{
                position: 'absolute',
                bottom: 14,
                right: 16,
                flexDirection: 'row',
                gap: 5,
                alignItems: 'center',
              }}
            >
              {displayImages.map((_, i) => (
                <View
                  key={i}
                  style={{
                    width: i === activeImageIndex ? 8 : 5,
                    height: i === activeImageIndex ? 8 : 5,
                    borderRadius: 4,
                    backgroundColor: i === activeImageIndex ? '#ffffff' : 'rgba(255,255,255,0.4)',
                  }}
                />
              ))}
            </View>
          ) : null}
        </View>

        {/* ── Content ── */}
        {isLoading && supportsDetailApi ? (
          <SkeletonContent progress={loadingProgress} />
        ) : (
          <Animated.View style={[{ paddingHorizontal: 16, paddingTop: 20 }, contentStyle]}>
            {/* Badges */}
            {displayDetail?.badges && displayDetail.badges.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ flexGrow: 0, marginBottom: 12 }}
                contentContainerStyle={{ gap: 8 }}
              >
                {displayDetail.badges.map((badge, i) => (
                  <View
                    key={i}
                    style={{
                      backgroundColor: 'rgba(234,179,8,0.15)',
                      borderWidth: 1,
                      borderColor: 'rgba(234,179,8,0.4)',
                      borderRadius: 20,
                      paddingHorizontal: 12,
                      paddingVertical: 5,
                    }}
                  >
                    <Text style={{ color: '#eab308', fontSize: 12, fontWeight: '700' }}>
                      {badge}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            ) : null}

            {/* Title */}
            <Text
              style={{
                color: '#1a1a1a',
                fontSize: 18,
                fontWeight: '700',
                lineHeight: 26,
              }}
            >
              {autoTranslatedTitle || displayDetail?.title || product.title}
            </Text>
            {isAutoTranslating ? (
              <Text style={{ color: '#999', fontSize: 12, marginTop: 4 }}>جاري الترجمة...</Text>
            ) : autoTranslatedTitle ? (
              <Text style={{ color: '#aaa', fontSize: 12, marginTop: 4 }} numberOfLines={2}>
                {product.title}
              </Text>
            ) : null}

            {/* Price */}
            <Text
              style={{
                color: '#E52222',
                fontSize: 26,
                fontWeight: '800',
                letterSpacing: -0.5,
                marginTop: 10,
              }}
            >
              {detail?.price || product.priceText || 'See price'}
            </Text>

            {/* Rating */}
            {displayRating != null && displayRating > 0 ? (
              <StarRating rating={displayRating} count={displayReviewCount} />
            ) : null}

            {/* Availability */}
            {detail?.availability != null ? (
              <Text
                style={{
                  color: detail.availability.toLowerCase().includes('unavail') ||
                    detail.availability.toLowerCase().includes('out of')
                    ? '#f87171'
                    : '#E52222',
                  fontSize: 13,
                  fontWeight: '600',
                  marginTop: 8,
                }}
              >
                {detail.availability}
              </Text>
            ) : null}

            {/* Brand */}
            {detail?.brand != null ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                <Text style={{ color: '#666666', fontSize: 13 }}>الماركة:</Text>
                <Text style={{ color: '#1a1a1a', fontSize: 13, fontWeight: '600' }}>
                  {detail.brand}
                </Text>
              </View>
            ) : null}

            {/* Taobao / 1688 specific stats */}
            {(product.platform === 'taobao' || product.platform === '1688') ? (
              <View style={{ marginTop: 14, gap: 10 }}>
                {product.seller ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{
                      backgroundColor: '#fff3e0', borderRadius: 6,
                      paddingHorizontal: 8, paddingVertical: 3,
                    }}>
                      <Text style={{ color: '#e65100', fontSize: 11, fontWeight: '700' }}>
                        {product.platform === '1688' ? 'المورد' : 'البائع'}
                      </Text>
                    </View>
                    <Text style={{ color: '#1a1a1a', fontSize: 14, fontWeight: '600', flex: 1 }}
                      numberOfLines={1}>
                      {product.seller}
                    </Text>
                  </View>
                ) : null}
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  {product.sales != null && product.sales > 0 ? (
                    <View style={{
                      flex: 1, backgroundColor: '#f5f5f5', borderRadius: 10,
                      paddingHorizontal: 12, paddingVertical: 10, alignItems: 'center',
                    }}>
                      <Text style={{ color: '#E52222', fontSize: 18, fontWeight: '800' }}>
                        {product.sales > 9999
                          ? `${(product.sales / 10000).toFixed(1)}万`
                          : product.sales.toLocaleString()}
                      </Text>
                      <Text style={{ color: '#999', fontSize: 11, marginTop: 2 }}>مبيعات</Text>
                    </View>
                  ) : null}
                  {product.repurchaseRate ? (
                    <View style={{
                      flex: 1, backgroundColor: '#f5f5f5', borderRadius: 10,
                      paddingHorizontal: 12, paddingVertical: 10, alignItems: 'center',
                    }}>
                      <Text style={{ color: '#16a34a', fontSize: 18, fontWeight: '800' }}>
                        {product.repurchaseRate}
                      </Text>
                      <Text style={{ color: '#999', fontSize: 11, marginTop: 2 }}>معدل إعادة الشراء</Text>
                    </View>
                  ) : null}
                </View>
                {product.platform === '1688' ? (
                  <View style={{
                    backgroundColor: '#fff8e1', borderRadius: 10,
                    paddingHorizontal: 12, paddingVertical: 8,
                    flexDirection: 'row', alignItems: 'center', gap: 6,
                  }}>
                    <Text style={{ fontSize: 14 }}>{'🏭'}</Text>
                    <Text style={{ color: '#92400e', fontSize: 12, fontWeight: '500', flex: 1 }}>
                      منتج جملة من 1688 · السعر بالدينار العراقي
                    </Text>
                  </View>
                ) : (
                  <View style={{
                    backgroundColor: '#fef2f2', borderRadius: 10,
                    paddingHorizontal: 12, paddingVertical: 8,
                    flexDirection: 'row', alignItems: 'center', gap: 6,
                  }}>
                    <Text style={{ fontSize: 14 }}>{'🛍'}</Text>
                    <Text style={{ color: '#991b1b', fontSize: 12, fontWeight: '500', flex: 1 }}>
                      منتج من Taobao · السعر بالدينار العراقي
                    </Text>
                  </View>
                )}
              </View>
            ) : null}

            {/* Variant groups (Size + Color) */}
            {detail?.variantGroups && detail.variantGroups.length > 0 ? (
              <View style={{ marginTop: 16 }}>
                {detail.variantGroups.map((group) => (
                  <View key={group.title} style={{ marginBottom: 16 }}>
                    <Text style={{ color: '#1a1a1a', fontSize: 14, fontWeight: '700', marginBottom: 10 }}>
                      {group.title === 'Size' ? 'الحجم' : group.title === 'Color' ? 'اللون' : group.title}
                    </Text>

                    {/* Size group → text chips */}
                    {group.title === 'Size' ? (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={{ flexGrow: 0 }}
                        contentContainerStyle={{ gap: 8 }}
                      >
                        {group.items.map((item) => (
                          <Pressable
                            key={item.asin}
                            onPress={() => {
                              router.replace({
                                pathname: '/product',
                                params: {
                                  data: JSON.stringify({
                                    ...product,
                                    id: `amazon-${item.asin}`,
                                  }),
                                },
                              });
                            }}
                            style={({ pressed }) => ({
                              paddingHorizontal: 16,
                              paddingVertical: 9,
                              borderRadius: 10,
                              backgroundColor: item.selected ? '#E52222' : '#f5f5f5',
                              borderWidth: item.selected ? 2 : 1,
                              borderColor: item.selected ? '#E52222' : '#e0e0e0',
                              opacity: pressed ? 0.7 : 1,
                            })}
                          >
                            <Text style={{
                              color: item.selected ? '#ffffff' : '#1a1a1a',
                              fontSize: 13,
                              fontWeight: item.selected ? '700' : '500',
                            }}>
                              {item.name}
                            </Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                    ) : (
                      /* Color group → image swatches grid */
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        {group.items.map((item) => (
                          <Pressable
                            key={item.asin}
                            onPress={() => {
                              router.replace({
                                pathname: '/product',
                                params: {
                                  data: JSON.stringify({
                                    ...product,
                                    id: `amazon-${item.asin}`,
                                  }),
                                },
                              });
                            }}
                            style={({ pressed }) => ({
                              width: 52,
                              height: 52,
                              borderRadius: 10,
                              overflow: 'hidden',
                              borderWidth: item.selected ? 2.5 : 1,
                              borderColor: item.selected ? '#E52222' : '#e8e8e8',
                              opacity: pressed ? 0.7 : 1,
                              backgroundColor: '#f5f5f5',
                            })}
                          >
                            {item.image ? (
                              <Image
                                source={{ uri: item.image }}
                                style={{ width: '100%', height: '100%' }}
                                resizeMode="cover"
                              />
                            ) : (
                              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ color: '#666', fontSize: 10 }} numberOfLines={2}>
                                  {item.name}
                                </Text>
                              </View>
                            )}
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </View>
                ))}
              </View>
            ) : null}

            {/* Divider */}
            <View style={{ height: 1, backgroundColor: '#e8e8e8', marginVertical: 20 }} />

            {/* About this item */}
            {displayDetail?.aboutItem && displayDetail.aboutItem.length > 0 ? (
              <View style={{ marginBottom: 20 }}>
                <Text
                  style={{
                    color: '#1a1a1a',
                    fontSize: 16,
                    fontWeight: '700',
                    marginBottom: 12,
                  }}
                >
                  عن هذا المنتج
                </Text>
                <View style={{ gap: 10 }}>
                  {displayDetail.aboutItem.map((item, i) => (
                    <View key={i} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                      <Text style={{ color: '#666666', fontSize: 14, marginTop: 1 }}>{'•'}</Text>
                      <Text
                        style={{
                          color: '#1a1a1a',
                          fontSize: 14,
                          lineHeight: 21,
                          flex: 1,
                        }}
                      >
                        {item}
                      </Text>
                    </View>
                  ))}
                </View>
                <View style={{ height: 1, backgroundColor: '#e8e8e8', marginTop: 20 }} />
              </View>
            ) : null}

            {/* Specifications */}
            {displayDetail?.specifications && displayDetail.specifications.length > 0 ? (
              <View style={{ marginBottom: 20 }}>
                <Text
                  style={{
                    color: '#1a1a1a',
                    fontSize: 16,
                    fontWeight: '700',
                    marginBottom: 12,
                  }}
                >
                  المواصفات
                </Text>
                <View style={{ borderRadius: 10, overflow: 'hidden' }}>
                  {displayDetail.specifications.slice(0, 10).map((spec, i) => (
                    <View
                      key={i}
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        backgroundColor: i % 2 === 0 ? '#f9f9f9' : '#FFFFFF',
                      }}
                    >
                      <Text
                        style={{
                          color: '#666666',
                          fontSize: 13,
                          flex: 1,
                          marginRight: 12,
                        }}
                      >
                        {spec.name}
                      </Text>
                      <Text
                        style={{
                          color: '#1a1a1a',
                          fontSize: 13,
                          fontWeight: '600',
                          flex: 1,
                          textAlign: 'right',
                        }}
                      >
                        {spec.value}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Description (eBay fallback or extra) */}
            {displayDetail?.description != null && displayDetail.description.trim().length > 0 ? (
              <View style={{ marginBottom: 20 }}>
                <Text
                  style={{
                    color: '#1a1a1a',
                    fontSize: 16,
                    fontWeight: '700',
                    marginBottom: 10,
                  }}
                >
                  الوصف
                </Text>
                <Text style={{ color: '#666666', fontSize: 14, lineHeight: 22 }}>
                  {displayDetail.description}
                </Text>
              </View>
            ) : null}
          </Animated.View>
        )}
      </ScrollView>

      {/* ── Fixed bottom CTA ── */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          paddingHorizontal: 16,
          paddingBottom: 34,
          paddingTop: 12,
          backgroundColor: 'rgba(255,255,255,0.97)',
          borderTopWidth: 1,
          borderTopColor: '#e8e8e8',
          gap: 10,
        }}
      >
        {/* Add to cart button */}
        <Pressable
          testID="detail-add-to-cart-button"
          onPress={handleAddToCart}
          disabled={detailLoading}
          style={({ pressed }) => ({
            backgroundColor: detailLoading ? '#BDBDBD' : cartAdded || inCart ? '#E8F5E9' : '#1A8C4E',
            borderRadius: 14,
            paddingVertical: 14,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            borderWidth: 1,
            borderColor: detailLoading ? '#9E9E9E' : cartAdded || inCart ? '#66BB6A' : '#146B3C',
            opacity: pressed ? 0.85 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          })}
        >
          {detailLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : cartAdded ? (
            <CheckCircle size={18} color="#2E7D32" strokeWidth={2.5} />
          ) : (
            <ShoppingCart
              size={18}
              color={inCart ? '#2E7D32' : '#FFFFFF'}
              fill={inCart ? '#2E7D32' : 'transparent'}
              strokeWidth={2.5}
            />
          )}
          <Text
            style={{
              color: detailLoading ? '#FFFFFF' : cartAdded || inCart ? '#2E7D32' : '#FFFFFF',
              fontSize: 15,
              fontWeight: '700',
              letterSpacing: 0.2,
            }}
          >
            {detailLoading ? 'جاري تحميل السعر...' : cartAdded ? 'تمت الإضافة!' : inCart ? 'في السلة' : 'أضف للسلة'}
          </Text>
        </Pressable>

        {/* View on platform button */}
        <Pressable
          testID="view-on-platform-button"
          onPress={handleOpenInBrowser}
          style={({ pressed }) => ({
            backgroundColor: platform.bg,
            borderRadius: 14,
            paddingVertical: 14,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            opacity: pressed ? 0.85 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          })}
        >
          <ExternalLink size={18} color={platform.color} strokeWidth={2.5} />
          <Text
            style={{
              color: platform.color,
              fontSize: 15,
              fontWeight: '700',
              letterSpacing: 0.2,
            }}
          >
            {platform.ctaLabel}
          </Text>
        </Pressable>
      </View>

      {/* Voice Assistant */}
      <VoiceAssistant
        context={{
          currentPage: 'product',
          productInfo: {
            title: autoTranslatedTitle || product.title,
            price: detail?.price || product.priceText,
            platform: product.platform,
            rating: detail?.rating ?? undefined,
            url: product.url,
            id: product.id,
            image: product.image || undefined,
            description: detail?.description || undefined,
            aboutItem: detail?.aboutItem || undefined,
            specifications: detail?.specifications || undefined,
            brand: detail?.brand || undefined,
            availability: detail?.availability || undefined,
            reviewCount: detail?.reviewCount ?? undefined,
          } as any,
        }}
        onAddToCart={() => {}}
      />
    </SafeAreaView>
  );
}
