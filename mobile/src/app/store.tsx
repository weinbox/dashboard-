import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView,
  FlatList, Keyboard, Image, useWindowDimensions, ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Search, X, ShoppingCart, MapPin, ChevronRight, Zap, Star, Camera, Link2 } from 'lucide-react-native';
import { ProductCard, Product } from '@/components/ProductCard';
import { SkeletonGrid } from '@/components/SkeletonCard';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';

// ─── Shared helpers ──────────────────────────────────────────────────────────

const CATEGORY_IMAGE_MAP: [string, string][] = [
  ['laptop', 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=200&fit=crop'],
  ['smartphone', 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=200&fit=crop'],
  ['phone', 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=200&fit=crop'],
  ['headphone', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&fit=crop'],
  ['gaming', 'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=200&fit=crop'],
  ['television', 'https://images.unsplash.com/photo-1593359677879-a4bb92f4834a?w=200&fit=crop'],
  ['camera', 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=200&fit=crop'],
  ['smartwatch', 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&fit=crop'],
  ['electronics', 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=200&fit=crop'],
  ['mens clothing', 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=200&fit=crop'],
  ['womens clothing', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&fit=crop'],
  ['shoes', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&fit=crop'],
  ['bags', 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=200&fit=crop'],
  ['fashion', 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=200&fit=crop'],
  ['clothing', 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200&fit=crop'],
  ['kitchen', 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=200&fit=crop'],
  ['furniture', 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=200&fit=crop'],
  ['home decor', 'https://images.unsplash.com/photo-1493770348161-369560ae357d?w=200&fit=crop'],
  ['tools', 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=200&fit=crop'],
  ['garden', 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=200&fit=crop'],
  ['home', 'https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=200&fit=crop'],
  ['makeup', 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=200&fit=crop'],
  ['skincare', 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=200&fit=crop'],
  ['hair care', 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=200&fit=crop'],
  ['perfume', 'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=200&fit=crop'],
  ['beauty', 'https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=200&fit=crop'],
  ['fitness', 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200&fit=crop'],
  ['sports', 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=200&fit=crop'],
  ['toys', 'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=200&fit=crop'],
  ['books', 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=200&fit=crop'],
  ['pets', 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=200&fit=crop'],
  ['vitamin', 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200&fit=crop'],
  ['protein', 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=200&fit=crop'],
  ['wholesale', 'https://images.unsplash.com/photo-1553413077-190dd305871c?w=200&fit=crop'],
  ['jewelry', 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=200&fit=crop'],
];

function getCategoryImage(query: string, label = ''): string {
  const q = (query + ' ' + label).toLowerCase();
  for (const [keyword, url] of CATEGORY_IMAGE_MAP) {
    if (q.includes(keyword)) return url;
  }
  return 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=200&fit=crop';
}

async function searchPlatform(query: string, platform: string, page = 1): Promise<Product[]> {
  const baseUrl = process.env.EXPO_PUBLIC_BACKEND_URL!;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
  const res = await fetch(`${baseUrl}/search?q=${encodeURIComponent(query)}&platforms=${platform}&page=${page}`, {
    headers: { "Authorization": `Bearer ${anonKey}`, "apikey": anonKey },
  });
  if (!res.ok) throw new Error('Search failed');
  const json = await res.json();
  return (json?.data?.results ?? []) as Product[];
}

// ─── Amazon Store ─────────────────────────────────────────────────────────────

const AMAZON_BANNERS = [
  {
    id: '1',
    title: 'عروض اليوم',
    subtitle: 'خصومات حتى 70% على آلاف المنتجات',
    tag: '⚡ عروض محدودة',
    bg1: '#131921', bg2: '#232F3E',
    accentBg: '#CC0C39',
    image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400&fit=crop',
  },
  {
    id: '2',
    title: 'إلكترونيات',
    subtitle: 'أحدث الأجهزة والتقنيات',
    tag: '📱 تقنية',
    bg1: '#1a1a2e', bg2: '#16213e',
    accentBg: '#007185',
    image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400&fit=crop',
  },
  {
    id: '3',
    title: 'موضة وأزياء',
    subtitle: 'تشكيلة جديدة كل أسبوع',
    tag: '👗 موضة',
    bg1: '#2d1b3d', bg2: '#1a0d26',
    accentBg: '#8B44AC',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&fit=crop',
  },
];

const AMAZON_DEPARTMENTS = [
  {
    id: 'electronics',
    label: 'الإلكترونيات',
    query: 'electronics',
    subcategories: [
      { label: 'لابتوب', query: 'laptops' },
      { label: 'جوالات', query: 'smartphones' },
      { label: 'سماعات', query: 'headphones' },
      { label: 'كاميرات', query: 'cameras' },
    ],
  },
  {
    id: 'fashion',
    label: 'الأزياء',
    query: 'clothing',
    subcategories: [
      { label: 'رجالي', query: 'mens clothing' },
      { label: 'نسائي', query: 'womens clothing' },
      { label: 'أحذية', query: 'shoes' },
      { label: 'حقائب', query: 'bags handbags' },
    ],
  },
  {
    id: 'home',
    label: 'المنزل والمطبخ',
    query: 'home kitchen',
    subcategories: [
      { label: 'مطبخ', query: 'kitchen appliances' },
      { label: 'أثاث', query: 'furniture' },
      { label: 'ديكور', query: 'home decor' },
      { label: 'أدوات', query: 'tools hardware' },
    ],
  },
  {
    id: 'beauty',
    label: 'الجمال والعناية',
    query: 'beauty',
    subcategories: [
      { label: 'مكياج', query: 'makeup' },
      { label: 'عناية بالبشرة', query: 'skincare' },
      { label: 'شعر', query: 'hair care' },
      { label: 'عطور', query: 'perfume' },
    ],
  },
  {
    id: 'sports',
    label: 'الرياضة',
    query: 'sports fitness',
    subcategories: [
      { label: 'لياقة', query: 'fitness gym' },
      { label: 'كرة قدم', query: 'football' },
      { label: 'دراجات', query: 'cycling' },
      { label: 'سباحة', query: 'swimming' },
    ],
  },
  {
    id: 'toys',
    label: 'الألعاب والأطفال',
    query: 'toys kids',
    subcategories: [
      { label: 'ألعاب أطفال', query: 'kids toys' },
      { label: 'ألعاب فيديو', query: 'video games' },
      { label: 'ألغاز', query: 'puzzles' },
      { label: 'فنون', query: 'art crafts' },
    ],
  },
  {
    id: 'books',
    label: 'الكتب',
    query: 'books',
    subcategories: [
      { label: 'روايات', query: 'novels fiction' },
      { label: 'تعليم', query: 'educational books' },
      { label: 'طبخ', query: 'cooking books' },
      { label: 'أعمال', query: 'business books' },
    ],
  },
  {
    id: 'pets',
    label: 'الحيوانات الأليفة',
    query: 'pets',
    subcategories: [
      { label: 'كلاب', query: 'dog supplies' },
      { label: 'قطط', query: 'cat supplies' },
      { label: 'أسماك', query: 'fish aquarium' },
      { label: 'طعام', query: 'pet food' },
    ],
  },
];

const AMAZON_DEALS = [
  { id: '1', label: 'أجهزة لابتوب', discount: '45%', query: 'laptops', image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=200&fit=crop' },
  { id: '2', label: 'سماعات', discount: '60%', query: 'headphones', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&fit=crop' },
  { id: '3', label: 'ساعات ذكية', discount: '38%', query: 'smartwatches', image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&fit=crop' },
  { id: '4', label: 'كاميرات', discount: '30%', query: 'cameras', image: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=200&fit=crop' },
  { id: '5', label: 'أجهزة منزلية', discount: '55%', query: 'home appliances', image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=200&fit=crop' },
  { id: '6', label: 'ملابس رجالي', discount: '40%', query: 'mens clothing', image: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=200&fit=crop' },
];

function AmazonLogo() {
  return (
    <View>
      <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '900', letterSpacing: -0.5, fontStyle: 'italic' }}>
        amazon
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: -3 }}>
        <View style={{ width: 36, height: 2.5, borderRadius: 2, backgroundColor: '#FF9900' }} />
        <View style={{
          width: 7, height: 7, borderRadius: 4,
          backgroundColor: '#FF9900', marginLeft: -3,
          transform: [{ translateY: -2 }],
        }} />
      </View>
    </View>
  );
}

// Star rating for deals
function MiniStars({ rating }: { rating: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 1 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={9} color={i < Math.round(rating) ? '#FF9900' : '#D0D0D0'} fill={i < Math.floor(rating) ? '#FF9900' : 'transparent'} strokeWidth={1.5} />
      ))}
    </View>
  );
}

// Department panel (2x2 grid) - the most Amazon-like feature
function DepartmentPanel({ dept, width, onCategoryPress }: {
  dept: typeof AMAZON_DEPARTMENTS[0];
  width: number;
  onCategoryPress: (query: string) => void;
}) {
  const tileSize = (width - 2) / 2;
  return (
    <Pressable
      onPress={() => onCategoryPress(dept.query)}
      style={{
        backgroundColor: '#FFFFFF',
        width,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 4,
        overflow: 'hidden',
      }}
    >
      {/* Department title */}
      <View style={{ paddingHorizontal: 12, paddingTop: 12, paddingBottom: 8 }}>
        <Text style={{ color: '#0F1111', fontSize: 15, fontWeight: '700' }}>{dept.label}</Text>
      </View>

      {/* 2x2 image grid */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {dept.subcategories.slice(0, 4).map((sub, idx) => (
          <Pressable
            key={sub.query}
            onPress={() => onCategoryPress(sub.query)}
            style={{ width: tileSize, height: tileSize, borderWidth: 0.5, borderColor: '#F0F0F0' }}
          >
            <Image
              source={{ uri: getCategoryImage(sub.query, sub.label) }}
              style={{ width: tileSize, height: tileSize - 22 }}
              resizeMode="cover"
            />
            <View style={{ backgroundColor: '#F3F3F3', height: 22, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 10, color: '#0F1111', fontWeight: '500' }} numberOfLines={1}>
                {sub.label}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>

      {/* See all link */}
      <Pressable
        onPress={() => onCategoryPress(dept.query)}
        style={{ paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center' }}
      >
        <Text style={{ color: '#007185', fontSize: 12, fontWeight: '500' }}>عرض الكل في {dept.label}</Text>
        <ChevronRight size={13} color="#007185" strokeWidth={2} />
      </Pressable>
    </Pressable>
  );
}

function AmazonStore({ onSearch }: { onSearch: (query: string) => void }) {
  const { width } = useWindowDimensions();
  const [activeBanner, setActiveBanner] = useState<number>(0);
  const panelWidth = (width - 12 * 2 - 8) / 2;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 30 }}
      style={{ backgroundColor: '#EAEDED' }}
    >
      {/* Hero Banner Carousel */}
      <ScrollView
        horizontal pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          setActiveBanner(Math.round(e.nativeEvent.contentOffset.x / width));
        }}
        style={{ flexGrow: 0 }}
      >
        {AMAZON_BANNERS.map((banner) => (
          <Pressable key={banner.id} style={{ width }} onPress={() => onSearch(banner.title)}>
            <View style={{ height: 180, overflow: 'hidden', position: 'relative' }}>
              <Image source={{ uri: banner.image }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              <LinearGradient
                colors={[`${banner.bg1}EE`, `${banner.bg2}AA`, 'transparent']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              />
              <View style={{ position: 'absolute', top: 0, left: 0, bottom: 0, justifyContent: 'center', paddingHorizontal: 20, width: '60%' }}>
                <View style={{ backgroundColor: banner.accentBg, borderRadius: 3, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 8 }}>
                  <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>{banner.tag}</Text>
                </View>
                <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '900', lineHeight: 26 }}>{banner.title}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 4, lineHeight: 17 }}>{banner.subtitle}</Text>
                <Pressable
                  onPress={() => onSearch(banner.title)}
                  style={{ marginTop: 12, backgroundColor: '#FFD814', borderRadius: 4, paddingHorizontal: 14, paddingVertical: 7, alignSelf: 'flex-start', borderWidth: 1, borderColor: '#FFA41C' }}
                >
                  <Text style={{ color: '#0F1111', fontSize: 12, fontWeight: '700' }}>تسوّق الآن</Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>

      {/* Banner dots */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', backgroundColor: '#fff', paddingVertical: 8, gap: 5 }}>
        {AMAZON_BANNERS.map((_, i) => (
          <View key={i} style={{
            width: activeBanner === i ? 18 : 6, height: 6, borderRadius: 3,
            backgroundColor: activeBanner === i ? '#FF9900' : '#CCCCCC',
          }} />
        ))}
      </View>

      {/* Today's Deals */}
      <View style={{ backgroundColor: '#FFFFFF', marginTop: 8, paddingTop: 14, paddingBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Zap size={18} color="#CC0C39" fill="#CC0C39" strokeWidth={0} />
            <Text style={{ color: '#0F1111', fontSize: 18, fontWeight: '700' }}>عروض اليوم</Text>
          </View>
          <Pressable onPress={() => onSearch('deals today')}>
            <Text style={{ color: '#007185', fontSize: 13 }}>عرض الكل</Text>
          </Pressable>
        </View>

        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          contentContainerStyle={{ paddingHorizontal: 12, gap: 10 }}
        >
          {AMAZON_DEALS.map((deal) => (
            <Pressable
              key={deal.id}
              onPress={() => onSearch(deal.query)}
              style={({ pressed }) => ({
                width: 120, backgroundColor: '#FFF',
                borderRadius: 4, borderWidth: 1, borderColor: '#E0E0E0',
                overflow: 'hidden', opacity: pressed ? 0.85 : 1,
              })}
            >
              <Image source={{ uri: deal.image }} style={{ width: 120, height: 100 }} resizeMode="cover" />
              {/* Deal badge */}
              <View style={{ position: 'absolute', top: 6, left: 6, backgroundColor: '#CC0C39', borderRadius: 3, paddingHorizontal: 6, paddingVertical: 2 }}>
                <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '800' }}>-{deal.discount}</Text>
              </View>
              <View style={{ padding: 8 }}>
                <Text style={{ color: '#0F1111', fontSize: 11, fontWeight: '600' }} numberOfLines={2}>{deal.label}</Text>
                <MiniStars rating={4.2} />
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Prime Banner */}
      <Pressable style={{ marginTop: 8 }}>
        <LinearGradient
          colors={['#232F3E', '#37475A']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={{ paddingHorizontal: 20, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <View>
            <Text style={{ color: '#FF9900', fontSize: 20, fontWeight: '900', fontStyle: 'italic' }}>prime</Text>
            <Text style={{ color: '#FFFFFF', fontSize: 13, marginTop: 2 }}>شحن مجاني وعروض حصرية</Text>
          </View>
          <View style={{ backgroundColor: '#FF9900', borderRadius: 4, paddingHorizontal: 16, paddingVertical: 8 }}>
            <Text style={{ color: '#0F1111', fontSize: 13, fontWeight: '700' }}>جرّب مجاناً</Text>
          </View>
        </LinearGradient>
      </Pressable>

      {/* Department Panels Grid */}
      <View style={{ backgroundColor: '#EAEDED', marginTop: 8, paddingTop: 14 }}>
        <Text style={{ color: '#0F1111', fontSize: 18, fontWeight: '700', paddingHorizontal: 14, marginBottom: 12 }}>
          تسوّق حسب الفئة
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8 }}>
          {AMAZON_DEPARTMENTS.map((dept) => (
            <DepartmentPanel
              key={dept.id}
              dept={dept}
              width={panelWidth}
              onCategoryPress={onSearch}
            />
          ))}
        </View>
      </View>

      {/* Quick Search Chips */}
      <View style={{ backgroundColor: '#FFFFFF', marginTop: 8, paddingVertical: 16 }}>
        <Text style={{ color: '#0F1111', fontSize: 18, fontWeight: '700', paddingHorizontal: 14, marginBottom: 12 }}>
          عمليات بحث شائعة
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8 }}>
          {['iPhone 15', 'AirPods Pro', 'PlayStation 5', 'Samsung Galaxy', 'Kindle', 'Echo Dot', 'Nike Air Max', 'Dyson'].map((chip) => (
            <Pressable
              key={chip}
              onPress={() => onSearch(chip)}
              style={({ pressed }) => ({
                paddingHorizontal: 14, paddingVertical: 8,
                borderRadius: 20, backgroundColor: '#F3F3F3',
                borderWidth: 1, borderColor: '#DDDDDD',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ color: '#0F1111', fontSize: 13 }}>{chip}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

// ─── Generic Store (for non-Amazon platforms) ─────────────────────────────────

type Subcategory = { icon: string; label: string; query: string; count: number; bgColor: string };
type Category = { icon: string; label: string; query: string; subcategories: Subcategory[] };

const STORE_CONFIG: Record<string, {
  label: string;
  bg: string;
  headerText: string;
  accentColor: string;
  categories: Category[];
  featured: { label: string; query: string }[];
}> = {
  ebay: {
    label: 'eBay', bg: '#E53238', headerText: '#fff', accentColor: '#E53238',
    categories: [
      { icon: '📱', label: 'إلكترونيات', query: 'electronics', subcategories: [
        { icon: '💻', label: 'لابتوب', query: 'laptops ebay', count: 74, bgColor: '#D4CAFF' },
        { icon: '📱', label: 'جوالات', query: 'smartphones ebay', count: 132, bgColor: '#FFB8C8' },
        { icon: '🎧', label: 'سماعات', query: 'headphones ebay', count: 58, bgColor: '#C8E8FF' },
        { icon: '🎮', label: 'ألعاب', query: 'gaming ebay', count: 89, bgColor: '#C8FFE0' },
      ]},
      { icon: '👗', label: 'أزياء', query: 'fashion clothing', subcategories: [
        { icon: '👔', label: 'رجالي', query: 'mens clothing ebay', count: 210, bgColor: '#C8E8FF' },
        { icon: '👗', label: 'نسائي', query: 'womens clothing ebay', count: 175, bgColor: '#FFB8D4' },
        { icon: '👟', label: 'أحذية', query: 'shoes ebay', count: 130, bgColor: '#FFE566' },
        { icon: '👜', label: 'حقائب', query: 'bags ebay', count: 88, bgColor: '#D4CAFF' },
      ]},
      { icon: '🏠', label: 'المنزل', query: 'home garden', subcategories: [
        { icon: '🛋', label: 'أثاث', query: 'furniture ebay', count: 95, bgColor: '#C8E8FF' },
        { icon: '🌱', label: 'حديقة', query: 'garden ebay', count: 67, bgColor: '#C8FFE0' },
        { icon: '💡', label: 'إضاءة', query: 'lighting ebay', count: 44, bgColor: '#FFE0C8' },
        { icon: '🧹', label: 'تنظيف', query: 'cleaning ebay', count: 52, bgColor: '#B8FFCC' },
      ]},
      { icon: '🚗', label: 'السيارات', query: 'automotive', subcategories: [
        { icon: '🔧', label: 'قطع غيار', query: 'car parts ebay', count: 234, bgColor: '#E8D5B8' },
        { icon: '🚘', label: 'إكسسوار', query: 'car accessories ebay', count: 145, bgColor: '#FFE0C8' },
        { icon: '🛞', label: 'إطارات', query: 'tires ebay', count: 78, bgColor: '#D4CAFF' },
        { icon: '⚽', label: 'رياضة', query: 'sports ebay', count: 65, bgColor: '#C8FFE0' },
      ]},
      { icon: '💎', label: 'مقتنيات', query: 'collectibles', subcategories: [
        { icon: '🪙', label: 'عملات', query: 'coins ebay', count: 312, bgColor: '#FFE566' },
        { icon: '🖼', label: 'فن', query: 'art collectibles ebay', count: 98, bgColor: '#FFB8D4' },
        { icon: '📦', label: 'نادر', query: 'rare items ebay', count: 56, bgColor: '#E8D5B8' },
        { icon: '🧸', label: 'ألعاب', query: 'toys ebay', count: 145, bgColor: '#FFE566' },
      ]},
    ],
    featured: [
      { label: 'الأكثر مبيعاً', query: 'best sellers ebay' },
      { label: 'عروض اليوم', query: 'deals today ebay' },
      { label: 'منتجات جديدة', query: 'brand new ebay' },
    ],
  },
  walmart: {
    label: 'Walmart', bg: '#0071DC', headerText: '#fff', accentColor: '#0071DC',
    categories: [
      { icon: '🛒', label: 'بقالة', query: 'grocery food', subcategories: [
        { icon: '🥩', label: 'لحوم', query: 'meat walmart', count: 145, bgColor: '#FFE566' },
        { icon: '🥦', label: 'خضروات', query: 'vegetables walmart', count: 98, bgColor: '#C8FFE0' },
        { icon: '🥛', label: 'ألبان', query: 'dairy walmart', count: 67, bgColor: '#C8E8FF' },
        { icon: '🍞', label: 'مخبوزات', query: 'bakery walmart', count: 54, bgColor: '#FFE0C8' },
      ]},
      { icon: '📱', label: 'إلكترونيات', query: 'electronics', subcategories: [
        { icon: '📺', label: 'تلفزيونات', query: 'televisions walmart', count: 88, bgColor: '#FFE566' },
        { icon: '💻', label: 'لابتوب', query: 'laptops walmart', count: 65, bgColor: '#D4CAFF' },
        { icon: '📱', label: 'جوالات', query: 'smartphones walmart', count: 120, bgColor: '#FFB8C8' },
        { icon: '🎧', label: 'سماعات', query: 'headphones walmart', count: 55, bgColor: '#C8E8FF' },
      ]},
      { icon: '🏠', label: 'المنزل', query: 'home furniture', subcategories: [
        { icon: '🛋', label: 'أثاث', query: 'furniture walmart', count: 112, bgColor: '#C8E8FF' },
        { icon: '🍳', label: 'مطبخ', query: 'kitchen walmart', count: 87, bgColor: '#FFE566' },
        { icon: '🛏', label: 'غرف نوم', query: 'bedroom walmart', count: 76, bgColor: '#FFB8D4' },
        { icon: '🧹', label: 'تنظيف', query: 'cleaning walmart', count: 63, bgColor: '#C8FFE0' },
      ]},
      { icon: '👗', label: 'ملابس', query: 'clothing', subcategories: [
        { icon: '👔', label: 'رجالي', query: 'mens walmart', count: 198, bgColor: '#C8E8FF' },
        { icon: '👗', label: 'نسائي', query: 'womens walmart', count: 167, bgColor: '#FFB8D4' },
        { icon: '👦', label: 'أطفال', query: 'kids clothing walmart', count: 143, bgColor: '#FFE566' },
        { icon: '🧸', label: 'ألعاب', query: 'toys walmart', count: 134, bgColor: '#FFE0C8' },
      ]},
      { icon: '🚗', label: 'السيارات', query: 'automotive', subcategories: [
        { icon: '🔧', label: 'قطع غيار', query: 'auto parts walmart', count: 187, bgColor: '#E8D5B8' },
        { icon: '🛞', label: 'إطارات', query: 'tires walmart', count: 65, bgColor: '#FFE0C8' },
        { icon: '🚘', label: 'إكسسوار', query: 'car accessories walmart', count: 112, bgColor: '#D4CAFF' },
        { icon: '💊', label: 'صحة', query: 'vitamins walmart', count: 145, bgColor: '#C8FFE0' },
      ]},
    ],
    featured: [
      { label: 'تخفيضات اليوم', query: 'rollback walmart' },
      { label: 'الأكثر شعبية', query: 'popular walmart' },
      { label: 'منتجات مميزة', query: 'featured walmart' },
    ],
  },
  taobao: {
    label: 'Taobao', bg: '#FF4400', headerText: '#fff', accentColor: '#FF4400',
    categories: [
      { icon: '👗', label: 'ملابس', query: '服装', subcategories: [
        { icon: '👔', label: 'رجالي', query: '男装', count: 345, bgColor: '#C8E8FF' },
        { icon: '👗', label: 'نسائي', query: '女装', count: 456, bgColor: '#FFB8D4' },
        { icon: '👟', label: 'أحذية', query: '鞋子', count: 234, bgColor: '#FFE566' },
        { icon: '👜', label: 'حقائب', query: '包包', count: 178, bgColor: '#D4CAFF' },
      ]},
      { icon: '📱', label: 'إلكترونيات', query: '电子产品', subcategories: [
        { icon: '📱', label: 'جوالات', query: '手机', count: 234, bgColor: '#FFB8C8' },
        { icon: '💻', label: 'لابتوب', query: '笔记本电脑', count: 98, bgColor: '#D4CAFF' },
        { icon: '🎧', label: 'سماعات', query: '耳机', count: 145, bgColor: '#C8E8FF' },
        { icon: '📷', label: 'كاميرا', query: '相机', count: 67, bgColor: '#FFB8D4' },
      ]},
      { icon: '🏠', label: 'المنزل', query: '家居', subcategories: [
        { icon: '🛋', label: 'أثاث', query: '家具', count: 189, bgColor: '#C8E8FF' },
        { icon: '🍳', label: 'مطبخ', query: '厨具', count: 145, bgColor: '#FFE566' },
        { icon: '🖼', label: 'ديكور', query: '家居装饰', count: 234, bgColor: '#FFB8D4' },
        { icon: '💄', label: 'جمال', query: '美妆护肤', count: 267, bgColor: '#FFB8D4' },
      ]},
      { icon: '⚽', label: 'رياضة', query: '运动户外', subcategories: [
        { icon: '🏋', label: 'لياقة', query: '健身器材', count: 156, bgColor: '#FFE566' },
        { icon: '🚴', label: 'دراجات', query: '自行车', count: 78, bgColor: '#FFE0C8' },
        { icon: '⚽', label: 'كرة', query: '足球', count: 65, bgColor: '#C8FFE0' },
        { icon: '🧸', label: 'ألعاب', query: '玩具', count: 198, bgColor: '#FFE566' },
      ]},
      { icon: '💍', label: 'مجوهرات', query: '珠宝首饰', subcategories: [
        { icon: '💍', label: 'خواتم', query: '戒指', count: 145, bgColor: '#FFE566' },
        { icon: '📿', label: 'قلادات', query: '项链', count: 123, bgColor: '#D4CAFF' },
        { icon: '💎', label: 'أساور', query: '手链', count: 98, bgColor: '#FFB8D4' },
        { icon: '👟', label: 'رياضي', query: '运动鞋', count: 267, bgColor: '#C8E8FF' },
      ]},
    ],
    featured: [
      { label: 'الأكثر مبيعاً', query: '热销' },
      { label: 'وصل حديثاً', query: '新品' },
      { label: 'عروض خاصة', query: '特卖优惠' },
    ],
  },
  '1688': {
    label: '1688', bg: '#E02020', headerText: '#fff', accentColor: '#E02020',
    categories: [
      { icon: '👗', label: 'ملابس بالجملة', query: '服装批发', subcategories: [
        { icon: '👔', label: 'رجالي', query: '男装批发', count: 567, bgColor: '#C8E8FF' },
        { icon: '👗', label: 'نسائي', query: '女装批发', count: 789, bgColor: '#FFB8D4' },
        { icon: '👟', label: 'أحذية', query: '鞋子批发', count: 345, bgColor: '#FFE566' },
        { icon: '👶', label: 'أطفال', query: '童装批发', count: 234, bgColor: '#B8FFCC' },
      ]},
      { icon: '📱', label: 'إلكترونيات', query: '电子数码批发', subcategories: [
        { icon: '📱', label: 'جوالات', query: '手机批发', count: 312, bgColor: '#FFB8C8' },
        { icon: '💻', label: 'لابتوب', query: '电脑批发', count: 145, bgColor: '#D4CAFF' },
        { icon: '🔌', label: 'إكسسوار', query: '数码配件', count: 456, bgColor: '#E8D5B8' },
        { icon: '🏠', label: 'منزل', query: '家居用品批发', count: 234, bgColor: '#C8E8FF' },
      ]},
      { icon: '💄', label: 'مستحضرات', query: '美妆用品批发', subcategories: [
        { icon: '💋', label: 'مكياج', query: '彩妆批发', count: 345, bgColor: '#FFB8D4' },
        { icon: '🧴', label: 'عناية', query: '护肤品批发', count: 456, bgColor: '#C8E8FF' },
        { icon: '🌸', label: 'عطور', query: '香水批发', count: 123, bgColor: '#D4CAFF' },
        { icon: '🧵', label: 'نسيج', query: '布料面料', count: 678, bgColor: '#FFE0C8' },
      ]},
      { icon: '🔧', label: 'أدوات', query: '五金工具批发', subcategories: [
        { icon: '🔧', label: 'يدوية', query: '手工具批发', count: 234, bgColor: '#E8D5B8' },
        { icon: '⚙️', label: 'كهربائية', query: '电动工具批发', count: 178, bgColor: '#C8E8FF' },
        { icon: '🔩', label: 'تجهيزات', query: '五金配件批发', count: 456, bgColor: '#FFE0C8' },
        { icon: '🧸', label: 'ألعاب', query: '玩具批发', count: 345, bgColor: '#FFE566' },
      ]},
      { icon: '🍵', label: 'أغذية', query: '食品批发', subcategories: [
        { icon: '🍵', label: 'شاي', query: '茶叶批发', count: 234, bgColor: '#C8FFE0' },
        { icon: '🍫', label: 'حلوى', query: '零食批发', count: 312, bgColor: '#FFE566' },
        { icon: '🌾', label: 'حبوب', query: '粮食批发', count: 145, bgColor: '#E8D5B8' },
        { icon: '🏭', label: 'مصنع', query: '厂家直销', count: 890, bgColor: '#FFE0C8' },
      ]},
    ],
    featured: [
      { label: 'أسعار المصنع', query: '厂家直销' },
      { label: 'طلبات كبيرة', query: '大批量' },
      { label: 'منتجات رائجة', query: '热门商品' },
    ],
  },
  temu: {
    label: 'Temu', bg: '#FF6600', headerText: '#fff', accentColor: '#FF6600',
    categories: [
      { icon: '👗', label: 'ملابس', query: 'clothing temu', subcategories: [
        { icon: '👔', label: 'رجالي', query: 'mens clothing temu', count: 289, bgColor: '#C8E8FF' },
        { icon: '👗', label: 'نسائي', query: 'womens clothing temu', count: 345, bgColor: '#FFB8D4' },
        { icon: '👶', label: 'أطفال', query: 'kids clothing temu', count: 178, bgColor: '#FFE566' },
        { icon: '👟', label: 'أحذية', query: 'shoes temu', count: 234, bgColor: '#C8FFE0' },
      ]},
      { icon: '📱', label: 'إلكترونيات', query: 'electronics temu', subcategories: [
        { icon: '🎧', label: 'سماعات', query: 'headphones temu', count: 145, bgColor: '#C8E8FF' },
        { icon: '🔌', label: 'إكسسوار', query: 'phone accessories temu', count: 267, bgColor: '#E8D5B8' },
        { icon: '⌚', label: 'ساعات', query: 'smartwatches temu', count: 89, bgColor: '#B8FFCC' },
        { icon: '💡', label: 'إضاءة', query: 'lighting temu', count: 145, bgColor: '#FFE0C8' },
      ]},
      { icon: '🏠', label: 'المنزل', query: 'home decor temu', subcategories: [
        { icon: '🖼', label: 'ديكور', query: 'home decor temu', count: 312, bgColor: '#FFB8D4' },
        { icon: '🍳', label: 'مطبخ', query: 'kitchen temu', count: 198, bgColor: '#FFE566' },
        { icon: '🛋', label: 'أثاث', query: 'furniture temu', count: 134, bgColor: '#C8E8FF' },
        { icon: '🌱', label: 'حديقة', query: 'garden temu', count: 89, bgColor: '#C8FFE0' },
      ]},
      { icon: '💄', label: 'جمال', query: 'beauty temu', subcategories: [
        { icon: '💋', label: 'مكياج', query: 'makeup temu', count: 234, bgColor: '#FFB8D4' },
        { icon: '🧴', label: 'عناية', query: 'skincare temu', count: 189, bgColor: '#C8E8FF' },
        { icon: '💆', label: 'شعر', query: 'hair care temu', count: 123, bgColor: '#FFE566' },
        { icon: '🎒', label: 'حقائب', query: 'bags temu', count: 145, bgColor: '#D4CAFF' },
      ]},
      { icon: '⚽', label: 'رياضة', query: 'sports temu', subcategories: [
        { icon: '🏋', label: 'لياقة', query: 'fitness temu', count: 156, bgColor: '#C8FFE0' },
        { icon: '🧘', label: 'يوغا', query: 'yoga temu', count: 89, bgColor: '#D4CAFF' },
        { icon: '🚴', label: 'دراجات', query: 'cycling temu', count: 67, bgColor: '#FFE0C8' },
        { icon: '🧸', label: 'ألعاب', query: 'toys temu', count: 198, bgColor: '#FFE566' },
      ]},
    ],
    featured: [
      { label: 'أرخص الأسعار', query: 'cheap deals temu' },
      { label: 'الأكثر شعبية', query: 'popular temu' },
      { label: 'وصل حديثاً', query: 'new arrivals temu' },
    ],
  },
  iherb: {
    label: 'iHerb', bg: '#0F7D3B', headerText: '#fff', accentColor: '#0F7D3B',
    categories: [
      { icon: '💊', label: 'فيتامينات', query: 'vitamins supplements iherb', subcategories: [
        { icon: '☀️', label: 'فيتامين D', query: 'vitamin d iherb', count: 134, bgColor: '#FFE566' },
        { icon: '🍊', label: 'فيتامين C', query: 'vitamin c iherb', count: 178, bgColor: '#FFE0C8' },
        { icon: '🅱️', label: 'فيتامين B', query: 'vitamin b iherb', count: 145, bgColor: '#C8E8FF' },
        { icon: '🌿', label: 'مكملات', query: 'multivitamins iherb', count: 234, bgColor: '#C8FFE0' },
      ]},
      { icon: '🥛', label: 'بروتين', query: 'protein powder iherb', subcategories: [
        { icon: '🥛', label: 'واي', query: 'whey protein iherb', count: 167, bgColor: '#C8E8FF' },
        { icon: '🌱', label: 'نباتي', query: 'plant protein iherb', count: 98, bgColor: '#C8FFE0' },
        { icon: '🏋', label: 'كرياتين', query: 'creatine iherb', count: 78, bgColor: '#FFE566' },
        { icon: '🌿', label: 'أعشاب', query: 'herbal iherb', count: 234, bgColor: '#C8FFE0' },
      ]},
      { icon: '💄', label: 'جمال طبيعي', query: 'natural beauty iherb', subcategories: [
        { icon: '🧴', label: 'عناية', query: 'natural skincare iherb', count: 178, bgColor: '#FFB8D4' },
        { icon: '💆', label: 'شعر', query: 'natural hair care iherb', count: 123, bgColor: '#C8E8FF' },
        { icon: '🪥', label: 'فم', query: 'oral care iherb', count: 67, bgColor: '#C8FFE0' },
        { icon: '🌸', label: 'عطور', query: 'natural fragrance iherb', count: 56, bgColor: '#D4CAFF' },
      ]},
      { icon: '🥗', label: 'أغذية صحية', query: 'healthy food iherb', subcategories: [
        { icon: '🥜', label: 'مكسرات', query: 'nuts seeds iherb', count: 145, bgColor: '#E8D5B8' },
        { icon: '🫐', label: 'سوبرفود', query: 'superfood iherb', count: 98, bgColor: '#D4CAFF' },
        { icon: '🍫', label: 'خالي سكر', query: 'sugar free iherb', count: 78, bgColor: '#FFE566' },
        { icon: '😴', label: 'نوم', query: 'sleep iherb', count: 134, bgColor: '#D4CAFF' },
      ]},
      { icon: '🧘', label: 'صحة عامة', query: 'health wellness iherb', subcategories: [
        { icon: '🧠', label: 'دماغ', query: 'brain health iherb', count: 98, bgColor: '#C8E8FF' },
        { icon: '❤️', label: 'قلب', query: 'heart health iherb', count: 112, bgColor: '#FFB8D4' },
        { icon: '🦴', label: 'عظام', query: 'bone health iherb', count: 89, bgColor: '#FFE566' },
        { icon: '💊', label: 'أطفال', query: 'kids vitamins iherb', count: 89, bgColor: '#FFE566' },
      ]},
    ],
    featured: [
      { label: 'الأكثر مبيعاً', query: 'best sellers iherb' },
      { label: 'منتجات عضوية', query: 'organic iherb' },
      { label: 'عروض اليوم', query: 'sale iherb' },
    ],
  },
};

// ─── Generic Store component ──────────────────────────────────────────────────
function GenericStore({
  cfg,
  platform,
  onSearch,
}: {
  cfg: typeof STORE_CONFIG[string];
  platform: string;
  onSearch: (query: string) => void;
}) {
  const { width } = useWindowDimensions();
  const [selectedCategoryIndex, setSelectedCategoryIndex] = useState<number>(0);
  const subCardWidth = (width - 12 * 2 - 10) / 2;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 30 }}
    >
      {/* Featured quick-access cards */}
      <View style={{ paddingTop: 20, marginBottom: 4 }}>
        <Text style={{ color: '#999', fontSize: 11, fontWeight: '700', letterSpacing: 1.4, marginBottom: 12, paddingHorizontal: 16 }}>
          الأقسام المميزة
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: 16, paddingRight: 8, gap: 10 }}>
          {cfg.featured.map((f) => (
            <Pressable
              key={f.query}
              onPress={() => onSearch(f.query)}
              style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
            >
              <LinearGradient
                colors={[cfg.accentColor, cfg.accentColor + 'CC']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={{ width: 180, height: 80, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, justifyContent: 'space-between' }}
              >
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>{f.label}</Text>
                <View style={{ alignItems: 'flex-end' }}>
                  <ChevronRight size={16} color="#fff" strokeWidth={2.5} />
                </View>
              </LinearGradient>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Categories */}
      <View style={{ marginTop: 20 }}>
        <Text style={{ color: '#999', fontSize: 11, fontWeight: '700', letterSpacing: 1.4, marginBottom: 12, paddingHorizontal: 16 }}>
          الفئات
        </Text>

        {/* Category tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 4 }}>
          {cfg.categories.map((cat, index) => {
            const isActive = selectedCategoryIndex === index;
            return (
              <Pressable
                key={cat.query}
                onPress={() => setSelectedCategoryIndex(index)}
                style={{ alignItems: 'center', paddingHorizontal: 8, width: 76 }}
              >
                <View style={{
                  width: 58, height: 58, borderRadius: 29, overflow: 'hidden',
                  borderWidth: isActive ? 2.5 : 2,
                  borderColor: isActive ? cfg.accentColor : '#e8e8e8',
                }}>
                  <Image
                    source={{ uri: getCategoryImage(cat.query, cat.label) }}
                    style={{ width: 58, height: 58 }}
                    resizeMode="cover"
                  />
                </View>
                <Text style={{
                  fontSize: 10, marginTop: 5, textAlign: 'center',
                  fontWeight: isActive ? '700' : '500',
                  color: isActive ? cfg.accentColor : '#555',
                  lineHeight: 13,
                }} numberOfLines={2}>
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={{ height: 1, backgroundColor: '#f0f0f0', marginTop: 12, marginBottom: 4 }} />

        {/* Subcategory grid */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 12 }}>
          {cfg.categories[selectedCategoryIndex]?.subcategories?.map((sub) => {
            const isDark = sub.bgColor === '#2D2D3A';
            return (
              <Pressable
                key={sub.query}
                onPress={() => onSearch(sub.query)}
                style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1, width: subCardWidth })}
              >
                <View style={{ borderRadius: 14, overflow: 'hidden', position: 'relative' }}>
                  <Image
                    source={{ uri: getCategoryImage(sub.query, sub.label) }}
                    style={{ width: subCardWidth, height: 100 }}
                    resizeMode="cover"
                  />
                  <View style={{ position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#333' }}>{sub.count}</Text>
                  </View>
                  <View style={{ backgroundColor: sub.bgColor, paddingVertical: 8 }}>
                    <Text style={{ textAlign: 'center', fontSize: 12, fontWeight: '600', color: isDark ? '#fff' : '#333' }} numberOfLines={1}>
                      {sub.icon} {sub.label}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

// ─── eBay Store ───────────────────────────────────────────────────────────────

const EBAY_DEALS = [
  { id: '1', label: 'آيفون 14', discount: '35%', type: 'Buy It Now', image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=200&fit=crop', price: '$349' },
  { id: '2', label: 'لابتوب Dell', discount: '42%', type: 'Auction', image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=200&fit=crop', price: '$289' },
  { id: '3', label: 'سماعات Sony', discount: '60%', type: 'Buy It Now', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&fit=crop', price: '$79' },
  { id: '4', label: 'ساعة ذكية', discount: '28%', type: 'Buy It Now', image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&fit=crop', price: '$129' },
  { id: '5', label: 'كاميرا Canon', discount: '33%', type: 'Auction', image: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=200&fit=crop', price: '$399' },
];

const EBAY_CATEGORIES = [
  { label: 'إلكترونيات', color: '#0064D2', query: 'electronics ebay' },
  { label: 'أزياء', color: '#E53238', query: 'fashion ebay' },
  { label: 'منزل وحديقة', color: '#86B817', query: 'home garden ebay' },
  { label: 'سيارات', color: '#555555', query: 'automotive ebay' },
  { label: 'رياضة', color: '#FF6600', query: 'sports ebay' },
  { label: 'مقتنيات', color: '#F5AF02', query: 'collectibles ebay' },
  { label: 'كتب', color: '#8B44AC', query: 'books ebay' },
  { label: 'ألعاب', color: '#CC0000', query: 'toys ebay' },
];

function EbayStore({ onSearch }: { onSearch: (query: string) => void }) {
  const { width } = useWindowDimensions();
  const catCardW = (width - 12 * 2 - 8) / 2;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 30 }}
      style={{ backgroundColor: '#F3F3F3' }}
    >
      {/* Daily Deals banner */}
      <View style={{ backgroundColor: '#191919', paddingVertical: 16, paddingHorizontal: 14, marginBottom: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800' }}>صفقات اليوم</Text>
          <View style={{ backgroundColor: '#E53238', borderRadius: 4, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>وفّر حتى 70%</Text>
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 10 }}>
          {EBAY_DEALS.map((deal) => (
            <Pressable
              key={deal.id}
              testID={`ebay-deal-${deal.id}`}
              onPress={() => onSearch(deal.label)}
              style={({ pressed }) => ({
                width: 130, backgroundColor: '#FFFFFF', borderRadius: 6,
                overflow: 'hidden', opacity: pressed ? 0.85 : 1,
              })}
            >
              <View style={{ position: 'relative' }}>
                <Image source={{ uri: deal.image }} style={{ width: 130, height: 110 }} resizeMode="cover" />
                <View style={{ position: 'absolute', top: 6, left: 6, backgroundColor: '#E53238', borderRadius: 3, paddingHorizontal: 5, paddingVertical: 2 }}>
                  <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '800' }}>-{deal.discount}</Text>
                </View>
              </View>
              <View style={{ padding: 8 }}>
                <Text style={{ color: '#0064D2', fontSize: 13, fontWeight: '700' }}>{deal.price}</Text>
                <Text style={{ color: '#333', fontSize: 10, marginTop: 2 }} numberOfLines={1}>{deal.label}</Text>
                <View style={{ marginTop: 4, backgroundColor: deal.type === 'Auction' ? '#FF6600' : '#86B817', borderRadius: 3, paddingHorizontal: 5, paddingVertical: 2, alignSelf: 'flex-start' }}>
                  <Text style={{ color: '#FFF', fontSize: 9, fontWeight: '700' }}>{deal.type}</Text>
                </View>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Browse by Category */}
      <View style={{ backgroundColor: '#FFFFFF', marginTop: 8, padding: 14 }}>
        <Text style={{ color: '#191919', fontSize: 17, fontWeight: '700', marginBottom: 12 }}>تصفح حسب الفئة</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {EBAY_CATEGORIES.map((cat) => (
            <Pressable
              key={cat.query}
              testID={`ebay-cat-${cat.query}`}
              onPress={() => onSearch(cat.query)}
              style={({ pressed }) => ({
                width: catCardW, backgroundColor: '#FFF',
                borderRadius: 8, borderWidth: 1.5, borderColor: cat.color,
                paddingVertical: 14, alignItems: 'center', justifyContent: 'center',
                opacity: pressed ? 0.75 : 1,
              })}
            >
              <Text style={{ color: cat.color, fontSize: 13, fontWeight: '700', textAlign: 'center' }}>{cat.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Most Watched */}
      <View style={{ backgroundColor: '#FFFFFF', marginTop: 8, paddingVertical: 14, paddingHorizontal: 14 }}>
        <Text style={{ color: '#191919', fontSize: 17, fontWeight: '700', marginBottom: 10 }}>الأكثر مشاهدة</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8 }}>
          {['إلكترونيات', 'فينتاج', 'أحذية رياضية', 'أجهزة ألعاب', 'ملابس فاخرة', 'ساعات'].map((chip) => (
            <Pressable
              key={chip}
              onPress={() => onSearch(chip + ' ebay')}
              style={({ pressed }) => ({
                paddingHorizontal: 14, paddingVertical: 8,
                borderRadius: 20, borderWidth: 1.5, borderColor: '#0064D2',
                backgroundColor: pressed ? '#0064D2' : '#FFF',
              })}
            >
              <Text style={{ color: '#0064D2', fontSize: 12, fontWeight: '600' }}>{chip}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Popular searches */}
      <View style={{ backgroundColor: '#FFFFFF', marginTop: 8, paddingVertical: 14, paddingHorizontal: 14 }}>
        <Text style={{ color: '#191919', fontSize: 17, fontWeight: '700', marginBottom: 10 }}>الشائع على eBay</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {['electronics', 'vintage watches', 'sneakers', 'gaming consoles', 'luxury bags', 'rare coins', 'trading cards', 'cameras'].map((chip) => (
            <Pressable
              key={chip}
              onPress={() => onSearch(chip + ' ebay')}
              style={({ pressed }) => ({
                paddingHorizontal: 12, paddingVertical: 7,
                borderRadius: 16, backgroundColor: pressed ? '#E8E8E8' : '#F3F3F3',
                borderWidth: 1, borderColor: '#DDDDDD',
              })}
            >
              <Text style={{ color: '#191919', fontSize: 12 }}>{chip}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

// ─── Walmart Store ────────────────────────────────────────────────────────────

const WALMART_DEPARTMENTS = [
  { id: 'grocery', label: 'بقالة', query: 'grocery food', subcategories: [
    { label: 'طازج', query: 'fresh produce walmart' },
    { label: 'مشروبات', query: 'beverages walmart' },
    { label: 'مجمد', query: 'frozen food walmart' },
    { label: 'وجبات خفيفة', query: 'snacks walmart' },
  ]},
  { id: 'electronics', label: 'إلكترونيات', query: 'electronics', subcategories: [
    { label: 'تلفزيونات', query: 'televisions walmart' },
    { label: 'لابتوب', query: 'laptops walmart' },
    { label: 'جوالات', query: 'smartphones walmart' },
    { label: 'ألعاب فيديو', query: 'video games walmart' },
  ]},
  { id: 'clothing', label: 'ملابس', query: 'clothing', subcategories: [
    { label: 'رجالي', query: 'mens walmart' },
    { label: 'نسائي', query: 'womens walmart' },
    { label: 'أطفال', query: 'kids clothing walmart' },
    { label: 'رياضي', query: 'activewear walmart' },
  ]},
  { id: 'home', label: 'المنزل', query: 'home furniture', subcategories: [
    { label: 'أثاث', query: 'furniture walmart' },
    { label: 'مطبخ', query: 'kitchen walmart' },
    { label: 'غرف نوم', query: 'bedroom walmart' },
    { label: 'حمام', query: 'bathroom walmart' },
  ]},
  { id: 'kids', label: 'الأطفال والألعاب', query: 'toys kids', subcategories: [
    { label: 'ألعاب', query: 'toys walmart' },
    { label: 'رضع', query: 'baby walmart' },
    { label: 'مدرسية', query: 'school supplies walmart' },
    { label: 'ملابس أطفال', query: 'kids clothes walmart' },
  ]},
  { id: 'auto', label: 'السيارات', query: 'automotive', subcategories: [
    { label: 'قطع غيار', query: 'auto parts walmart' },
    { label: 'إطارات', query: 'tires walmart' },
    { label: 'إكسسوار', query: 'car accessories walmart' },
    { label: 'زيوت', query: 'motor oil walmart' },
  ]},
  { id: 'health', label: 'الصحة والجمال', query: 'health beauty', subcategories: [
    { label: 'فيتامينات', query: 'vitamins walmart' },
    { label: 'عناية بشرة', query: 'skincare walmart' },
    { label: 'شعر', query: 'hair care walmart' },
    { label: 'أدوية', query: 'pharmacy walmart' },
  ]},
  { id: 'garden', label: 'الحديقة', query: 'garden outdoor', subcategories: [
    { label: 'نباتات', query: 'plants walmart' },
    { label: 'أثاث خارجي', query: 'patio furniture walmart' },
    { label: 'شواء', query: 'grills walmart' },
    { label: 'أدوات', query: 'garden tools walmart' },
  ]},
];

const WALMART_ROLLBACKS = [
  { id: '1', label: 'تلفاز Samsung 55"', oldPrice: '$499', newPrice: '$298', image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f4834a?w=200&fit=crop' },
  { id: '2', label: 'جهاز iPad', oldPrice: '$329', newPrice: '$249', image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=200&fit=crop' },
  { id: '3', label: 'مكنسة Dyson', oldPrice: '$399', newPrice: '$279', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&fit=crop' },
  { id: '4', label: 'كرسي مكتب', oldPrice: '$199', newPrice: '$129', image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=200&fit=crop' },
];

function WalmartStore({ onSearch }: { onSearch: (query: string) => void }) {
  const { width } = useWindowDimensions();
  const panelWidth = (width - 12 * 2 - 8) / 2;

  const walmartDept = WALMART_DEPARTMENTS.map(d => ({
    id: d.id,
    label: d.label,
    query: d.query,
    subcategories: d.subcategories,
  }));

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 30 }}
      style={{ backgroundColor: '#F5F5F5' }}
    >
      {/* Rollback deals banner */}
      <View style={{ backgroundColor: '#FFC220', paddingVertical: 12, paddingHorizontal: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <View>
            <Text style={{ color: '#0071DC', fontSize: 18, fontWeight: '800' }}>تخفيضات الأسعار</Text>
            <Text style={{ color: '#0071DC', fontSize: 12, marginTop: 2 }}>Rollback - وفّر الآن</Text>
          </View>
          <Pressable onPress={() => onSearch('rollback walmart')} style={{ backgroundColor: '#0071DC', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 }}>
            <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>عرض الكل</Text>
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 10 }}>
          {WALMART_ROLLBACKS.map((item) => (
            <Pressable
              key={item.id}
              testID={`walmart-rollback-${item.id}`}
              onPress={() => onSearch(item.label)}
              style={({ pressed }) => ({
                width: 140, backgroundColor: '#FFFFFF', borderRadius: 8,
                overflow: 'hidden', opacity: pressed ? 0.85 : 1,
              })}
            >
              <Image source={{ uri: item.image }} style={{ width: 140, height: 110 }} resizeMode="cover" />
              <View style={{ position: 'absolute', top: 6, left: 6, backgroundColor: '#FFC220', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                <Text style={{ color: '#0071DC', fontSize: 9, fontWeight: '800' }}>Rollback</Text>
              </View>
              <View style={{ padding: 8 }}>
                <Text style={{ color: '#333', fontSize: 10 }} numberOfLines={2}>{item.label}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <Text style={{ color: '#0071DC', fontSize: 14, fontWeight: '800' }}>{item.newPrice}</Text>
                  <Text style={{ color: '#999', fontSize: 10, textDecorationLine: 'line-through' }}>{item.oldPrice}</Text>
                </View>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Walmart+ promo strip */}
      <Pressable style={{ marginTop: 0 }}>
        <LinearGradient
          colors={['#0071DC', '#004C97']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={{ paddingHorizontal: 20, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <View>
            <Text style={{ color: '#FFC220', fontSize: 18, fontWeight: '900' }}>Walmart+</Text>
            <Text style={{ color: '#FFFFFF', fontSize: 12, marginTop: 2 }}>شحن مجاني وعروض حصرية</Text>
          </View>
          <View style={{ backgroundColor: '#FFC220', borderRadius: 6, paddingHorizontal: 14, paddingVertical: 8 }}>
            <Text style={{ color: '#0071DC', fontSize: 13, fontWeight: '700' }}>جرّب مجاناً</Text>
          </View>
        </LinearGradient>
      </Pressable>

      {/* Department Panels */}
      <View style={{ backgroundColor: '#F5F5F5', marginTop: 8, paddingTop: 14 }}>
        <Text style={{ color: '#0F1111', fontSize: 18, fontWeight: '700', paddingHorizontal: 14, marginBottom: 12 }}>تسوّق حسب الفئة</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8 }}>
          {walmartDept.map((dept) => (
            <DepartmentPanel
              key={dept.id}
              dept={dept}
              width={panelWidth}
              onCategoryPress={onSearch}
            />
          ))}
        </View>
      </View>

      {/* Popular searches */}
      <View style={{ backgroundColor: '#FFFFFF', marginTop: 8, paddingVertical: 14, paddingHorizontal: 14 }}>
        <Text style={{ color: '#0F1111', fontSize: 17, fontWeight: '700', marginBottom: 10 }}>بحث شائع</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {['grocery delivery', 'TV deals', 'school supplies', 'baby items', 'vitamins', 'tires', 'outdoor furniture', 'gaming'].map((chip) => (
            <Pressable
              key={chip}
              onPress={() => onSearch(chip + ' walmart')}
              style={({ pressed }) => ({
                paddingHorizontal: 12, paddingVertical: 7,
                borderRadius: 16, backgroundColor: pressed ? '#E8EEF7' : '#F3F3F3',
                borderWidth: 1, borderColor: '#DDDDDD',
              })}
            >
              <Text style={{ color: '#0071DC', fontSize: 12, fontWeight: '500' }}>{chip}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

// ─── Taobao Store ─────────────────────────────────────────────────────────────

const TAOBAO_CATEGORIES_GRID = [
  { label: 'ملابس نسائي', query: '女装', img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&fit=crop' },
  { label: 'ملابس رجالي', query: '男装', img: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=200&fit=crop' },
  { label: 'أحذية', query: '鞋子', img: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&fit=crop' },
  { label: 'حقائب', query: '包包', img: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=200&fit=crop' },
  { label: 'إلكترونيات', query: '电子产品', img: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=200&fit=crop' },
  { label: 'مكياج', query: '彩妆', img: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=200&fit=crop' },
  { label: 'عناية', query: '护肤品', img: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=200&fit=crop' },
  { label: 'عطور', query: '香水', img: 'https://images.unsplash.com/photo-1541643600914-78b084683702?w=200&fit=crop' },
  { label: 'منزل', query: '家居', img: 'https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=200&fit=crop' },
  { label: 'مطبخ', query: '厨具', img: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=200&fit=crop' },
  { label: 'رياضة', query: '运动', img: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=200&fit=crop' },
  { label: 'ألعاب', query: '玩具', img: 'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=200&fit=crop' },
];

const TAOBAO_SALE_ITEMS = [
  { id: '1', label: 'فستان صيفي', pct: '65%', img: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=200&fit=crop', price: '¥89' },
  { id: '2', label: 'حذاء رياضي', pct: '50%', img: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&fit=crop', price: '¥129' },
  { id: '3', label: 'حقيبة جلد', pct: '40%', img: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=200&fit=crop', price: '¥199' },
  { id: '4', label: 'سماعة بلوتوث', pct: '55%', img: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&fit=crop', price: '¥159' },
  { id: '5', label: 'ساعة عصرية', pct: '70%', img: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&fit=crop', price: '¥99' },
];

const TAOBAO_LIVE_SESSIONS = [
  { id: '1', title: 'موضة النساء', viewers: '12.4K', color: '#FF5000' },
  { id: '2', title: 'إلكترونيات', viewers: '8.7K', color: '#CC0000' },
  { id: '3', title: 'مكياج وجمال', viewers: '15.2K', color: '#E91E8C' },
  { id: '4', title: 'رياضة ولياقة', viewers: '5.3K', color: '#FF6600' },
];

function TaobaoStore({ onSearch }: { onSearch: (query: string) => void }) {
  const { width } = useWindowDimensions();
  const catItemW = (width - 12 * 2) / 4 - 4;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 30 }}
      style={{ backgroundColor: '#F7F7F7' }}
    >
      {/* Flash Sale */}
      <View style={{ backgroundColor: '#FF0036', paddingVertical: 14, paddingHorizontal: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '800' }}>تخفيضات مؤقتة</Text>
          <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
            {['02', '45', '30'].map((seg, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ backgroundColor: '#FFFFFF', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                  <Text style={{ color: '#FF0036', fontSize: 14, fontWeight: '800' }}>{seg}</Text>
                </View>
                {i < 2 ? <Text style={{ color: '#FFF', fontWeight: '800', marginHorizontal: 2 }}>:</Text> : null}
              </View>
            ))}
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 10 }}>
          {TAOBAO_SALE_ITEMS.map((item) => (
            <Pressable
              key={item.id}
              testID={`taobao-sale-${item.id}`}
              onPress={() => onSearch(item.label)}
              style={({ pressed }) => ({
                width: 120, backgroundColor: '#FFFFFF', borderRadius: 8,
                overflow: 'hidden', opacity: pressed ? 0.85 : 1,
              })}
            >
              <Image source={{ uri: item.img }} style={{ width: 120, height: 100 }} resizeMode="cover" />
              <View style={{ position: 'absolute', top: 6, right: 6, backgroundColor: '#FF0036', borderRadius: 3, paddingHorizontal: 5, paddingVertical: 2 }}>
                <Text style={{ color: '#FFF', fontSize: 9, fontWeight: '800' }}>-{item.pct}</Text>
              </View>
              <View style={{ padding: 6 }}>
                <Text style={{ color: '#FF0036', fontSize: 13, fontWeight: '700' }}>{item.price}</Text>
                <Text style={{ color: '#333', fontSize: 10 }} numberOfLines={1}>{item.label}</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* LIVE streaming row */}
      <View style={{ backgroundColor: '#FFFFFF', marginTop: 8, paddingVertical: 14, paddingHorizontal: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <View style={{ backgroundColor: '#FF0036', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 3 }}>
            <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '800' }}>LIVE</Text>
          </View>
          <Text style={{ color: '#191919', fontSize: 16, fontWeight: '700' }}>مباشر الآن</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 10 }}>
          {TAOBAO_LIVE_SESSIONS.map((session) => (
            <Pressable
              key={session.id}
              testID={`taobao-live-${session.id}`}
              onPress={() => onSearch(session.title)}
              style={({ pressed }) => ({
                width: 110, borderRadius: 10, overflow: 'hidden', opacity: pressed ? 0.85 : 1,
              })}
            >
              <View style={{ backgroundColor: session.color, height: 85, alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ backgroundColor: '#FF0036', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2, marginBottom: 6 }}>
                  <Text style={{ color: '#FFF', fontSize: 9, fontWeight: '800' }}>LIVE</Text>
                </View>
                <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '700', textAlign: 'center' }}>{session.title}</Text>
              </View>
              <View style={{ backgroundColor: '#F5F5F5', paddingVertical: 5, alignItems: 'center' }}>
                <Text style={{ color: '#FF5000', fontSize: 10, fontWeight: '600' }}>{session.viewers} مشاهد</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Category icon grid */}
      <View style={{ backgroundColor: '#FFFFFF', marginTop: 8, paddingVertical: 14, paddingHorizontal: 12 }}>
        <Text style={{ color: '#191919', fontSize: 16, fontWeight: '700', marginBottom: 10, paddingHorizontal: 2 }}>تسوّق حسب الفئة</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {TAOBAO_CATEGORIES_GRID.map((cat) => (
            <Pressable
              key={cat.query}
              testID={`taobao-cat-${cat.query}`}
              onPress={() => onSearch(cat.query)}
              style={({ pressed }) => ({
                width: catItemW, alignItems: 'center', opacity: pressed ? 0.75 : 1,
              })}
            >
              <Image source={{ uri: cat.img }} style={{ width: catItemW, height: catItemW, borderRadius: 8 }} resizeMode="cover" />
              <Text style={{ color: '#333', fontSize: 10, fontWeight: '600', marginTop: 4, textAlign: 'center' }} numberOfLines={1}>
                {cat.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Best sellers horizontal scroll */}
      <View style={{ backgroundColor: '#FFFFFF', marginTop: 8, paddingVertical: 14, paddingHorizontal: 14 }}>
        <Text style={{ color: '#191919', fontSize: 16, fontWeight: '700', marginBottom: 10 }}>الأكثر مبيعاً</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 10 }}>
          {TAOBAO_SALE_ITEMS.slice().reverse().map((item) => (
            <Pressable
              key={'bs-' + item.id}
              onPress={() => onSearch(item.label)}
              style={({ pressed }) => ({
                width: 110, backgroundColor: '#FFF', borderRadius: 8, borderWidth: 1, borderColor: '#EEE',
                overflow: 'hidden', opacity: pressed ? 0.85 : 1,
              })}
            >
              <Image source={{ uri: item.img }} style={{ width: 110, height: 90 }} resizeMode="cover" />
              <View style={{ padding: 6 }}>
                <Text style={{ color: '#FF5000', fontSize: 12, fontWeight: '700' }}>{item.price}</Text>
                <Text style={{ color: '#555', fontSize: 10 }} numberOfLines={1}>{item.label}</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </ScrollView>
  );
}

// ─── 1688 Store ───────────────────────────────────────────────────────────────

const STORE_1688_DEPTS = [
  { id: 'clothes', label: 'ملابس بالجملة', query: '服装批发', subcategories: [
    { label: 'رجالي', query: '男装批发' },
    { label: 'نسائي', query: '女装批发' },
    { label: 'أطفال', query: '童装批发' },
    { label: 'رياضي', query: '运动服批发' },
  ]},
  { id: 'electronics', label: 'إلكترونيات', query: '电子数码批发', subcategories: [
    { label: 'جوالات', query: '手机批发' },
    { label: 'لابتوب', query: '电脑批发' },
    { label: 'إكسسوار', query: '数码配件' },
    { label: 'كاميرات', query: '相机批发' },
  ]},
  { id: 'raw', label: 'مواد خام', query: '原材料批发', subcategories: [
    { label: 'نسيج', query: '布料面料' },
    { label: 'معادن', query: '金属材料' },
    { label: 'بلاستيك', query: '塑料制品' },
    { label: 'خشب', query: '木材批发' },
  ]},
  { id: 'tools', label: 'أدوات', query: '五金工具批发', subcategories: [
    { label: 'يدوية', query: '手工具批发' },
    { label: 'كهربائية', query: '电动工具批发' },
    { label: 'تجهيزات', query: '五金配件批发' },
    { label: 'بناء', query: '建筑材料' },
  ]},
  { id: 'food', label: 'أغذية', query: '食品批发', subcategories: [
    { label: 'شاي', query: '茶叶批发' },
    { label: 'حلوى', query: '零食批发' },
    { label: 'حبوب', query: '粮食批发' },
    { label: 'مأكولات بحر', query: '海鲜批发' },
  ]},
  { id: 'cosmetics', label: 'مستحضرات', query: '美妆用品批发', subcategories: [
    { label: 'مكياج', query: '彩妆批发' },
    { label: 'عناية', query: '护肤品批发' },
    { label: 'عطور', query: '香水批发' },
    { label: 'شعر', query: '发型产品批发' },
  ]},
];

const BULK_PRODUCTS = [
  { id: '1', label: 'تيشيرت قطن', moq: '50 قطعة', price: '$1.20/قطعة', img: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200&fit=crop', verified: true },
  { id: '2', label: 'سماعة بلوتوث', moq: '100 قطعة', price: '$8.50/قطعة', img: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&fit=crop', verified: true },
  { id: '3', label: 'حقيبة قماش', moq: '200 قطعة', price: '$2.30/قطعة', img: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=200&fit=crop', verified: false },
  { id: '4', label: 'أدوات مطبخ', moq: '30 قطعة', price: '$4.80/قطعة', img: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=200&fit=crop', verified: true },
];

const SUPPLIERS = [
  { id: '1', name: 'مصنع غوانغجو للنسيج', products: '2,340', rating: '4.9', verified: true },
  { id: '2', name: 'شنتشن للإلكترونيات', products: '1,876', rating: '4.8', verified: true },
  { id: '3', name: 'يوووو للمواد الخام', products: '987', rating: '4.7', verified: true },
  { id: '4', name: 'فوجيان للأغذية', products: '654', rating: '4.6', verified: false },
];

function Store1688({ onSearch }: { onSearch: (query: string) => void }) {
  const { width } = useWindowDimensions();
  const panelWidth = (width - 12 * 2 - 8) / 2;

  const depts1688 = STORE_1688_DEPTS.map(d => ({
    id: d.id,
    label: d.label,
    query: d.query,
    subcategories: d.subcategories,
  }));

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 30 }}
      style={{ backgroundColor: '#F5F5F5' }}
    >
      {/* B2B Hero */}
      <LinearGradient
        colors={['#E02020', '#A00000']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ paddingVertical: 24, paddingHorizontal: 20 }}
      >
        <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '900', marginBottom: 4 }}>أسعار المصنع المباشرة</Text>
        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, marginBottom: 16 }}>اشترِ بالجملة وتوفّر أكثر</Text>
        <Pressable
          testID="1688-contact-supplier"
          onPress={() => onSearch('supplier 1688')}
          style={{ backgroundColor: '#FF8C00', borderRadius: 6, paddingHorizontal: 20, paddingVertical: 10, alignSelf: 'flex-start' }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>تواصل مع المورد</Text>
        </Pressable>
      </LinearGradient>

      {/* Bulk order products */}
      <View style={{ backgroundColor: '#FFFFFF', marginTop: 8, paddingVertical: 14, paddingHorizontal: 14 }}>
        <Text style={{ color: '#191919', fontSize: 16, fontWeight: '700', marginBottom: 10 }}>الطلبات بالجملة</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 10 }}>
          {BULK_PRODUCTS.map((item) => (
            <Pressable
              key={item.id}
              testID={`1688-bulk-${item.id}`}
              onPress={() => onSearch(item.label)}
              style={({ pressed }) => ({
                width: 150, backgroundColor: '#FFF', borderRadius: 8, borderWidth: 1, borderColor: '#EEE',
                overflow: 'hidden', opacity: pressed ? 0.85 : 1,
              })}
            >
              <Image source={{ uri: item.img }} style={{ width: 150, height: 110 }} resizeMode="cover" />
              <View style={{ padding: 8 }}>
                <Text style={{ color: '#333', fontSize: 11, fontWeight: '600' }} numberOfLines={1}>{item.label}</Text>
                <View style={{ marginTop: 4, backgroundColor: '#FFF3CD', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                  <Text style={{ color: '#856404', fontSize: 9, fontWeight: '700' }}>الحد الأدنى: {item.moq}</Text>
                </View>
                <Text style={{ color: '#E02020', fontSize: 12, fontWeight: '800', marginTop: 4 }}>{item.price}</Text>
                {item.verified ? (
                  <View style={{ marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#28A745', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: '#FFF', fontSize: 7, fontWeight: '800' }}>✓</Text>
                    </View>
                    <Text style={{ color: '#28A745', fontSize: 9, fontWeight: '600' }}>مورد موثق</Text>
                  </View>
                ) : null}
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Department panels */}
      <View style={{ backgroundColor: '#F5F5F5', marginTop: 8, paddingTop: 14 }}>
        <Text style={{ color: '#0F1111', fontSize: 17, fontWeight: '700', paddingHorizontal: 14, marginBottom: 12 }}>الفئات الرئيسية</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8 }}>
          {depts1688.map((dept) => (
            <DepartmentPanel
              key={dept.id}
              dept={dept}
              width={panelWidth}
              onCategoryPress={onSearch}
            />
          ))}
        </View>
      </View>

      {/* Verified suppliers */}
      <View style={{ backgroundColor: '#FFFFFF', marginTop: 8, paddingVertical: 14, paddingHorizontal: 14 }}>
        <Text style={{ color: '#191919', fontSize: 16, fontWeight: '700', marginBottom: 10 }}>موردون موثقون</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 10 }}>
          {SUPPLIERS.map((sup) => (
            <Pressable
              key={sup.id}
              testID={`1688-supplier-${sup.id}`}
              onPress={() => onSearch(sup.name)}
              style={({ pressed }) => ({
                width: 160, backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1, borderColor: '#E0E0E0',
                padding: 12, opacity: pressed ? 0.85 : 1,
              })}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#E02020', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '800' }}>1688</Text>
                </View>
                {sup.verified ? (
                  <View style={{ backgroundColor: '#E8F5E9', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 }}>
                    <Text style={{ color: '#2E7D32', fontSize: 9, fontWeight: '700' }}>موثق</Text>
                  </View>
                ) : null}
              </View>
              <Text style={{ color: '#333', fontSize: 11, fontWeight: '700' }} numberOfLines={2}>{sup.name}</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                <Text style={{ color: '#999', fontSize: 9 }}>{sup.products} منتج</Text>
                <Text style={{ color: '#FF9800', fontSize: 9, fontWeight: '700' }}>{sup.rating} نجمة</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </ScrollView>
  );
}

// ─── Temu Store ───────────────────────────────────────────────────────────────

const TEMU_DEALS = [
  { id: '1', label: 'حقيبة يد عصرية', disc: '-85%', price: '$2.99', img: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=200&fit=crop' },
  { id: '2', label: 'سماعة لاسلكية', disc: '-78%', price: '$4.99', img: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&fit=crop' },
  { id: '3', label: 'إكسسوار شعر', disc: '-92%', price: '$0.99', img: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=200&fit=crop' },
  { id: '4', label: 'ديكور منزلي', disc: '-80%', price: '$1.99', img: 'https://images.unsplash.com/photo-1493770348161-369560ae357d?w=200&fit=crop' },
  { id: '5', label: 'ملابس رياضية', disc: '-76%', price: '$3.49', img: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200&fit=crop' },
  { id: '6', label: 'إكسسوار هاتف', disc: '-88%', price: '$1.49', img: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=200&fit=crop' },
];

const TEMU_PRICE_CATS = [
  { label: 'ملابس', price: 'من $1.99', query: 'clothing temu', color: '#FF6600' },
  { label: 'إكسسوار', price: 'من $0.99', query: 'accessories temu', color: '#E91E8C' },
  { label: 'منزل', price: 'من $2.49', query: 'home temu', color: '#0095DA' },
  { label: 'جمال', price: 'من $1.49', query: 'beauty temu', color: '#9C27B0' },
  { label: 'رياضة', price: 'من $2.99', query: 'sports temu', color: '#4CAF50' },
  { label: 'إلكترونيات', price: 'من $4.99', query: 'electronics temu', color: '#FF9800' },
];

function TemuStore({ onSearch }: { onSearch: (query: string) => void }) {
  const { width } = useWindowDimensions();
  const dealW = (width - 12 * 2 - 8) / 2;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 30 }}
      style={{ backgroundColor: '#1A1A1A' }}
    >
      {/* Flash sale hero */}
      <View style={{ backgroundColor: '#1A1A1A', paddingVertical: 20, paddingHorizontal: 16 }}>
        <Text style={{ color: '#FF6600', fontSize: 22, fontWeight: '900', marginBottom: 4 }}>عروض البرق</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <Text style={{ color: '#FFFFFF', fontSize: 13 }}>ينتهي خلال:</Text>
          {['04', '22', '15'].map((seg, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ backgroundColor: '#FF6600', borderRadius: 4, paddingHorizontal: 7, paddingVertical: 3 }}>
                <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '800' }}>{seg}</Text>
              </View>
              {i < 2 ? <Text style={{ color: '#FF6600', fontWeight: '800', marginHorizontal: 2 }}>:</Text> : null}
            </View>
          ))}
        </View>
        <View style={{ backgroundColor: '#FF6600', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 4, alignSelf: 'flex-start' }}>
          <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '700' }}>وفّر حتى 90%</Text>
        </View>
      </View>

      {/* Deals 2x3 grid */}
      <View style={{ backgroundColor: '#F8F8F8', paddingTop: 12, paddingHorizontal: 12 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {TEMU_DEALS.map((deal) => (
            <Pressable
              key={deal.id}
              testID={`temu-deal-${deal.id}`}
              onPress={() => onSearch(deal.label)}
              style={({ pressed }) => ({
                width: dealW, backgroundColor: '#FFFFFF', borderRadius: 10,
                overflow: 'hidden', opacity: pressed ? 0.85 : 1,
                borderWidth: 1, borderColor: '#EEEEEE',
              })}
            >
              <View style={{ position: 'relative' }}>
                <Image source={{ uri: deal.img }} style={{ width: dealW, height: 130 }} resizeMode="cover" />
                <View style={{ position: 'absolute', top: 6, left: 6, backgroundColor: '#FF6600', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3 }}>
                  <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '900' }}>{deal.disc}</Text>
                </View>
              </View>
              <View style={{ padding: 8 }}>
                <Text style={{ color: '#222', fontSize: 11 }} numberOfLines={1}>{deal.label}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                  <Text style={{ color: '#FF6600', fontSize: 15, fontWeight: '900' }}>{deal.price}</Text>
                  <View style={{ backgroundColor: '#E8F5E9', borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1 }}>
                    <Text style={{ color: '#2E7D32', fontSize: 8, fontWeight: '700' }}>شحن مجاني</Text>
                  </View>
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Category price pills */}
      <View style={{ backgroundColor: '#FFFFFF', marginTop: 8, paddingVertical: 14, paddingHorizontal: 14 }}>
        <Text style={{ color: '#191919', fontSize: 16, fontWeight: '700', marginBottom: 10 }}>فئات بأسعار لا تصدق</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8 }}>
          {TEMU_PRICE_CATS.map((cat) => (
            <Pressable
              key={cat.query}
              testID={`temu-cat-${cat.query}`}
              onPress={() => onSearch(cat.query)}
              style={({ pressed }) => ({
                borderRadius: 20, overflow: 'hidden', opacity: pressed ? 0.85 : 1,
              })}
            >
              <LinearGradient
                colors={[cat.color, cat.color + 'CC']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={{ paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center' }}
              >
                <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '700' }}>{cat.label}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 10, marginTop: 2 }}>{cat.price}</Text>
              </LinearGradient>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Trending */}
      <View style={{ backgroundColor: '#FFFFFF', marginTop: 8, paddingVertical: 14, paddingHorizontal: 14 }}>
        <Text style={{ color: '#191919', fontSize: 16, fontWeight: '700', marginBottom: 10 }}>الأكثر شعبية الآن</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {['حقائب نسائية', 'مجوهرات', 'ساعات رجالي', 'عناية بشرة', 'ألعاب أطفال', 'أحذية رياضية', 'إكسسوار هاتف', 'ملابس صيف'].map((chip) => (
            <Pressable
              key={chip}
              onPress={() => onSearch(chip + ' temu')}
              style={({ pressed }) => ({
                paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16,
                backgroundColor: pressed ? '#FF6600' : '#FFF3EC',
                borderWidth: 1, borderColor: '#FF6600',
              })}
            >
              <Text style={{ color: '#FF6600', fontSize: 12, fontWeight: '600' }}>{chip}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Trust badges */}
      <View style={{ backgroundColor: '#FFFFFF', marginTop: 8, paddingVertical: 14, paddingHorizontal: 14 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 16, alignItems: 'center' }}>
          {[
            { icon: 'تقييمات عالية', badge: '⭐ 4.8' },
            { icon: 'دفع آمن', badge: '🔒 آمن' },
            { icon: 'إرجاع مجاني', badge: '↩ مجاني' },
          ].map((b) => (
            <View key={b.badge} style={{ alignItems: 'center', gap: 2 }}>
              <Text style={{ color: '#FF6600', fontSize: 13, fontWeight: '800' }}>{b.badge}</Text>
              <Text style={{ color: '#777', fontSize: 10 }}>{b.icon}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </ScrollView>
  );
}

// ─── iHerb Store ──────────────────────────────────────────────────────────────

const IHERB_HEALTH_GOALS = [
  { icon: 'بناء العضلات', query: 'muscle building iherb', color: '#1565C0' },
  { icon: 'تحسين النوم', query: 'sleep iherb', color: '#4527A0' },
  { icon: 'تقوية الدماغ', query: 'brain health iherb', color: '#00695C' },
  { icon: 'صحة القلب', query: 'heart health iherb', color: '#B71C1C' },
  { icon: 'صحة العظام', query: 'bone health iherb', color: '#4E342E' },
  { icon: 'طاقة ونشاط', query: 'energy iherb', color: '#E65100' },
  { icon: 'اللياقة البدنية', query: 'fitness iherb', color: '#2E7D32' },
  { icon: 'صحة الأطفال', query: 'kids vitamins iherb', color: '#F57F17' },
];

const IHERB_BRANDS = [
  { name: 'NOW Foods', query: 'now foods iherb' },
  { name: "Nature's Way", query: 'natures way iherb' },
  { name: 'Garden of Life', query: 'garden of life iherb' },
  { name: 'Solgar', query: 'solgar iherb' },
  { name: 'Nordic Naturals', query: 'nordic naturals iherb' },
  { name: 'Jarrow Formulas', query: 'jarrow formulas iherb' },
];

const IHERB_SUPPLEMENT_DEALS = [
  { id: '1', label: 'فيتامين D3 5000 IU', disc: '35%', price: '$12.99', img: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200&fit=crop' },
  { id: '2', label: 'بروتين واي', disc: '28%', price: '$34.99', img: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=200&fit=crop' },
  { id: '3', label: 'أوميغا 3 سمك', disc: '40%', price: '$18.99', img: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200&fit=crop' },
  { id: '4', label: 'كرياتين مونوهيدرات', disc: '22%', price: '$22.99', img: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=200&fit=crop' },
  { id: '5', label: 'فيتامين C 1000 mg', disc: '30%', price: '$9.99', img: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200&fit=crop' },
];

function IHerbStore({ onSearch }: { onSearch: (query: string) => void }) {
  const { width } = useWindowDimensions();
  const goalW = (width - 12 * 2 - 8) / 2;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 30 }}
      style={{ backgroundColor: '#F1F8F4' }}
    >
      {/* Today's deals */}
      <LinearGradient
        colors={['#0F7D3B', '#1B9E4D']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ paddingVertical: 16, paddingHorizontal: 16 }}
      >
        <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800', marginBottom: 4 }}>عروض اليوم</Text>
        <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, marginBottom: 12 }}>خصومات حتى 40% على المكملات</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 10 }}>
          {IHERB_SUPPLEMENT_DEALS.map((item) => (
            <Pressable
              key={item.id}
              testID={`iherb-deal-${item.id}`}
              onPress={() => onSearch(item.label)}
              style={({ pressed }) => ({
                width: 140, backgroundColor: '#FFFFFF', borderRadius: 10,
                overflow: 'hidden', opacity: pressed ? 0.85 : 1,
              })}
            >
              <Image source={{ uri: item.img }} style={{ width: 140, height: 100 }} resizeMode="cover" />
              <View style={{ position: 'absolute', top: 6, left: 6, backgroundColor: '#0F7D3B', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                <Text style={{ color: '#FFF', fontSize: 9, fontWeight: '800' }}>-{item.disc}</Text>
              </View>
              <View style={{ padding: 8 }}>
                <Text style={{ color: '#0F7D3B', fontSize: 13, fontWeight: '700' }}>{item.price}</Text>
                <Text style={{ color: '#555', fontSize: 10, marginTop: 2 }} numberOfLines={2}>{item.label}</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </LinearGradient>

      {/* Health goals grid */}
      <View style={{ backgroundColor: '#FFFFFF', marginTop: 8, paddingVertical: 14, paddingHorizontal: 12 }}>
        <Text style={{ color: '#191919', fontSize: 16, fontWeight: '700', marginBottom: 10 }}>تسوّق حسب هدفك الصحي</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {IHERB_HEALTH_GOALS.map((goal) => (
            <Pressable
              key={goal.query}
              testID={`iherb-goal-${goal.query}`}
              onPress={() => onSearch(goal.query)}
              style={({ pressed }) => ({
                width: goalW, borderRadius: 12, overflow: 'hidden', opacity: pressed ? 0.85 : 1,
              })}
            >
              <LinearGradient
                colors={[goal.color, goal.color + 'CC']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={{ paddingVertical: 18, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700', textAlign: 'center' }}>{goal.icon}</Text>
              </LinearGradient>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Trusted brands */}
      <View style={{ backgroundColor: '#FFFFFF', marginTop: 8, paddingVertical: 14, paddingHorizontal: 14 }}>
        <Text style={{ color: '#191919', fontSize: 16, fontWeight: '700', marginBottom: 10 }}>العلامات التجارية الموثوقة</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 10 }}>
          {IHERB_BRANDS.map((brand) => (
            <Pressable
              key={brand.query}
              testID={`iherb-brand-${brand.query}`}
              onPress={() => onSearch(brand.query)}
              style={({ pressed }) => ({
                width: 130, backgroundColor: '#F8F8F8', borderRadius: 10,
                borderWidth: 1, borderColor: '#E0E0E0',
                paddingVertical: 18, alignItems: 'center', justifyContent: 'center',
                opacity: pressed ? 0.75 : 1,
              })}
            >
              <Text style={{ color: '#0F7D3B', fontSize: 13, fontWeight: '700', textAlign: 'center' }}>{brand.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Category pills */}
      <View style={{ backgroundColor: '#FFFFFF', marginTop: 8, paddingVertical: 14, paddingHorizontal: 14 }}>
        <Text style={{ color: '#191919', fontSize: 16, fontWeight: '700', marginBottom: 10 }}>المكملات الأكثر مبيعاً</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {[
            { label: 'فيتامينات', query: 'vitamins iherb' },
            { label: 'بروتين', query: 'protein iherb' },
            { label: 'أعشاب', query: 'herbal iherb' },
            { label: 'جمال طبيعي', query: 'natural beauty iherb' },
            { label: 'أغذية صحية', query: 'healthy food iherb' },
            { label: 'مكملات رياضية', query: 'sports supplements iherb' },
          ].map((pill) => (
            <Pressable
              key={pill.query}
              onPress={() => onSearch(pill.query)}
              style={({ pressed }) => ({
                paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
                backgroundColor: pressed ? '#0F7D3B' : '#E8F5ED',
                borderWidth: 1, borderColor: '#0F7D3B',
              })}
            >
              <Text style={{ color: '#0F7D3B', fontSize: 12, fontWeight: '600' }}>{pill.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Rewards strip */}
      <LinearGradient
        colors={['#0F7D3B', '#0A5C2B']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={{ marginTop: 8, paddingVertical: 16, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <View>
          <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800' }}>مكافآت iHerb</Text>
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 2 }}>اكسب نقاط مع كل عملية شراء</Text>
        </View>
        <Pressable
          testID="iherb-rewards-btn"
          onPress={() => onSearch('iherb rewards')}
          style={{ backgroundColor: '#FFFFFF', borderRadius: 6, paddingHorizontal: 14, paddingVertical: 8 }}
        >
          <Text style={{ color: '#0F7D3B', fontSize: 12, fontWeight: '700' }}>اعرف المزيد</Text>
        </Pressable>
      </LinearGradient>
    </ScrollView>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function StoreScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { platform, query: initialQuery } = useLocalSearchParams<{ platform: string; query?: string }>();
  const currentPlatform = platform ?? 'amazon';
  const isAmazon = currentPlatform === 'amazon';
  const cfg = STORE_CONFIG[currentPlatform];

  const [query, setQuery] = useState<string>(initialQuery || '');
  const [submittedQuery, setSubmittedQuery] = useState<string>(initialQuery || '');
  const inputRef = useRef<TextInput>(null);
  const cardWidth = (width - 16) / 2;
  const [page, setPage] = useState<number>(1);
  const [accumulatedResults, setAccumulatedResults] = useState<Product[]>([]);
  const [imageSearchResults, setImageSearchResults] = useState<Product[] | null>(null);
  const [isImageSearching, setIsImageSearching] = useState<boolean>(false);
  const [imageSearchError, setImageSearchError] = useState<string | null>(null);
  const [isResolvingUrl, setIsResolvingUrl] = useState<boolean>(false);

  const { data: pageResults, isLoading, isFetching } = useQuery({
    queryKey: ['store', currentPlatform, submittedQuery, page],
    queryFn: () => searchPlatform(submittedQuery, currentPlatform, page),
    enabled: submittedQuery.length > 0,
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (!pageResults) return;
    if (page === 1) {
      setAccumulatedResults(pageResults);
    } else {
      setAccumulatedResults(prev => [...prev, ...pageResults]);
    }
  }, [pageResults, page]);

  useEffect(() => {
    setPage(1);
    setAccumulatedResults([]);
  }, [submittedQuery]);

  const handleSubmit = () => {
    const t = query.trim();
    if (!t) return;
    Keyboard.dismiss();
    setImageSearchResults(null); setImageSearchError(null);
    setSubmittedQuery(t);
  };

  const handleCategoryPress = (categoryQuery: string) => {
    setQuery(categoryQuery);
    setImageSearchResults(null); setImageSearchError(null);
    setSubmittedQuery(categoryQuery);
    Keyboard.dismiss();
  };

  const SHORT_URL_DOMAINS = ['amzn.to', 'a.co', 'amzn.eu', 'amzn.asia', 'ebay.us', 'bit.ly', 'tinyurl.com'];

  const extractProductFromUrl = (url: string): { platform: Product['platform']; id: string; title?: string } | null => {
    try {
      const host = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
      if (host.includes('amazon.') || host === 'a.co') {
        const m = url.match(/\/(?:dp|gp\/product|exec\/obidos\/ASIN)\/([A-Z0-9]{10})/i)
          ?? url.match(/[?&]asin=([A-Z0-9]{10})/i);
        if (m) return { platform: 'amazon', id: m[1].toUpperCase() };
      }
      if (host.includes('walmart.')) {
        const m = url.match(/\/ip\/(?:[^/?]+\/)?(\d{5,})/);
        if (m) return { platform: 'walmart', id: m[1] };
      }
      if (host.includes('ebay.')) {
        const m = url.match(/\/itm\/([^/?]+)\/(\d{10,})/) ?? url.match(/\/itm\/(\d{10,})/);
        if (m) {
          const id = m[2] ?? m[1];
          const titleSlug = m[2] ? m[1] : null;
          const title = titleSlug ? titleSlug.replace(/-/g, ' ') : '';
          return { platform: 'ebay', id, title };
        }
        const itemParam = url.match(/[?&]item=(\d{10,})/i);
        if (itemParam) return { platform: 'ebay', id: itemParam[1] };
      }
      if (host.includes('taobao.com')) {
        const m = url.match(/[?&]id=(\d+)/);
        if (m) return { platform: 'taobao', id: m[1] };
      }
      if (host.includes('1688.com')) {
        const m = url.match(/\/offer\/(\d+)\.html/);
        if (m) return { platform: '1688', id: m[1] };
      }
    } catch { /* ignore */ }
    return null;
  };

  const handleUrlInput = async (url: string) => {
    Keyboard.dismiss();
    setIsResolvingUrl(true);
    try {
      let finalUrl = url;
      try {
        const host = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
        if (SHORT_URL_DOMAINS.some(d => host === d)) {
          const baseUrl = process.env.EXPO_PUBLIC_BACKEND_URL!;
          const aKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
          const res = await fetch(`${baseUrl}/resolve-url?url=${encodeURIComponent(url)}`, {
            headers: { "Authorization": `Bearer ${aKey}`, "apikey": aKey },
          });
          const json = await res.json() as { data?: { url?: string } };
          finalUrl = json?.data?.url || url;
        }
      } catch { /* ignore */ }

      const parsed = extractProductFromUrl(finalUrl);
      if (parsed) {
        router.push({
          pathname: '/product',
          params: {
            data: JSON.stringify({
              id: `${parsed.platform}-${parsed.id}`,
              title: parsed.title ?? '',
              price: null,
              priceText: '',
              image: null,
              platform: parsed.platform,
              url: finalUrl,
            }),
          },
        });
      }
    } finally {
      setIsResolvingUrl(false);
    }
  };

  const handleImageSearch = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'] as ImagePicker.MediaType[],
      allowsEditing: false,
      quality: 0.7,
    });

    if (result.canceled || !result.assets[0]) return;

    setIsImageSearching(true);
    setImageSearchError(null);
    try {
      const asset = result.assets[0];
      const filename = `store-search-${Date.now()}.jpg`;
      const response = await fetch(asset.uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('image-search')
        .upload(filename, blob, { contentType: 'image/jpeg', upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('image-search')
        .getPublicUrl(filename);

      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL!;
      const aKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
      const res = await fetch(
        `${backendUrl}/image-search?url=${encodeURIComponent(publicUrl)}&platforms=${currentPlatform}`,
        { headers: { "Authorization": `Bearer ${aKey}`, "apikey": aKey }, signal: AbortSignal.timeout(60000) }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json() as { data?: { results?: Product[]; detectedQuery?: string } };
      const imageResults = json?.data?.results ?? [];
      const detectedQuery = json?.data?.detectedQuery;

      setImageSearchResults(imageResults);
      if (detectedQuery) setQuery(detectedQuery);
      setSubmittedQuery('');
      Keyboard.dismiss();
    } catch (e) {
      console.error('Image search error:', e);
      setImageSearchError('فشل البحث بالصورة. حاول مرة أخرى.');
      setImageSearchResults([]);
    } finally {
      setIsImageSearching(false);
    }
  };

  // ── Amazon header ──
  const renderAmazonHeader = () => (
    <View style={{ backgroundColor: '#131921' }}>
      <View style={{ paddingTop: insets.top + 4, paddingHorizontal: 14, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
          <Pressable onPress={() => router.back()} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}>
            <ArrowLeft size={18} color="#FFFFFF" strokeWidth={2} />
          </Pressable>
          <AmazonLogo />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <MapPin size={12} color="#CCCCCC" strokeWidth={2} />
          <Text style={{ color: '#CCCCCC', fontSize: 11 }}>الشحن إلى المملكة</Text>
        </View>
        <Pressable style={{ marginLeft: 12, position: 'relative' }}>
          <ShoppingCart size={24} color="#FFFFFF" strokeWidth={1.8} />
          <View style={{ position: 'absolute', top: -3, right: -3, backgroundColor: '#FF9900', borderRadius: 7, minWidth: 14, height: 14, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#000', fontSize: 9, fontWeight: '800' }}>0</Text>
          </View>
        </Pressable>
      </View>
      <View style={{ paddingHorizontal: 10, paddingBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 2, borderColor: '#FF9900', overflow: 'hidden', height: 44 }}>
          <TextInput
            ref={inputRef}
            testID="store-search-input"
            value={query}
            onChangeText={(text) => {
              setQuery(text);
              if (/^https?:\/\//i.test(text.trim())) {
                void handleUrlInput(text.trim());
              }
            }}
            onSubmitEditing={handleSubmit}
            placeholder="ابحث في Amazon..."
            placeholderTextColor="#999999"
            returnKeyType="search"
            style={{ flex: 1, color: '#0F1111', fontSize: 14, paddingHorizontal: 12, paddingVertical: 0 }}
            selectionColor="#FF9900"
          />
          {query.length > 0 ? (
            <Pressable onPress={() => { setQuery(''); setSubmittedQuery(''); }} hitSlop={8} style={{ paddingHorizontal: 8 }}>
              <X size={16} color="#666" strokeWidth={2.5} />
            </Pressable>
          ) : null}
          <Pressable
            onPress={handleImageSearch}
            disabled={isImageSearching || isResolvingUrl}
            style={{ width: 40, height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' }}
          >
            {(isImageSearching || isResolvingUrl) ? (
              <ActivityIndicator size="small" color="#999" />
            ) : (
              <Camera size={18} color="#888" strokeWidth={2} />
            )}
          </Pressable>
          <Pressable testID="store-search-button" onPress={handleSubmit} style={{ backgroundColor: '#FF9900', width: 46, height: '100%', alignItems: 'center', justifyContent: 'center' }}>
            <Search size={20} color="#0F1111" strokeWidth={2.5} />
          </Pressable>
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, backgroundColor: '#232F3E' }} contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8, gap: 8 }}>
        {AMAZON_DEPARTMENTS.map((dept) => (
          <Pressable
            key={dept.id}
            onPress={() => handleCategoryPress(dept.query)}
            style={({ pressed }) => ({ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', opacity: pressed ? 0.7 : 1 })}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '500' }}>{dept.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );

  // ── eBay header ──
  const renderEbayHeader = () => (
    <View style={{ backgroundColor: '#191919', paddingTop: insets.top + 6, paddingBottom: 0 }}>
      <View style={{ paddingHorizontal: 14, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable testID="back-button" onPress={() => router.back()} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}>
          <ArrowLeft size={18} color="#FFFFFF" strokeWidth={2} />
        </Pressable>
        {/* eBay colored logo */}
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 0 }}>
          {(['e', 'b', 'a', 'y'] as const).map((letter, i) => {
            const colors = ['#E53238', '#0064D2', '#F5AF02', '#86B817'];
            return (
              <Text key={i} style={{ color: colors[i], fontSize: 26, fontWeight: '900', fontStyle: 'italic' }}>{letter}</Text>
            );
          })}
        </View>
        <Pressable style={{ position: 'relative' }}>
          <ShoppingCart size={22} color="#FFFFFF" strokeWidth={1.8} />
        </Pressable>
      </View>
      {/* Search bar */}
      <View style={{ paddingHorizontal: 10, paddingBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 6, borderWidth: 2, borderColor: '#0064D2', overflow: 'hidden', height: 42 }}>
          <TextInput
            ref={inputRef}
            testID="store-search-input"
            value={query}
            onChangeText={(text) => {
              setQuery(text);
              if (/^https?:\/\//i.test(text.trim())) {
                void handleUrlInput(text.trim());
              }
            }}
            onSubmitEditing={handleSubmit}
            placeholder="ابحث في eBay..."
            placeholderTextColor="#999"
            returnKeyType="search"
            style={{ flex: 1, color: '#191919', fontSize: 14, paddingHorizontal: 12, paddingVertical: 0 }}
            selectionColor="#0064D2"
          />
          {query.length > 0 ? (
            <Pressable onPress={() => { setQuery(''); setSubmittedQuery(''); }} hitSlop={8} style={{ paddingHorizontal: 8 }}>
              <X size={15} color="#666" strokeWidth={2.5} />
            </Pressable>
          ) : null}
          <Pressable
            onPress={handleImageSearch}
            disabled={isImageSearching || isResolvingUrl}
            style={{ width: 40, height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' }}
          >
            {(isImageSearching || isResolvingUrl) ? (
              <ActivityIndicator size="small" color="#999" />
            ) : (
              <Camera size={18} color="#888" strokeWidth={2} />
            )}
          </Pressable>
          <Pressable testID="store-search-button" onPress={handleSubmit} style={{ backgroundColor: '#0064D2', width: 44, height: '100%', alignItems: 'center', justifyContent: 'center' }}>
            <Search size={18} color="#FFFFFF" strokeWidth={2.5} />
          </Pressable>
        </View>
      </View>
      {/* Category pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, backgroundColor: '#2D2D2D' }} contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8, gap: 8 }}>
        {EBAY_CATEGORIES.map((cat) => (
          <Pressable
            key={cat.query}
            onPress={() => handleCategoryPress(cat.query)}
            style={({ pressed }) => ({ paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16, backgroundColor: pressed ? cat.color : 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' })}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '600' }}>{cat.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );

  // ── Walmart header ──
  const renderWalmartHeader = () => (
    <View style={{ backgroundColor: '#0071DC', paddingTop: insets.top + 6, paddingBottom: 10, paddingHorizontal: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
        <Pressable testID="back-button" onPress={() => router.back()} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
          <ArrowLeft size={18} color="#FFFFFF" strokeWidth={2} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ color: '#FFC220', fontSize: 16, fontWeight: '900' }}>✦</Text>
            <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '900' }}>Walmart</Text>
          </View>
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10, marginTop: 1 }}>توفير المال. العيش بشكل أفضل.</Text>
        </View>
        <Pressable style={{ position: 'relative' }}>
          <ShoppingCart size={22} color="#FFFFFF" strokeWidth={1.8} />
        </Pressable>
      </View>
      {/* Search bar */}
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 6, borderWidth: 2, borderColor: '#FFC220', overflow: 'hidden', height: 42 }}>
        <TextInput
          ref={inputRef}
          testID="store-search-input"
          value={query}
          onChangeText={(text) => {
            setQuery(text);
            if (/^https?:\/\//i.test(text.trim())) {
              void handleUrlInput(text.trim());
            }
          }}
          onSubmitEditing={handleSubmit}
          placeholder="ابحث في Walmart..."
          placeholderTextColor="#999"
          returnKeyType="search"
          style={{ flex: 1, color: '#191919', fontSize: 14, paddingHorizontal: 12, paddingVertical: 0 }}
          selectionColor="#0071DC"
        />
        {query.length > 0 ? (
          <Pressable onPress={() => { setQuery(''); setSubmittedQuery(''); }} hitSlop={8} style={{ paddingHorizontal: 8 }}>
            <X size={15} color="#666" strokeWidth={2.5} />
          </Pressable>
        ) : null}
        <Pressable
          onPress={handleImageSearch}
          disabled={isImageSearching}
          style={{ width: 40, height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' }}
        >
          {isImageSearching ? (
            <ActivityIndicator size="small" color="#999" />
          ) : (
            <Camera size={18} color="#888" strokeWidth={2} />
          )}
        </Pressable>
        <Pressable testID="store-search-button" onPress={handleSubmit} style={{ backgroundColor: '#FFC220', width: 44, height: '100%', alignItems: 'center', justifyContent: 'center' }}>
          <Search size={18} color="#0F1111" strokeWidth={2.5} />
        </Pressable>
      </View>
      {/* Location row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
        <MapPin size={12} color="#A8D4FF" strokeWidth={2} />
        <Text style={{ color: '#A8D4FF', fontSize: 11 }}>Pickup & Delivery</Text>
      </View>
    </View>
  );

  // ── Taobao header ──
  const renderTaobaoHeader = () => (
    <View style={{ backgroundColor: '#FF5000', paddingTop: insets.top + 6, paddingBottom: 0 }}>
      <View style={{ paddingHorizontal: 14, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Pressable testID="back-button" onPress={() => router.back()} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.15)', alignItems: 'center', justifyContent: 'center' }}>
          <ArrowLeft size={18} color="#FFFFFF" strokeWidth={2} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#FFFFFF', fontSize: 26, fontWeight: '900', letterSpacing: -1 }}>淘宝</Text>
          <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: -2 }}>Taobao</Text>
        </View>
        <Pressable><ShoppingCart size={22} color="#FFFFFF" strokeWidth={1.8} /></Pressable>
      </View>
      <View style={{ paddingHorizontal: 10, paddingBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 6, borderWidth: 2, borderColor: '#FF5000', overflow: 'hidden', height: 42 }}>
          <TextInput
            ref={inputRef}
            testID="store-search-input"
            value={query}
            onChangeText={(text) => {
              setQuery(text);
              if (/^https?:\/\//i.test(text.trim())) {
                void handleUrlInput(text.trim());
              }
            }}
            onSubmitEditing={handleSubmit}
            placeholder="ابحث في Taobao..."
            placeholderTextColor="#999"
            returnKeyType="search"
            style={{ flex: 1, color: '#191919', fontSize: 14, paddingHorizontal: 12, paddingVertical: 0 }}
            selectionColor="#FF5000"
          />
          {query.length > 0 ? (
            <Pressable onPress={() => { setQuery(''); setSubmittedQuery(''); }} hitSlop={8} style={{ paddingHorizontal: 8 }}>
              <X size={15} color="#666" strokeWidth={2.5} />
            </Pressable>
          ) : null}
          <Pressable
            onPress={handleImageSearch}
            disabled={isImageSearching || isResolvingUrl}
            style={{ width: 40, height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' }}
          >
            {(isImageSearching || isResolvingUrl) ? (
              <ActivityIndicator size="small" color="#999" />
            ) : (
              <Camera size={18} color="#888" strokeWidth={2} />
            )}
          </Pressable>
          <Pressable testID="store-search-button" onPress={handleSubmit} style={{ backgroundColor: '#FF5000', width: 44, height: '100%', alignItems: 'center', justifyContent: 'center' }}>
            <Search size={18} color="#FFFFFF" strokeWidth={2.5} />
          </Pressable>
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, backgroundColor: '#E04800' }} contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8, gap: 8 }}>
        {TAOBAO_CATEGORIES_GRID.slice(0, 8).map((cat) => (
          <Pressable
            key={cat.query}
            onPress={() => handleCategoryPress(cat.query)}
            style={({ pressed }) => ({ paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16, backgroundColor: pressed ? '#FFFFFF' : 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' })}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '600' }}>{cat.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );

  // ── 1688 header ──
  const render1688Header = () => (
    <View style={{ backgroundColor: '#E02020', paddingTop: insets.top + 6, paddingBottom: 0 }}>
      <View style={{ paddingHorizontal: 14, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Pressable testID="back-button" onPress={() => router.back()} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.15)', alignItems: 'center', justifyContent: 'center' }}>
          <ArrowLeft size={18} color="#FFFFFF" strokeWidth={2} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#FFFFFF', fontSize: 28, fontWeight: '900', letterSpacing: -1 }}>1688</Text>
          <Text style={{ color: 'rgba(255,200,200,0.9)', fontSize: 10, marginTop: -2 }}>الجملة من المصنع مباشرة</Text>
        </View>
        <Pressable><ShoppingCart size={22} color="#FFFFFF" strokeWidth={1.8} /></Pressable>
      </View>
      <View style={{ paddingHorizontal: 10, paddingBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 6, borderWidth: 2, borderColor: '#E02020', overflow: 'hidden', height: 42 }}>
          <TextInput
            ref={inputRef}
            testID="store-search-input"
            value={query}
            onChangeText={(text) => {
              setQuery(text);
              if (/^https?:\/\//i.test(text.trim())) {
                void handleUrlInput(text.trim());
              }
            }}
            onSubmitEditing={handleSubmit}
            placeholder="ابحث عن منتجات الجملة..."
            placeholderTextColor="#999"
            returnKeyType="search"
            style={{ flex: 1, color: '#191919', fontSize: 14, paddingHorizontal: 12, paddingVertical: 0 }}
            selectionColor="#E02020"
          />
          {query.length > 0 ? (
            <Pressable onPress={() => { setQuery(''); setSubmittedQuery(''); }} hitSlop={8} style={{ paddingHorizontal: 8 }}>
              <X size={15} color="#666" strokeWidth={2.5} />
            </Pressable>
          ) : null}
          <Pressable
            onPress={handleImageSearch}
            disabled={isImageSearching || isResolvingUrl}
            style={{ width: 40, height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' }}
          >
            {(isImageSearching || isResolvingUrl) ? (
              <ActivityIndicator size="small" color="#999" />
            ) : (
              <Camera size={18} color="#888" strokeWidth={2} />
            )}
          </Pressable>
          <Pressable testID="store-search-button" onPress={handleSubmit} style={{ backgroundColor: '#E02020', width: 44, height: '100%', alignItems: 'center', justifyContent: 'center' }}>
            <Search size={18} color="#FFFFFF" strokeWidth={2.5} />
          </Pressable>
        </View>
      </View>
      {/* Trust bar */}
      <View style={{ backgroundColor: '#FFFFFF', paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', justifyContent: 'space-around' }}>
        {['مورد موثق', 'ضمان الجودة', 'أسعار مصنع'].map((badge) => (
          <View key={badge} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: '#28A745', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#FFF', fontSize: 9, fontWeight: '900' }}>✓</Text>
            </View>
            <Text style={{ color: '#333', fontSize: 11, fontWeight: '600' }}>{badge}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  // ── Temu header ──
  const renderTemuHeader = () => (
    <View style={{ backgroundColor: '#FF6600', paddingTop: insets.top + 6, paddingBottom: 0 }}>
      <View style={{ paddingHorizontal: 14, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Pressable testID="back-button" onPress={() => router.back()} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.15)', alignItems: 'center', justifyContent: 'center' }}>
          <ArrowLeft size={18} color="#FFFFFF" strokeWidth={2} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#FFFFFF', fontSize: 28, fontWeight: '900', letterSpacing: 1 }}>temu</Text>
          <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 10, marginTop: -2 }}>تسوّق مثل المليارديرات</Text>
        </View>
        <Pressable><ShoppingCart size={22} color="#FFFFFF" strokeWidth={1.8} /></Pressable>
      </View>
      <View style={{ paddingHorizontal: 10, paddingBottom: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 6, borderWidth: 2, borderColor: '#FF6600', overflow: 'hidden', height: 42 }}>
          <TextInput
            ref={inputRef}
            testID="store-search-input"
            value={query}
            onChangeText={(text) => {
              setQuery(text);
              if (/^https?:\/\//i.test(text.trim())) {
                void handleUrlInput(text.trim());
              }
            }}
            onSubmitEditing={handleSubmit}
            placeholder="ابحث في Temu..."
            placeholderTextColor="#999"
            returnKeyType="search"
            style={{ flex: 1, color: '#191919', fontSize: 14, paddingHorizontal: 12, paddingVertical: 0 }}
            selectionColor="#FF6600"
          />
          {query.length > 0 ? (
            <Pressable onPress={() => { setQuery(''); setSubmittedQuery(''); }} hitSlop={8} style={{ paddingHorizontal: 8 }}>
              <X size={15} color="#666" strokeWidth={2.5} />
            </Pressable>
          ) : null}
          <Pressable
            onPress={handleImageSearch}
            disabled={isImageSearching || isResolvingUrl}
            style={{ width: 40, height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' }}
          >
            {(isImageSearching || isResolvingUrl) ? (
              <ActivityIndicator size="small" color="#999" />
            ) : (
              <Camera size={18} color="#888" strokeWidth={2} />
            )}
          </Pressable>
          <Pressable testID="store-search-button" onPress={handleSubmit} style={{ backgroundColor: '#FF6600', width: 44, height: '100%', alignItems: 'center', justifyContent: 'center' }}>
            <Search size={18} color="#FFFFFF" strokeWidth={2.5} />
          </Pressable>
        </View>
      </View>
      {/* Free shipping bar */}
      <View style={{ backgroundColor: '#FFFFFF', marginTop: 0, paddingVertical: 7, alignItems: 'center' }}>
        <Text style={{ color: '#FF6600', fontSize: 12, fontWeight: '700' }}>شحن مجاني على جميع الطلبات</Text>
      </View>
    </View>
  );

  // ── iHerb header ──
  const renderIHerbHeader = () => (
    <View style={{ backgroundColor: '#0F7D3B', paddingTop: insets.top + 6, paddingBottom: 0 }}>
      <View style={{ paddingHorizontal: 14, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Pressable testID="back-button" onPress={() => router.back()} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.15)', alignItems: 'center', justifyContent: 'center' }}>
          <ArrowLeft size={18} color="#FFFFFF" strokeWidth={2} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '900' }}>iHerb</Text>
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10, marginTop: -2 }}>Your trusted source for natural health</Text>
        </View>
        <Pressable><ShoppingCart size={22} color="#FFFFFF" strokeWidth={1.8} /></Pressable>
      </View>
      <View style={{ paddingHorizontal: 10, paddingBottom: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 6, borderWidth: 2, borderColor: '#0F7D3B', overflow: 'hidden', height: 42 }}>
          <TextInput
            ref={inputRef}
            testID="store-search-input"
            value={query}
            onChangeText={(text) => {
              setQuery(text);
              if (/^https?:\/\//i.test(text.trim())) {
                void handleUrlInput(text.trim());
              }
            }}
            onSubmitEditing={handleSubmit}
            placeholder="ابحث في iHerb..."
            placeholderTextColor="#999"
            returnKeyType="search"
            style={{ flex: 1, color: '#191919', fontSize: 14, paddingHorizontal: 12, paddingVertical: 0 }}
            selectionColor="#0F7D3B"
          />
          {query.length > 0 ? (
            <Pressable onPress={() => { setQuery(''); setSubmittedQuery(''); }} hitSlop={8} style={{ paddingHorizontal: 8 }}>
              <X size={15} color="#666" strokeWidth={2.5} />
            </Pressable>
          ) : null}
          <Pressable
            onPress={handleImageSearch}
            disabled={isImageSearching || isResolvingUrl}
            style={{ width: 40, height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' }}
          >
            {(isImageSearching || isResolvingUrl) ? (
              <ActivityIndicator size="small" color="#999" />
            ) : (
              <Camera size={18} color="#888" strokeWidth={2} />
            )}
          </Pressable>
          <Pressable testID="store-search-button" onPress={handleSubmit} style={{ backgroundColor: '#0F7D3B', width: 44, height: '100%', alignItems: 'center', justifyContent: 'center' }}>
            <Search size={18} color="#FFFFFF" strokeWidth={2.5} />
          </Pressable>
        </View>
      </View>
      {/* Trust bar */}
      <View style={{ backgroundColor: '#FFFFFF', marginTop: 0, paddingVertical: 8, paddingHorizontal: 14, flexDirection: 'row', justifyContent: 'space-around' }}>
        {['عضوي', 'غير معدل وراثياً', 'فيتامينات', '4.8/5 تقييم'].map((badge) => (
          <Text key={badge} style={{ color: '#0F7D3B', fontSize: 10, fontWeight: '700' }}>{badge}</Text>
        ))}
      </View>
    </View>
  );

  const renderHeader = () => {
    switch (currentPlatform) {
      case 'amazon': return renderAmazonHeader();
      case 'ebay': return renderEbayHeader();
      case 'walmart': return renderWalmartHeader();
      case 'taobao': return renderTaobaoHeader();
      case '1688': return render1688Header();
      case 'temu': return renderTemuHeader();
      case 'iherb': return renderIHerbHeader();
      default: return renderAmazonHeader();
    }
  };

  const renderStoreBrowse = () => {
    switch (currentPlatform) {
      case 'amazon': return <AmazonStore onSearch={handleCategoryPress} />;
      case 'ebay': return <EbayStore onSearch={handleCategoryPress} />;
      case 'walmart': return <WalmartStore onSearch={handleCategoryPress} />;
      case 'taobao': return <TaobaoStore onSearch={handleCategoryPress} />;
      case '1688': return <Store1688 onSearch={handleCategoryPress} />;
      case 'temu': return <TemuStore onSearch={handleCategoryPress} />;
      case 'iherb': return <IHerbStore onSearch={handleCategoryPress} />;
      default: return cfg ? <GenericStore cfg={cfg} platform={currentPlatform} onSearch={handleCategoryPress} /> : null;
    }
  };

  const bgColor = currentPlatform === 'amazon' ? '#EAEDED'
    : currentPlatform === 'temu' ? '#1A1A1A'
    : '#F5F5F5';

  const displayResults = imageSearchResults ?? accumulatedResults;
  const isImageSearchMode = imageSearchResults !== null;

  return (
    <View style={{ flex: 1, backgroundColor: bgColor }}>
      {renderHeader()}

      {submittedQuery.length === 0 && !isImageSearchMode ? (
        renderStoreBrowse()
      ) : isLoading && !isImageSearchMode ? (
        <SkeletonGrid />
      ) : (
        <FlatList
          testID="store-results"
          data={displayResults}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={{ padding: 4, paddingBottom: insets.bottom + 20 }}
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={Keyboard.dismiss}
          style={{ backgroundColor: bgColor }}
          ListHeaderComponent={
            <View style={{ backgroundColor: '#FFFFFF', marginBottom: 4, paddingHorizontal: 14, paddingVertical: 10 }}>
              {isImageSearchMode ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ color: '#565959', fontSize: 12 }}>
                    {displayResults.length} نتيجة للبحث بالصورة
                  </Text>
                  <Pressable
                    onPress={() => setImageSearchResults(null)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F0F0F0', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}
                  >
                    <X size={12} color="#666" strokeWidth={2.5} />
                    <Text style={{ color: '#666', fontSize: 11, fontWeight: '600' }}>مسح بحث الصورة</Text>
                  </Pressable>
                </View>
              ) : (
                <Text style={{ color: '#565959', fontSize: 12 }}>
                  {accumulatedResults.length} نتيجة لـ "{submittedQuery}"
                </Text>
              )}
            </View>
          }
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingHorizontal: 24 }}>
              {imageSearchError ? (
                <>
                  <Text style={{ fontSize: 40, marginBottom: 12 }}>⚠️</Text>
                  <Text style={{ color: '#E02020', fontSize: 15, textAlign: 'center', fontWeight: '600' }}>{imageSearchError}</Text>
                </>
              ) : isImageSearchMode ? (
                <>
                  <Text style={{ fontSize: 40, marginBottom: 12 }}>🔍</Text>
                  <Text style={{ color: '#999', fontSize: 15, textAlign: 'center' }}>لم يتم العثور على نتائج مطابقة</Text>
                  <Text style={{ color: '#bbb', fontSize: 12, textAlign: 'center', marginTop: 6 }}>جرب صورة أخرى أو ابحث بالنص</Text>
                </>
              ) : (
                <>
                  <Text style={{ color: '#999', fontSize: 40, marginBottom: 12 }}>0 نتائج</Text>
                  <Text style={{ color: '#999', fontSize: 15 }}>لا توجد نتائج</Text>
                </>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <View style={{ width: cardWidth }}>
              <ProductCard product={item} />
            </View>
          )}
          ListFooterComponent={
            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
              {!isImageSearchMode && isFetching && page > 1 ? (
                <ActivityIndicator color={cfg?.accentColor ?? '#E52222'} size="small" />
              ) : !isImageSearchMode && (pageResults?.length ?? 0) >= 10 ? (
                <Pressable
                  testID="store-load-more-button"
                  onPress={() => setPage(p => p + 1)}
                  style={({ pressed }) => ({
                    paddingHorizontal: 32, paddingVertical: 12,
                    backgroundColor: pressed ? '#f0f0f0' : '#ffffff',
                    borderRadius: 50, borderWidth: 1.5, borderColor: '#e0e0e0',
                  })}
                >
                  <Text style={{ color: '#333', fontSize: 14, fontWeight: '700' }}>تحميل المزيد</Text>
                </Pressable>
              ) : displayResults.length > 0 ? (
                <Text style={{ color: '#bbb', fontSize: 12 }}>لا توجد نتائج إضافية</Text>
              ) : null}
            </View>
          }
        />
      )}
    </View>
  );
}
