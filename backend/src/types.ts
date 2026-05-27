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

export interface VariantItem {
  asin: string;
  name: string;
  image?: string;
  selected: boolean;
}

export interface VariantGroup {
  title: string;
  items: VariantItem[];
}

export interface ProductDetail {
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
