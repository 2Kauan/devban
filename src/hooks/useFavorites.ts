import { useState, useEffect } from 'react';

export function useFavorites(userId: string | undefined) {
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    if (!userId) return;
    const stored = localStorage.getItem(`devban_favorites_${userId}`);
    if (stored) {
      try {
        setFavorites(JSON.parse(stored));
      } catch (e) {
        setFavorites([]);
      }
    }
  }, [userId]);

  const toggleFavorite = (projectId: string) => {
    if (!userId) return;
    setFavorites(prev => {
      const isFav = prev.includes(projectId);
      const newFavs = isFav ? prev.filter(id => id !== projectId) : [...prev, projectId];
      localStorage.setItem(`devban_favorites_${userId}`, JSON.stringify(newFavs));
      return newFavs;
    });
  };

  return { favorites, toggleFavorite };
}
