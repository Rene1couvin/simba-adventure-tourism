import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  primaryColor: string;
  setPrimaryColor: (color: string) => void;
  sidebarLayout: boolean;
  setSidebarLayout: (enabled: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>('system');
  const [primaryColor, setPrimaryColorState] = useState('#10B981');
  const [sidebarLayout, setSidebarLayoutState] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Check auth state
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id || null);
      if (session?.user?.id) {
        loadPreferences(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id || null);
      if (session?.user?.id) {
        loadPreferences(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  }, [theme]);

  const loadPreferences = async (uid: string) => {
    const { data } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', uid)
      .single();

    if (data) {
      setThemeState(data.theme as Theme);
      setPrimaryColorState(data.primary_color || '#10B981');
      setSidebarLayoutState(data.sidebar_layout || false);
    }
  };

  const savePreferences = async (updates: Partial<{ theme: Theme; primary_color: string; sidebar_layout: boolean }>) => {
    if (!userId) return;

    const { error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: userId,
        ...updates,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (error) console.error('Error saving preferences:', error);
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    savePreferences({ theme: newTheme });
  };

  const setPrimaryColor = (color: string) => {
    setPrimaryColorState(color);
    savePreferences({ primary_color: color });
  };

  const setSidebarLayout = (enabled: boolean) => {
    setSidebarLayoutState(enabled);
    savePreferences({ sidebar_layout: enabled });
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, primaryColor, setPrimaryColor, sidebarLayout, setSidebarLayout }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
