import {
  ShoppingCart, Plus, Minus, X, Trash2, Package,
  Search, ShoppingBag, Truck, Check, Loader2, ArrowLeft,
  Star, Heart, Sparkles, Zap, Leaf
} from 'lucide-react'

/* ═══════════════════════════════════════════════════════════
   THEME DEFINITIONS
   Each theme exports render functions for each section.
   The StorePage passes data & handlers, the theme renders UI.
═══════════════════════════════════════════════════════════ */

// ─────────────── THEME 1: MINIMAL ───────────────
// Inspired by Apple Store — white, black CTAs, lots of whitespace
export const themeMinimal = {
  id: 'minimal',
  name: 'عصري',
  nameEn: 'Minimal',
  description: 'تصميم نظيف وعصري — خلفية بيضاء وأزرار سوداء',
  preview: { bg: '#ffffff', accent: '#111827', card: '#f9fafb' },
  icon: Sparkles,

  headerClass: 'sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-100',
  bodyClass: 'min-h-screen bg-white',
  cardClass: 'group cursor-pointer',
  cardImageClass: 'relative aspect-square bg-gray-50 rounded-2xl overflow-hidden mb-3',
  cardImgStyle: 'w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-out',
  cardTitleClass: 'text-sm font-medium text-gray-900 leading-snug line-clamp-2',
  cardPriceClass: 'text-sm font-bold text-gray-900 mt-1.5',
  addBtnClass: 'absolute bottom-3 left-3 w-10 h-10 bg-white shadow-lg shadow-black/10 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-gray-900 hover:text-white text-gray-900',
  qtyBarClass: 'absolute bottom-3 left-3 right-3 flex items-center justify-between bg-gray-900 rounded-xl h-10 px-1',
  qtyBtnClass: 'w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors',
  qtyTextClass: 'text-sm font-bold text-white',
  qtyMinusClass: 'w-3.5 h-3.5 text-white',
  qtyTrashClass: 'w-3.5 h-3.5 text-red-400',
  floatingCartClass: 'w-full h-14 bg-gray-900 hover:bg-gray-800 text-white rounded-2xl font-medium text-sm flex items-center justify-between px-5 shadow-2xl shadow-gray-900/30 transition-all active:scale-[0.98]',
  floatingCartCountClass: 'min-w-[24px] h-6 bg-white/20 rounded-md flex items-center justify-center text-xs font-bold',
  cartSheetBg: 'bg-black/30 backdrop-blur-sm',
  cartSheetClass: 'bg-white rounded-t-3xl sm:rounded-2xl',
  ctaBtnClass: 'w-full h-[52px] bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-semibold text-sm flex items-center justify-center transition-colors',
  headerCountBadge: 'absolute -top-0.5 -left-0.5 min-w-[20px] h-5 bg-gray-900 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1',
  searchBg: 'bg-gray-50',
  searchFocus: 'focus:bg-gray-100',
  toastClass: 'bg-gray-900/95',
  lowStockClass: 'bg-white/90 backdrop-blur text-red-600 text-[10px] font-semibold px-2 py-1 rounded-lg',
  summaryBg: 'bg-gray-50 rounded-2xl',
  emptyIcon: Search,
}

