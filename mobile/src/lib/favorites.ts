import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';
import { useAuth } from './auth-context';
import type { Product } from '@/components/ProductCard';

export interface FavoriteRow {
  id: string;
  user_id: string;
  product_id: string;
  platform: string;
  title: string;
  price_text: string;
  image: string | null;
  url: string;
  created_at: string;
}

export function useFavorites() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: favorites = [] } = useQuery<FavoriteRow[]>({
    queryKey: ['favorites', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('favorites')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const addFav = useMutation({
    mutationFn: async (product: Product) => {
      const { error } = await supabase.from('favorites').insert({
        user_id: user!.id,
        product_id: product.id,
        platform: product.platform,
        title: product.title,
        price_text: product.priceText,
        image: product.image,
        url: product.url,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['favorites'] }),
  });

  const removeFav = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('product_id', productId)
        .eq('user_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['favorites'] }),
  });

  const isFavorite = (productId: string) =>
    favorites.some((f) => f.product_id === productId);

  return { favorites, addFav, removeFav, isFavorite };
}
