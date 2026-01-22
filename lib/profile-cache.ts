interface CachedUserProfile {
  email: string;
  full_name?: string;
  timestamp: number;
}

const CACHE_KEY = 'user_profile_cache';
const CACHE_DURATION = 60 * 60 * 1000; // 1小时

export function getCachedProfile(): CachedUserProfile | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const data: CachedUserProfile = JSON.parse(cached);
    const now = Date.now();
    
    // 检查是否过期
    if (now - data.timestamp > CACHE_DURATION) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    
    return data;
  } catch {
    return null;
  }
}

export function setCachedProfile(profile: { email: string; full_name?: string }) {
  const data: CachedUserProfile = {
    ...profile,
    timestamp: Date.now(),
  };
  localStorage.setItem(CACHE_KEY, JSON.stringify(data));
}

export function clearProfileCache() {
  localStorage.removeItem(CACHE_KEY);
}