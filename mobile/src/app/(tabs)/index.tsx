import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Camera, Link, Menu, Search, ShoppingCart, X } from 'lucide-react-native';
import { VoiceAssistant } from '@/components/VoiceAssistant';
import { useUIStore } from '@/lib/ui-store';
import { useCartStore } from '@/lib/cart';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import { SkeletonGrid } from '@/components/SkeletonCard';
import { ProductCard, Product } from '@/components/ProductCard';
import { supabase } from '@/lib/supabase';
import { StoreIcon, StoreKey } from '@/components/StoreIcon';


const POPULAR_SEARCHES = [
  'iPhone 15',
  'Nike shoes',
  'PlayStation 5',
  'AirPods Pro',
  'Samsung TV',
  'Laptop',
  'Kindle',
  'Coffee maker',
];

type SearchMode = 'image' | 'url' | null;

const PLATFORM_CONFIG: Record<string, { label: string; bg: string; textColor: string; shadowColor: string }> = {
  ebay:    { label: 'eBay',    bg: '#FFFFFF', textColor: '#000', shadowColor: '#E53238' },
  amazon:  { label: 'Amazon',  bg: '#FF9900', textColor: '#000', shadowColor: '#FF9900' },
  walmart: { label: 'Walmart', bg: '#0071DC', textColor: '#fff', shadowColor: '#0071DC' },
  taobao:  { label: 'Taobao',  bg: '#FF4400', textColor: '#fff', shadowColor: '#FF4400' },
  '1688':  { label: '1688',    bg: '#E02020', textColor: '#fff', shadowColor: '#E02020' },
  iherb:   { label: 'iHerb',   bg: '#0F7D3B', textColor: '#fff', shadowColor: '#0F7D3B' },
};

const PLATFORMS = ['ebay', 'amazon', 'walmart', 'taobao', '1688', 'iherb'] as const;