// ─────────────── THEME 2: CLASSIC ───────────────
// Inspired by Amazon/Noon — colored header, bordered cards, badges
export const themeClassic = {
  id: 'classic',
  name: 'كلاسيكي',
  nameEn: 'Classic',
  description: 'هيدر ملوّن مع كروت تقليدية — يناسب جميع المتاجر',
  preview: { bg: '#eff6ff', accent: '#2563eb', card: '#ffffff' },
  icon: ShoppingCart,

  headerClass: 'sticky top-0 z-30 bg-blue-600 shadow-lg',
  bodyClass: 'min-h-screen bg-gray-100',
  cardClass: 'group cursor-pointer bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300',
  cardImageClass: 'relative aspect-[4/3] bg-white overflow-hidden',
  cardImgStyle: 'w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-300',
  cardTitleClass: 'text-[13px] font-semibold text-gray-800 leading-snug line-clamp-2 min-h-[36px]',
  cardPriceClass: 'text-base font-extrabold text-blue-600 mt-1',
  addBtnClass: 'w-full mt-2 h-9 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors',
  qtyBarClass: 'flex items-center justify-between mt-2 bg-blue-50 rounded-lg border border-blue-200',
  qtyBtnClass: 'w-9 h-9 flex items-center justify-center hover:bg-blue-100 rounded-lg transition-colors',
  qtyTextClass: 'text-sm font-bold text-blue-700',
  qtyMinusClass: 'w-3.5 h-3.5 text-blue-600',
  qtyTrashClass: 'w-3.5 h-3.5 text-red-400',
  floatingCartClass: 'w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm flex items-center justify-between px-5 shadow-xl transition-all',
  floatingCartCountClass: 'min-w-[24px] h-6 bg-yellow-400 text-blue-900 rounded-full flex items-center justify-center text-xs font-bold',
  cartSheetBg: 'bg-black/40',
  cartSheetClass: 'bg-white rounded-t-2xl sm:rounded-xl',
  ctaBtnClass: 'w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors',
  headerCountBadge: 'absolute -top-1 -left-1 min-w-[20px] h-5 bg-yellow-400 text-blue-900 text-[10px] font-bold rounded-full flex items-center justify-center px-1',
  searchBg: 'bg-white',
  searchFocus: 'focus:ring-2 focus:ring-blue-300',
  toastClass: 'bg-blue-600',
  lowStockClass: 'bg-red-500 text-white text-[9px] font-bold px-2 py-0.5 rounded',
  summaryBg: 'bg-blue-50 rounded-xl border border-blue-100',
  emptyIcon: Package,

  // Classic-specific: show banner & info badges
  showBanner: true,
  showInfoBadges: true,
  bannerGradient: 'from-blue-700 to-blue-500',
  headerTextColor: 'text-white',
  headerSubColor: 'text-blue-100',
}

// ─────────────── THEME 3: ELEGANT ───────────────
// Inspired by Farfetch/Mejuri — cream bg, serif fonts, soft shadows
export const themeElegant = {
  id: 'elegant',
  name: 'أنيق',
  nameEn: 'Elegant',
  description: 'تصميم راقي بألوان دافئة — للعطور والأزياء والمجوهرات',
  preview: { bg: '#faf8f5', accent: '#92400e', card: '#ffffff' },
  icon: Heart,

  headerClass: 'sticky top-0 z-30 bg-[#faf8f5]/90 backdrop-blur-xl border-b border-amber-100/50',
  bodyClass: 'min-h-screen bg-[#faf8f5]',
  cardClass: 'group cursor-pointer',
  cardImageClass: 'relative aspect-[3/4] bg-[#f5f0eb] rounded-xl overflow-hidden mb-3 shadow-sm',
  cardImgStyle: 'w-full h-full object-cover group-hover:scale-[1.05] transition-transform duration-700 ease-out',
  cardTitleClass: 'text-sm text-stone-700 leading-snug line-clamp-2 font-light tracking-wide',
  cardPriceClass: 'text-sm font-semibold text-amber-900 mt-2',
  addBtnClass: 'absolute bottom-4 left-1/2 -translate-x-1/2 h-9 px-5 bg-amber-900 text-white rounded-full text-xs font-medium opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center gap-1.5 shadow-lg whitespace-nowrap',
  qtyBarClass: 'absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-amber-900 rounded-full h-9 px-2',
  qtyBtnClass: 'w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors',
  qtyTextClass: 'text-xs font-semibold text-white min-w-[16px] text-center',
  qtyMinusClass: 'w-3 h-3 text-amber-200',
  qtyTrashClass: 'w-3 h-3 text-red-300',
  floatingCartClass: 'w-full h-14 bg-amber-900 hover:bg-amber-800 text-white rounded-full font-medium text-sm flex items-center justify-between px-6 shadow-xl transition-all',
  floatingCartCountClass: 'min-w-[24px] h-6 bg-amber-700 rounded-full flex items-center justify-center text-xs font-medium',
  cartSheetBg: 'bg-black/20 backdrop-blur-sm',
  cartSheetClass: 'bg-[#faf8f5] rounded-t-3xl sm:rounded-2xl',
  ctaBtnClass: 'w-full h-[52px] bg-amber-900 hover:bg-amber-800 text-white rounded-full font-medium text-sm flex items-center justify-center transition-colors',
  headerCountBadge: 'absolute -top-0.5 -left-0.5 min-w-[18px] h-[18px] bg-amber-900 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1',
  searchBg: 'bg-stone-100/60',
  searchFocus: 'focus:bg-stone-100',
  toastClass: 'bg-amber-900/95',
  lowStockClass: 'bg-amber-900/80 text-white text-[9px] font-medium px-2.5 py-1 rounded-full',
  summaryBg: 'bg-stone-100 rounded-2xl',
  emptyIcon: Heart,

  fontFamily: 'font-serif',
}

