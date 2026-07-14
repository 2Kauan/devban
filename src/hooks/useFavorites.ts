import { useState, useEffect } from 'react';

export function useFavorites(userId: string | undefined) {
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    if (!userId) return;

    const loadFavorites = () => {
      const stored = localStorage.getItem(`devban_favorites_${userId}`);
      if (stored) {
        try {
          setFavorites(JSON.parse(stored));
        } catch (e) {
          setFavorites([]);
        }
      } else {
        setFavorites([]);
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

  const toggleFavorite = (projectId: string) => {
    if (!userId) return;
    setFavorites(prev => {
      const isFav = prev.includes(projectId);
      const newFavs = isFav ? prev.filter(id => id !== projectId) : [...prev, projectId];
      localStorage.setItem(`devban_favorites_${userId}`, JSON.stringify(newFavs));
      window.dispatchEvent(new Event('devban_favorites_updated'));
      return newFavs;
    });
  };

  return { favorites, toggleFavorite };
}
