import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function useFavorites(userId: string | undefined) {
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    if (!userId) {
      setFavorites([]);
      return;
    }

    const loadFavorites = async () => {
      try {
        const { data, error } = await supabase
          .from('project_favorites')
          .select('project_id')
          .eq('user_id', userId);

        if (error) throw error;

        const ids = data ? data.map((fav: any) => fav.project_id) : [];
        setFavorites(ids);
        localStorage.setItem(`devban_favorites_${userId}`, JSON.stringify(ids));
      } catch (e) {
        console.error('Error loading favorites from DB:', e);
        const stored = localStorage.getItem(`devban_favorites_${userId}`);
        if (stored) {
          try {
            setFavorites(JSON.parse(stored));
          } catch (err) {
            setFavorites([]);
          }
        } else {
          setFavorites([]);
        }
      }
    };

    loadFavorites();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `devban_favorites_${userId}`) {
        loadFavorites();
      }
    };

    const handleCustomEvent = () => {
      loadFavorites();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('devban_favorites_updated', handleCustomEvent);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('devban_favorites_updated', handleCustomEvent);
    };
  }, [userId]);

  const toggleFavorite = async (projectId: string) => {
    if (!userId) return;

    const isFav = favorites.includes(projectId);
    const newFavs = isFav ? favorites.filter(id => id !== projectId) : [...favorites, projectId];
    
    // Optimistic local state update
    setFavorites(newFavs);
    localStorage.setItem(`devban_favorites_${userId}`, JSON.stringify(newFavs));

    try {
      if (isFav) {
        const { error } = await supabase
          .from('project_favorites')
          .delete()
          .eq('user_id', userId)
          .eq('project_id', projectId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('project_favorites')
          .insert({ user_id: userId, project_id: projectId });
        if (error) throw error;
      }
      
      // Dispatch event to sync state after successful DB write
      window.dispatchEvent(new Event('devban_favorites_updated'));
    } catch (e) {
      console.error('Error toggling favorite in DB:', e);
      // Revert in case of error
      try {
        const { data } = await supabase
          .from('project_favorites')
          .select('project_id')
          .eq('user_id', userId);
        const ids = data ? data.map((fav: any) => fav.project_id) : [];
        setFavorites(ids);
        localStorage.setItem(`devban_favorites_${userId}`, JSON.stringify(ids));
        window.dispatchEvent(new Event('devban_favorites_updated'));
      } catch (err) {
        // ignore
      }
    }
  };

  return { favorites, toggleFavorite };
}