// ─────────────── THEME 4: BOLD ───────────────
// Inspired by Nike/Kith — dark mode, bold typography
export const themeBold = {
  id: 'bold',
  name: 'جريء',
  nameEn: 'Bold',
  description: 'وضع داكن مع خطوط عريضة — للإلكترونيات والألعاب',
  preview: { bg: '#0f0f0f', accent: '#f97316', card: '#1a1a1a' },
  icon: Zap,

  headerClass: 'sticky top-0 z-30 bg-[#0f0f0f]/90 backdrop-blur-xl border-b border-white/5',
  bodyClass: 'min-h-screen bg-[#0f0f0f]',
  cardClass: 'group cursor-pointer',
  cardImageClass: 'relative aspect-square bg-[#1a1a1a] rounded-2xl overflow-hidden mb-3',
  cardImgStyle: 'w-full h-full object-cover group-hover:scale-[1.06] transition-transform duration-500 ease-out',
  cardTitleClass: 'text-sm font-semibold text-white leading-snug line-clamp-2',
  cardPriceClass: 'text-sm font-bold text-orange-400 mt-1.5',
  addBtnClass: 'absolute bottom-3 left-3 w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-orange-400 text-white shadow-lg shadow-orange-500/30',
  qtyBarClass: 'absolute bottom-3 left-3 right-3 flex items-center justify-between bg-orange-500 rounded-xl h-10 px-1',
  qtyBtnClass: 'w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors',
  qtyTextClass: 'text-sm font-bold text-white',
  qtyMinusClass: 'w-3.5 h-3.5 text-white',
  qtyTrashClass: 'w-3.5 h-3.5 text-red-200',
  floatingCartClass: 'w-full h-14 bg-orange-500 hover:bg-orange-400 text-white rounded-2xl font-bold text-sm flex items-center justify-between px-5 shadow-2xl shadow-orange-500/30 transition-all active:scale-[0.98]',
  floatingCartCountClass: 'min-w-[24px] h-6 bg-white/20 rounded-md flex items-center justify-center text-xs font-bold',
  cartSheetBg: 'bg-black/60 backdrop-blur-sm',
  cartSheetClass: 'bg-[#1a1a1a] rounded-t-3xl sm:rounded-2xl',
  ctaBtnClass: 'w-full h-[52px] bg-orange-500 hover:bg-orange-400 text-white rounded-xl font-bold text-sm flex items-center justify-center transition-colors',
  headerCountBadge: 'absolute -top-0.5 -left-0.5 min-w-[20px] h-5 bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1',
  searchBg: 'bg-white/5',
  searchFocus: 'focus:bg-white/10',
  toastClass: 'bg-orange-500',
  lowStockClass: 'bg-red-500/80 text-white text-[10px] font-semibold px-2 py-1 rounded-lg',
  summaryBg: 'bg-white/5 rounded-2xl',
  emptyIcon: Zap,

  isDark: true,
  textPrimary: 'text-white',
  textSecondary: 'text-gray-400',
  textMuted: 'text-gray-500',
  borderColor: 'border-white/10',
  inputBg: 'bg-white/5 border-white/10 text-white placeholder-gray-500 focus:border-orange-500',
  cartItemBg: 'bg-white/5',
  dividerColor: 'border-white/5',
  sheetHeaderText: 'text-white',
}