async function searchProducts(query: string, platform: string, page = 1): Promise<Product[]> {
  const baseUrl = process.env.EXPO_PUBLIC_BACKEND_URL!;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
  const url = `${baseUrl}/search?q=${encodeURIComponent(query)}&platforms=${platform}&page=${page}`;
  const res = await fetch(url, {
    headers: { "Authorization": `Bearer ${anonKey}`, "apikey": anonKey },
  });
  if (!res.ok) throw new Error('Search failed');
  const json = await res.json();
  return (json?.data?.results ?? []) as Product[];
}

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const openDrawer = useUIStore((s) => s.openDrawer);
  const cartCount = useCartStore((s) => s.items.reduce((sum, i) => sum + i.quantity, 0));
  const { width } = useWindowDimensions();
  const [inputValue, setInputValue] = useState<string>('');
  const [submittedQuery, setSubmittedQuery] = useState<string>('');
  const [imageSearchResults, setImageSearchResults] = useState<Product[] | null>(null);
  const [isImageSearching, setIsImageSearching] = useState<boolean>(false);
  const [isResolvingUrl, setIsResolvingUrl] = useState<boolean>(false);
  const [searchMode, setSearchMode] = useState<SearchMode>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [page, setPage] = useState<number>(1);
  const [accumulatedResults, setAccumulatedResults] = useState<Product[]>([]);
  const [platformNextPage, setPlatformNextPage] = useState<Record<string, number>>({});
  const [platformFetchTrigger, setPlatformFetchTrigger] = useState<{platform: string; page: number} | null>(null);
  const [platformHasMore, setPlatformHasMore] = useState<Record<string, boolean>>({});
  const inputRef = useRef<TextInput>(null);

  const hasSearched = submittedQuery.length > 0 || imageSearchResults !== null;
  const isUrl = /^https?:\/\//i.test(inputValue.trim());

  // Auto-open when a URL is pasted (debounced to avoid mid-type triggers)
  useEffect(() => {
    const trimmed = inputValue.trim();
    if (!isUrl || trimmed.length < 15) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      setIsResolvingUrl(true);
      try {
        const finalUrl = await resolveUrl(trimmed);
        const parsed = extractFromUrl(finalUrl);
        if (!cancelled && parsed) {
          const product: Product = {
            id: `${parsed.platform}-${parsed.id}`,
            title: `${parsed.platform.charAt(0).toUpperCase() + parsed.platform.slice(1)} Product`,
            price: null, priceText: '', image: null,
            platform: parsed.platform, url: finalUrl,
          };
          Keyboard.dismiss();
          router.push({ pathname: '/product', params: { data: JSON.stringify(product) } });
        }
      } finally {
        if (!cancelled) setIsResolvingUrl(false);
      }
    }, 500);

    return () => { cancelled = true; clearTimeout(timer); };
  }, [inputValue, isUrl]);

  const isBusy = isResolvingUrl || isImageSearching;

  const { data: pageResults, isLoading, isFetching, isError, error } = useQuery({
    queryKey: ['search', submittedQuery, page],
    queryFn: () => searchProducts(submittedQuery, 'ebay,amazon,walmart,taobao,1688,iherb', page),
    enabled: submittedQuery.length > 0,
    staleTime: 1000 * 60 * 5,
  });

  const { data: platformExtraResults, isFetching: isPlatformFetching } = useQuery({
    queryKey: ['search-extra', submittedQuery, platformFetchTrigger?.platform, platformFetchTrigger?.page],
    queryFn: () => searchProducts(submittedQuery, platformFetchTrigger!.platform, platformFetchTrigger!.page),
    enabled: !!platformFetchTrigger && submittedQuery.length > 0,
    staleTime: 1000 * 60 * 5,
  });

  // Accumulate results across pages
  useEffect(() => {
    if (!pageResults) return;
    if (page === 1) {
      setAccumulatedResults(pageResults);
    } else {
      setAccumulatedResults(prev => [...prev, ...pageResults]);
    }
  }, [pageResults, page]);

  const hasMoreResults = (pageResults?.length ?? 0) > 0 && page > 1
    ? (pageResults?.length ?? 0) >= 5
    : (pageResults?.length ?? 0) >= 10;

  const baseResults = imageSearchResults ?? accumulatedResults;

  // Reset page and results when query changes
  useEffect(() => {
    setSelectedPlatform('all');
    setPage(1);
    setAccumulatedResults([]);
    setPlatformNextPage({});
    setPlatformHasMore({});
    setPlatformFetchTrigger(null);
  }, [submittedQuery, imageSearchResults]);

  useEffect(() => {
    if (!platformExtraResults || !platformFetchTrigger) return;
    setAccumulatedResults(prev => [...prev, ...platformExtraResults]);
    setPlatformNextPage(prev => ({ ...prev, [platformFetchTrigger.platform]: platformFetchTrigger.page }));
    setPlatformHasMore(prev => ({ ...prev, [platformFetchTrigger.platform]: platformExtraResults.length >= 5 }));
  }, [platformExtraResults]);

  const filteredResults = selectedPlatform === 'all'
    ? baseResults
    : baseResults.filter((p) => p.platform === selectedPlatform);

  const resolveUrl = async (url: string): Promise<string> => {
    const SHORT_DOMAINS = ['amzn.to', 'a.co', 'amzn.eu', 'amzn.asia', 'ebay.us', 'bit.ly', 'tinyurl.com'];
    try {
      const host = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
      if (SHORT_DOMAINS.some(d => host === d)) {
        const baseUrl = process.env.EXPO_PUBLIC_BACKEND_URL!;
        const aKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
        const res = await fetch(`${baseUrl}/resolve-url?url=${encodeURIComponent(url)}`, {
          headers: { "Authorization": `Bearer ${aKey}`, "apikey": aKey },
        });
        const json = await res.json();
        return (json?.data?.url as string) || url;
      }
    } catch { /* ignore */ }
    return url;
  };

  const extractFromUrl = (url: string): { platform: Product['platform']; id: string; title?: string } | null => {
    try {
      const host = new URL(url).hostname.toLowerCase();

      // AMAZON
      if (host.includes('amazon.') || host === 'a.co') {
        const m = url.match(/\/(?:dp|gp\/product|exec\/obidos\/ASIN)\/([A-Z0-9]{10})/i)
          ?? url.match(/[?&]asin=([A-Z0-9]{10})/i);
        if (m) return { platform: 'amazon', id: m[1].toUpperCase() };
      }

      // WALMART
      if (host.includes('walmart.')) {
        const m = url.match(/\/ip\/(?:[^/?#]+\/)?(\d{4,})/);
        if (m) return { platform: 'walmart', id: m[1] };
      }

      // EBAY — relaxed to 8+ digits to catch older listings
      if (host.includes('ebay.')) {
        const m = url.match(/\/itm\/([^/?#]+)\/(\d{8,})/) ?? url.match(/\/itm\/(\d{8,})/);
        if (m) {
          const id = m[2] ?? m[1];
          const titleSlug = m[2] ? m[1] : null;
          const title = titleSlug ? titleSlug.replace(/-/g, ' ') : '';
          return { platform: 'ebay', id, title };
        }
        const itemParam = url.match(/[?&]item=(\d{8,})/i);
        if (itemParam) return { platform: 'ebay', id: itemParam[1] };
      }

      // TEMU
      if (host.includes('temu.')) {
        const m = url.match(/goods_id=(\d+)/) ?? url.match(/-g-(\d+)/);
        return { platform: 'temu', id: m?.[1] ?? url };
      }

      // TAOBAO / TMALL
      if (host.includes('taobao.') || host.includes('tmall.') || host.includes('tb.cn')) {
        const m = url.match(/[?&]id=(\d+)/);
        return { platform: 'taobao', id: m?.[1] ?? url };
      }

      // 1688
      if (host.includes('1688.')) {
        const m = url.match(/\/offer\/(\d+)/);
        return { platform: '1688', id: m?.[1] ?? url };
      }

      // IHERB
      if (host.includes('iherb.')) {
        const m = url.match(/\/pr\/[^/?#]+\/(\d+)/) ?? url.match(/\/p\/([A-Z0-9-]+)/i);
        return { platform: 'iherb', id: m?.[1] ?? url };
      }

    } catch { /* ignore */ }
    return null;
  };

  const handleSubmit = useCallback(async () => {
    if (searchMode === 'image') {
      handleImageSearch();
      return;
    }
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    Keyboard.dismiss();

    if (searchMode === 'url' || isUrl) {
      setIsResolvingUrl(true);
      try {
        const finalUrl = await resolveUrl(trimmed);
        const parsed = extractFromUrl(finalUrl) ?? extractFromUrl(trimmed);
        const productUrl = extractFromUrl(finalUrl) ? finalUrl : trimmed;
        if (parsed) {
          const product: Product = {
            id: `${parsed.platform}-${parsed.id}`,
            title: parsed.title || `${parsed.platform.charAt(0).toUpperCase() + parsed.platform.slice(1)} Product`,
            price: null,
            priceText: '',
            image: null,
            platform: parsed.platform,
            url: productUrl,
          };
          router.push({ pathname: '/product', params: { data: JSON.stringify(product) } });
          return;
        }
      } finally {
        setIsResolvingUrl(false);
      }
    }

    setImageSearchResults(null);
    setSubmittedQuery(trimmed);
  }, [inputValue, searchMode, isUrl]);

  const handleUrlTabPress = useCallback(async () => {
    setSearchMode('url');
    try {
      const text =
        Platform.OS === 'web'
          ? await navigator.clipboard.readText()
          : await Clipboard.getStringAsync();
      if (text && /^https?:\/\//i.test(text.trim())) {
        setInputValue(text.trim());
      }
    } catch { /* clipboard unavailable or permission denied */ }
    setTimeout(() => inputRef.current?.focus(), 80);
  }, []);

  const handleImageTabPress = useCallback(() => {
    setSearchMode('image');
    handleImageSearch();
  }, []);

  const handleChipPress = useCallback((chip: string) => {
    setSearchMode(null);
    setInputValue(chip);
    setImageSearchResults(null);
    setSubmittedQuery(chip);
    Keyboard.dismiss();
  }, []);

  const handleClear = useCallback(() => {
    setInputValue('');
    setSubmittedQuery('');
    setImageSearchResults(null);
    inputRef.current?.focus();
  }, []);

  const handleImageSearch = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'] as ImagePicker.MediaType[],
      quality: 0.7,
      allowsEditing: false,
    });

    if (result.canceled || !result.assets[0]) return;

    setIsImageSearching(true);
    try {
      const asset = result.assets[0];
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const filename = `lens-${Date.now()}.jpg`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('image-search')
        .upload(filename, blob, { contentType: 'image/jpeg', upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('image-search')
        .getPublicUrl(uploadData.path);

      const baseUrl = process.env.EXPO_PUBLIC_BACKEND_URL!;
      const aKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
      const res = await fetch(`${baseUrl}/image-search?url=${encodeURIComponent(publicUrl)}`, {
        headers: { "Authorization": `Bearer ${aKey}`, "apikey": aKey },
      });
      if (!res.ok) throw new Error('Image search failed');
      const json = await res.json();
      const imageResults = (json?.data?.results ?? []) as Product[];
      const detectedQuery: string = json?.data?.detectedQuery ?? '';

      setInputValue(detectedQuery);
      setSubmittedQuery('');
      setImageSearchResults(imageResults);
    } catch (e) {
      console.error('Image search error:', e);
    } finally {
      setIsImageSearching(false);
    }
  };

  const cardWidth = (width - 24) / 2;

  const submitLabel = isBusy ? '...'
    : searchMode === 'url' || isUrl ? 'فتح'
    : searchMode === 'image' ? 'صورة'
    : 'بحث';

  const barIcon = searchMode === 'url' || isUrl
    ? <Link size={18} color="#E52222" strokeWidth={2} />
    : searchMode === 'image'
    ? <Camera size={18} color="#E52222" strokeWidth={2} />
    : <Search size={18} color="#aaaaaa" strokeWidth={2} />;

  const placeholder = searchMode === 'url'
    ? 'الصق رابط المنتج هنا...'
    : searchMode === 'image'
    ? 'اضغط "صورة" للبحث بصورة'
    : 'ابحث عن أي منتج...';

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      {/* Header */}
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          {/* Menu */}
          <Pressable
            testID="menu-button"
            onPress={openDrawer}
            hitSlop={10}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: 4 })}
          >
            <Menu size={26} color="#1a1a1a" strokeWidth={2} />
          </Pressable>

          {/* Logo + title */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{
              width: 34, height: 34, borderRadius: 10,
              backgroundColor: '#E52222', alignItems: 'center', justifyContent: 'center',
            }}>
              <ShoppingCart size={18} color="#ffffff" strokeWidth={2.2} />
            </View>
            <Text style={{ color: '#1a1a1a', fontSize: 24, fontWeight: '800', letterSpacing: -0.8 }}>
              Box Global
            </Text>
          </View>

          {/* Cart */}
          <Pressable
            testID="home-cart"
            onPress={() => router.push('/cart')}
            hitSlop={10}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: 4 })}
          >
            <View style={{ position: 'relative' }}>
              <ShoppingCart size={24} color="#1a1a1a" strokeWidth={2} />
              {cartCount > 0 ? (
                <View style={{
                  position: 'absolute', top: -6, right: -8,
                  backgroundColor: '#CC0C39', borderRadius: 9,
                  minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center',
                  paddingHorizontal: 3, borderWidth: 1.5, borderColor: '#FFFFFF',
                }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 9, fontWeight: '800', lineHeight: 12 }}>
                    {cartCount > 99 ? '99+' : String(cartCount)}
                  </Text>
                </View>
              ) : null}
            </View>
          </Pressable>
        </View>
        <Text style={{ color: '#999999', fontSize: 12, fontWeight: '500', letterSpacing: 1.2, textAlign: 'center' }}>
          eBay · Amazon · Walmart · Taobao · 1688 · iHerb
        </Text>
      </View>

      {/* URL resolving overlay */}
      {isResolvingUrl ? (
        <View style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center',
          zIndex: 999,
        }}>
          <View style={{
            backgroundColor: '#fff', borderRadius: 20, padding: 28,
            alignItems: 'center', gap: 14, minWidth: 200,
            shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
          }}>
            <ActivityIndicator size="large" color="#E52222" />
            <Text style={{ color: '#1a1a1a', fontSize: 15, fontWeight: '700' }}>جاري فتح الرابط...</Text>
            <Text style={{ color: '#999', fontSize: 12 }}>يرجى الانتظار</Text>
          </View>
        </View>
      ) : null}

      {/* Voice Assistant Bar */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
        <VoiceAssistant
          variant="bar"
          context={{
            currentPage: hasSearched ? 'search' : 'home',
            searchQuery: submittedQuery,
            searchResults: hasSearched ? baseResults.slice(0, 6).map(r => ({
              title: r.title,
              price: r.priceText || '',
              platform: r.platform,
              url: r.url,
              id: r.id,
              image: r.image || undefined,
            })) : undefined,
          }}
          onSearch={(query) => {
            setInputValue(query);
            setSubmittedQuery(query);
          }}
          onNavigate={(page, params) => {
            if (page === 'search' && params?.query) {
              setInputValue(params.query);
              setSubmittedQuery(params.query);
            }
          }}
          onNavigateToStore={(platform, query) => {
            router.push({ pathname: '/store', params: { platform, query } });
          }}
          onNavigateToProduct={(product) => {
            router.push({ pathname: '/product', params: { data: JSON.stringify(product) } });
          }}
        />
      </View>

      {/* Search mode tabs — image & url only */}
      <View style={{
        flexDirection: 'row', marginHorizontal: 16, marginBottom: 16,
        backgroundColor: '#f5f5f5', borderRadius: 14,
        borderWidth: 1, borderColor: '#e5e5e5',
        padding: 4, gap: 4,
      }}>
        <Pressable
          testID="mode-tab-image"
          onPress={handleImageTabPress}
          style={({ pressed }) => ({
            flex: 1, flexDirection: 'row', alignItems: 'center',
            justifyContent: 'center', gap: 6, paddingVertical: 10,
            borderRadius: 10,
            backgroundColor: searchMode === 'image' ? '#E52222' : 'transparent',
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Camera size={14} color={searchMode === 'image' ? '#ffffff' : '#999999'} strokeWidth={2.5} />
          <Text style={{
            color: searchMode === 'image' ? '#ffffff' : '#999999',
            fontSize: 13, fontWeight: searchMode === 'image' ? '700' : '500',
          }}>
            بحث بصورة
          </Text>
        </Pressable>

        <Pressable
          testID="mode-tab-url"
          onPress={handleUrlTabPress}
          style={({ pressed }) => ({
            flex: 1, flexDirection: 'row', alignItems: 'center',
            justifyContent: 'center', gap: 6, paddingVertical: 10,
            borderRadius: 10,
            backgroundColor: searchMode === 'url' || isUrl ? '#E52222' : 'transparent',
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Link size={14} color={searchMode === 'url' || isUrl ? '#ffffff' : '#999999'} strokeWidth={2.5} />
          <Text style={{
            color: searchMode === 'url' || isUrl ? '#ffffff' : '#999999',
            fontSize: 13, fontWeight: searchMode === 'url' || isUrl ? '700' : '500',
          }}>
            بحث برابط
          </Text>
        </Pressable>
      </View>

      {/* Content area */}
      {!hasSearched ? (
        <View style={{ flex: 1 }}>
          {/* Popular searches — always shown when not searched */}
          <Text style={{
            color: '#999999', fontSize: 11, fontWeight: '600',
            letterSpacing: 1.5, paddingHorizontal: 20, marginBottom: 12,
          }}>
            البحث الشائع
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0 }}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8, flexDirection: 'row' }}
          >
            {POPULAR_SEARCHES.map((chip) => (
              <Pressable
                key={chip}
                onPress={() => handleChipPress(chip)}
                style={({ pressed }) => ({
                  paddingHorizontal: 16, paddingVertical: 9, borderRadius: 50,
                  backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#e5e5e5',
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text style={{ color: '#555555', fontSize: 14, fontWeight: '500' }}>{chip}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Platform grid */}
          <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 24 }}>
            <Text style={{ color: '#999', fontSize: 11, fontWeight: '600', letterSpacing: 1.4, marginBottom: 16 }}>
              اختر متجراً للتصفح
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {PLATFORMS.map((key) => {
                const cfg = PLATFORM_CONFIG[key];
                return (
                  <Pressable
                    key={key}
                    testID={`platform-icon-${key}`}
                    onPress={() => router.push({ pathname: '/store', params: { platform: key } })}
                    style={({ pressed }) => ({
                      width: (width - 32 - 24) / 3,
                      alignItems: 'center',
                      opacity: pressed ? 0.75 : 1,
                    })}
                  >
                    <View style={{
                      width: 72, height: 72, borderRadius: 20,
                      backgroundColor: cfg.bg,
                      marginBottom: 8,
                      shadowColor: cfg.shadowColor, shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
                      elevation: 4,
                      overflow: 'hidden',
                    }}>
                      <StoreIcon store={key as StoreKey} size={72} />
                    </View>
                    <Text style={{ color: '#333', fontSize: 13, fontWeight: '600' }}>{cfg.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      ) : isImageSearching ? (
        <SkeletonGrid />
      ) : isLoading ? (
        <SkeletonGrid />
      ) : isError ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80 }}>
          <Text style={{ fontSize: 40, marginBottom: 16 }}>⚠️</Text>
          <Text style={{ color: '#1a1a1a', fontSize: 16, fontWeight: '700', marginBottom: 8 }}>
            فشل البحث
          </Text>
          <Text style={{ color: '#999999', fontSize: 13, textAlign: 'center', paddingHorizontal: 40 }}>
            {error instanceof Error ? error.message : 'حدث خطأ ما. حاول مرة أخرى.'}
          </Text>
          <Pressable
            onPress={() => setSubmittedQuery('')}
            style={({ pressed }) => ({
              marginTop: 24, paddingHorizontal: 24, paddingVertical: 12,
              backgroundColor: '#f5f5f5', borderRadius: 50,
              borderWidth: 1, borderColor: '#e5e5e5', opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ color: '#1a1a1a', fontSize: 14, fontWeight: '600' }}>حاول مرة أخرى</Text>
          </Pressable>
        </View>
      ) : baseResults.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80 }}>
          <Text style={{ fontSize: 40, marginBottom: 16 }}>🛒</Text>
          <Text style={{ color: '#1a1a1a', fontSize: 16, fontWeight: '700', marginBottom: 8 }}>
            لا توجد نتائج
          </Text>
          <Text style={{ color: '#999999', fontSize: 13, textAlign: 'center', paddingHorizontal: 40 }}>
            جرّب كلمة بحث مختلفة أو متجراً آخر
          </Text>
        </View>
      ) : (
        <FlatList
          testID="results-list"
          data={filteredResults}
          keyExtractor={(item) => `${item.platform}-${item.id}`}
          numColumns={2}
          contentContainerStyle={{ padding: 6, paddingBottom: insets.bottom + 20 }}
          columnWrapperStyle={{ gap: 0 }}
          onScrollBeginDrag={Keyboard.dismiss}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={{ width: cardWidth }}>
              <ProductCard product={item} />
            </View>
          )}
          ListFooterComponent={imageSearchResults === null ? (
            <View style={{ paddingVertical: 20, paddingHorizontal: 12, alignItems: 'center' }}>
              {selectedPlatform === 'all' ? (
                isFetching && page > 1 ? (
                  <ActivityIndicator color="#E53238" size="small" />
                ) : hasMoreResults ? (
                  <Pressable
                    testID="load-more-button"
                    onPress={() => setPage(p => p + 1)}
                    style={({ pressed }) => ({
                      paddingHorizontal: 32, paddingVertical: 12,
                      backgroundColor: pressed ? '#f0f0f0' : '#ffffff',
                      borderRadius: 50, borderWidth: 1.5, borderColor: '#e0e0e0',
                      flexDirection: 'row', alignItems: 'center', gap: 8,
                    })}
                  >
                    <Text style={{ color: '#333', fontSize: 14, fontWeight: '700' }}>تحميل المزيد</Text>
                  </Pressable>
                ) : accumulatedResults.length > 0 ? (
                  <Text style={{ color: '#bbb', fontSize: 12 }}>لا توجد نتائج إضافية</Text>
                ) : null
              ) : (
                isPlatformFetching ? (
                  <ActivityIndicator color="#E53238" size="small" />
                ) : platformHasMore[selectedPlatform] === false ? (
                  <Text style={{ color: '#bbb', fontSize: 12 }}>
                    {`لا توجد نتائج إضافية لـ ${PLATFORM_CONFIG[selectedPlatform]?.label ?? selectedPlatform}`}
                  </Text>
                ) : filteredResults.length > 0 ? (
                  <Pressable
                    testID="load-more-platform-button"
                    onPress={() => {
                      const currentPage = platformNextPage[selectedPlatform] ?? page;
                      setPlatformFetchTrigger({ platform: selectedPlatform, page: currentPage + 1 });
                    }}
                    style={({ pressed }) => ({
                      paddingHorizontal: 32, paddingVertical: 12,
                      backgroundColor: pressed ? '#f0f0f0' : '#ffffff',
                      borderRadius: 50, borderWidth: 1.5, borderColor: '#e0e0e0',
                      flexDirection: 'row', alignItems: 'center', gap: 8,
                    })}
                  >
                    <Text style={{ color: '#333', fontSize: 14, fontWeight: '700' }}>
                      {`تحميل المزيد من ${PLATFORM_CONFIG[selectedPlatform]?.label ?? selectedPlatform}`}
                    </Text>
                  </Pressable>
                ) : null
              )}
            </View>
          ) : null}
          ListHeaderComponent={
            <View style={{ paddingBottom: 8, paddingTop: 4 }}>
              {/* Platform filter tabs */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ flexGrow: 0, marginBottom: 10 }}
                contentContainerStyle={{ paddingHorizontal: 6, gap: 7, flexDirection: 'row' }}
              >
                {/* "All" tab */}
                <Pressable
                  testID="filter-tab-all"
                  onPress={() => setSelectedPlatform('all')}
                  style={({ pressed }) => ({
                    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 50,
                    borderWidth: 1,
                    backgroundColor: selectedPlatform === 'all' ? '#1a1a1a' : '#f5f5f5',
                    borderColor: selectedPlatform === 'all' ? '#1a1a1a' : '#e0e0e0',
                    opacity: pressed ? 0.75 : 1,
                    flexDirection: 'row', alignItems: 'center', gap: 5,
                  })}
                >
                  <Text style={{
                    color: selectedPlatform === 'all' ? '#ffffff' : '#333333',
                    fontSize: 13, fontWeight: '600',
                  }}>
                    الكل
                  </Text>
                  <View style={{
                    backgroundColor: selectedPlatform === 'all' ? 'rgba(255,255,255,0.25)' : '#e0e0e0',
                    borderRadius: 20, paddingHorizontal: 6, paddingVertical: 1,
                  }}>
                    <Text style={{
                      color: selectedPlatform === 'all' ? '#ffffff' : '#666666',
                      fontSize: 11, fontWeight: '700',
                    }}>
                      {baseResults.length}
                    </Text>
                  </View>
                </Pressable>

                {/* Per-platform tabs — only show platforms with results */}
                {PLATFORMS.filter((key) => baseResults.some((p) => p.platform === key)).map((key) => {
                  const cfg = PLATFORM_CONFIG[key];
                  const count = baseResults.filter((p) => p.platform === key).length;
                  const isActive = selectedPlatform === key;
                  return (
                    <Pressable
                      key={key}
                      testID={`filter-tab-${key}`}
                      onPress={() => setSelectedPlatform(key)}
                      style={({ pressed }) => ({
                        paddingHorizontal: 12, paddingVertical: 7, borderRadius: 50,
                        borderWidth: 1,
                        backgroundColor: isActive ? cfg.bg : '#f5f5f5',
                        borderColor: isActive ? cfg.bg : '#e0e0e0',
                        opacity: pressed ? 0.75 : 1,
                        flexDirection: 'row', alignItems: 'center', gap: 5,
                      })}
                    >
                      <Text style={{
                        color: isActive ? cfg.textColor : '#333333',
                        fontSize: 13, fontWeight: '600',
                      }}>
                        {cfg.label}
                      </Text>
                      <View style={{
                        backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : '#e0e0e0',
                        borderRadius: 20, paddingHorizontal: 6, paddingVertical: 1,
                      }}>
                        <Text style={{
                          color: isActive ? cfg.textColor : '#666666',
                          fontSize: 11, fontWeight: '700',
                        }}>
                          {count}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* Results count */}
              <View style={{ paddingHorizontal: 6 }}>
                <Text style={{ color: '#999999', fontSize: 12, fontWeight: '500' }}>
                  {imageSearchResults !== null
                    ? `${filteredResults.length} نتيجة بحث بالصورة`
                    : `${filteredResults.length} نتيجة لـ "${submittedQuery}"`
                  }
                </Text>
              </View>
            </View>
          }
        />
      )}

    </View>
  );
}
