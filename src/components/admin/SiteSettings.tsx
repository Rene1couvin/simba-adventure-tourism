import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, Palette, Layout } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface BackgroundSetting {
  url: string;
  overlay: number;
}

interface ThemeColors {
  primary: string;
  secondary: string;
}

interface NavbarLayout {
  type: 'navbar' | 'sidebar';
  sticky: boolean;
}

export const SiteSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [backgrounds, setBackgrounds] = useState<Record<string, BackgroundSetting>>({
    home: { url: '', overlay: 0.5 },
    about: { url: '', overlay: 0.5 },
    contact: { url: '', overlay: 0.5 },
  });
  const [themeColors, setThemeColors] = useState<ThemeColors>({ primary: '#10B981', secondary: '#3B82F6' });
  const [navbarLayout, setNavbarLayout] = useState<NavbarLayout>({ type: 'navbar', sticky: true });
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('*');

      if (error) throw error;

      data?.forEach((setting) => {
        const value = setting.setting_value as any;
        switch (setting.setting_key) {
          case 'home_background':
            setBackgrounds(prev => ({ ...prev, home: value }));
            break;
          case 'about_background':
            setBackgrounds(prev => ({ ...prev, about: value }));
            break;
          case 'contact_background':
            setBackgrounds(prev => ({ ...prev, contact: value }));
            break;
          case 'theme_colors':
            setThemeColors(value);
            break;
          case 'navbar_layout':
            setNavbarLayout(value);
            break;
        }
      });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (page: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `backgrounds/${page}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('tour-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('tour-images')
        .getPublicUrl(fileName);

      setBackgrounds(prev => ({
        ...prev,
        [page]: { ...prev[page], url: publicUrl },
      }));

      toast({ title: 'Success', description: 'Background image uploaded' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const saveSetting = async (key: string, value: any) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('site_settings')
        .update({ setting_value: value, updated_at: new Date().toISOString() })
        .eq('setting_key', key);

      if (error) throw error;
      toast({ title: 'Success', description: 'Setting saved' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const saveAllBackgrounds = async () => {
    setSaving(true);
    try {
      await Promise.all([
        saveSetting('home_background', backgrounds.home),
        saveSetting('about_background', backgrounds.about),
        saveSetting('contact_background', backgrounds.contact),
      ]);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="backgrounds">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="backgrounds">Backgrounds</TabsTrigger>
          <TabsTrigger value="colors">Theme Colors</TabsTrigger>
          <TabsTrigger value="layout">Layout</TabsTrigger>
        </TabsList>

        <TabsContent value="backgrounds" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" /> Page Backgrounds
              </CardTitle>
              <CardDescription>Upload background images for different pages</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {['home', 'about', 'contact'].map((page) => (
                <div key={page} className="space-y-3 p-4 border rounded-lg">
                  <Label className="capitalize font-semibold">{page} Page</Label>
                  <div className="flex gap-4 items-center">
                    {backgrounds[page].url && (
                      <img
                        src={backgrounds[page].url}
                        alt={`${page} background`}
                        className="h-20 w-32 object-cover rounded"
                      />
                    )}
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(page, e)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Overlay Opacity: {Math.round(backgrounds[page].overlay * 100)}%</Label>
                    <Slider
                      value={[backgrounds[page].overlay]}
                      onValueChange={([v]) => setBackgrounds(prev => ({
                        ...prev,
                        [page]: { ...prev[page], overlay: v },
                      }))}
                      max={1}
                      step={0.1}
                    />
                  </div>
                </div>
              ))}
              <Button onClick={saveAllBackgrounds} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Backgrounds
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="colors">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" /> Theme Colors
              </CardTitle>
              <CardDescription>Customize your site's color scheme</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={themeColors.primary}
                      onChange={(e) => setThemeColors(prev => ({ ...prev, primary: e.target.value }))}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      value={themeColors.primary}
                      onChange={(e) => setThemeColors(prev => ({ ...prev, primary: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Secondary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={themeColors.secondary}
                      onChange={(e) => setThemeColors(prev => ({ ...prev, secondary: e.target.value }))}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      value={themeColors.secondary}
                      onChange={(e) => setThemeColors(prev => ({ ...prev, secondary: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
              <Button onClick={() => saveSetting('theme_colors', themeColors)} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Colors
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="layout">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layout className="h-5 w-5" /> Navigation Layout
              </CardTitle>
              <CardDescription>Configure navigation style</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Use Sidebar Layout</Label>
                  <p className="text-sm text-muted-foreground">Switch between top navbar and sidebar navigation</p>
                </div>
                <Switch
                  checked={navbarLayout.type === 'sidebar'}
                  onCheckedChange={(checked) => setNavbarLayout(prev => ({ ...prev, type: checked ? 'sidebar' : 'navbar' }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Sticky Navigation</Label>
                  <p className="text-sm text-muted-foreground">Keep navigation fixed at top while scrolling</p>
                </div>
                <Switch
                  checked={navbarLayout.sticky}
                  onCheckedChange={(checked) => setNavbarLayout(prev => ({ ...prev, sticky: checked }))}
                />
              </div>
              <Button onClick={() => saveSetting('navbar_layout', navbarLayout)} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Layout
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
