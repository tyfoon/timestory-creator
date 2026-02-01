import { useCallback } from 'react';

const BLACKLIST_KEY = 'image_blacklist';

/**
 * Get all blacklisted image URLs from localStorage
 */
export function getBlacklistedImages(): string[] {
  try {
    const stored = localStorage.getItem(BLACKLIST_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Add an image URL to the blacklist
 */
export function addToBlacklist(imageUrl: string): void {
  try {
    const current = getBlacklistedImages();
    if (!current.includes(imageUrl)) {
      current.push(imageUrl);
      localStorage.setItem(BLACKLIST_KEY, JSON.stringify(current));
    }
  } catch (e) {
    console.warn('Failed to add to blacklist:', e);
  }
}

/**
 * Check if an image URL is blacklisted
 */
export function isBlacklisted(imageUrl: string): boolean {
  return getBlacklistedImages().includes(imageUrl);
}

/**
 * Clear all blacklisted images
 */
export function clearBlacklist(): void {
  localStorage.removeItem(BLACKLIST_KEY);
}

/**
 * Hook for managing image blacklist
 */
export function useImageBlacklist() {
  const blacklistImage = useCallback((imageUrl: string) => {
    addToBlacklist(imageUrl);
  }, []);

  const checkBlacklisted = useCallback((imageUrl: string) => {
    return isBlacklisted(imageUrl);
  }, []);

  const clearAll = useCallback(() => {
    clearBlacklist();
  }, []);

  return {
    blacklistImage,
    checkBlacklisted,
    clearAll,
    getAll: getBlacklistedImages,
  };
}