// ─────────────── THEME 5: FRESH ───────────────
// Inspired by Instacart/Talabat — green, rounded, colorful badges
export const themeFresh = {
  id: 'fresh',
  name: 'منعش',
  nameEn: 'Fresh',
  description: 'أخضر زاهي مع بانر ملوّن — للمطاعم والسوبرماركت',
  preview: { bg: '#f0fdf4', accent: '#16a34a', card: '#ffffff' },
  icon: Leaf,

  headerClass: 'sticky top-0 z-30 bg-green-600 shadow-md',
  bodyClass: 'min-h-screen bg-green-50/50',
  cardClass: 'group cursor-pointer bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border border-green-100/50',
  cardImageClass: 'relative aspect-square bg-white overflow-hidden',
  cardImgStyle: 'w-full h-full object-cover group-hover:scale-105 transition-transform duration-300',
  cardTitleClass: 'text-[13px] font-semibold text-gray-800 leading-snug line-clamp-2',
  cardPriceClass: 'text-base font-extrabold text-green-700 mt-1',
  addBtnClass: 'w-full mt-2.5 h-10 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors',
  qtyBarClass: 'flex items-center justify-between mt-2.5 bg-green-50 rounded-xl border border-green-200',
  qtyBtnClass: 'w-10 h-10 flex items-center justify-center hover:bg-green-100 rounded-xl transition-colors',
  qtyTextClass: 'text-sm font-bold text-green-700',
  qtyMinusClass: 'w-3.5 h-3.5 text-green-600',
  qtyTrashClass: 'w-3.5 h-3.5 text-red-400',
  floatingCartClass: 'w-full h-14 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-bold text-sm flex items-center justify-between px-5 shadow-xl shadow-green-600/30 transition-all',
  floatingCartCountClass: 'min-w-[24px] h-6 bg-yellow-400 text-green-900 rounded-full flex items-center justify-center text-xs font-bold',
  cartSheetBg: 'bg-black/30 backdrop-blur-sm',
  cartSheetClass: 'bg-white rounded-t-3xl sm:rounded-2xl',
  ctaBtnClass: 'w-full h-[52px] bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors',
  headerCountBadge: 'absolute -top-1 -left-1 min-w-[20px] h-5 bg-yellow-400 text-green-900 text-[10px] font-bold rounded-full flex items-center justify-center px-1',
  searchBg: 'bg-white',
  searchFocus: 'focus:ring-2 focus:ring-green-300',
  toastClass: 'bg-green-600',
  lowStockClass: 'bg-orange-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full',
  summaryBg: 'bg-green-50 rounded-2xl border border-green-100',
  emptyIcon: Leaf,

  showBanner: true,
  showInfoBadges: true,
  bannerGradient: 'from-green-700 to-green-500',
  headerTextColor: 'text-white',
  headerSubColor: 'text-green-100',

  // fresh-specific: card has padding below image
  cardInfoPadding: 'p-3',
}

/* ═══════════════════════════════════════════════════════════
   THEMES MAP — used by StorePage to pick the right theme
═══════════════════════════════════════════════════════════ */
export const THEMES = {
  minimal: themeMinimal,
  classic: themeClassic,
  elegant: themeElegant,
  bold: themeBold,
  fresh: themeFresh,
}

export const THEME_LIST = Object.values(THEMES)
export const DEFAULT_THEME = 'minimal'
