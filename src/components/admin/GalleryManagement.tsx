import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Heart, Users, Loader2, Search, Calendar } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface GalleryImage {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  is_featured: boolean;
  created_at: string;
}

interface LikeDetail {
  user_id: string;
  full_name: string;
  created_at: string;
}

export const GalleryManagement = () => {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [likesDialogOpen, setLikesDialogOpen] = useState(false);
  const [selectedImageTitle, setSelectedImageTitle] = useState('');
  const [selectedImageLikes, setSelectedImageLikes] = useState<LikeDetail[]>([]);
  const [likesSearch, setLikesSearch] = useState('');
  const [imageSearch, setImageSearch] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image_url: '',
    is_featured: false,
  });
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    try {
      const { data, error } = await supabase
        .from('gallery_images')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setImages(data || []);

      // Fetch all like counts
      const { data: likesData } = await supabase
        .from('image_likes')
        .select('image_id');

      const counts: Record<string, number> = {};
      likesData?.forEach(l => {
        counts[l.image_id] = (counts[l.image_id] || 0) + 1;
      });
      setLikeCounts(counts);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `gallery/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('tour-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('tour-images')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, image_url: publicUrl }));
      toast({ title: 'Success', description: 'Image uploaded successfully' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Date.now()}-${i}.${fileExt}`;
          const filePath = `gallery/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('tour-images')
            .upload(filePath, file);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('tour-images')
            .getPublicUrl(filePath);

          // Use filename (without extension) as title
          const title = file.name.replace(/\.[^/.]+$/, '');

          const { error: insertError } = await supabase
            .from('gallery_images')
            .insert({
              title,
              description: null,
              image_url: publicUrl,
              is_featured: false,
            });

          if (insertError) throw insertError;
          successCount++;
        } catch (err) {
          console.error('Failed to upload', file.name, err);
          failCount++;
        }
      }

      toast({
        title: 'Bulk Upload Complete',
        description: `${successCount} uploaded${failCount > 0 ? `, ${failCount} failed` : ''}`,
        variant: failCount > 0 ? 'destructive' : 'default',
      });
      fetchImages();
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('gallery_images')
        .insert({
          title: formData.title,
          description: formData.description || null,
          image_url: formData.image_url,
          is_featured: formData.is_featured,
        });

      if (error) throw error;

      toast({ title: 'Success', description: 'Image added to gallery' });
      setDialogOpen(false);
      setFormData({ title: '', description: '', image_url: '', is_featured: false });
      fetchImages();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('gallery_images')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Success', description: 'Image deleted from gallery' });
      fetchImages();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const viewLikes = async (imageId: string, imageTitle: string) => {
    try {
      const { data, error } = await supabase
        .from('image_likes')
        .select('user_id, created_at, profiles(full_name)')
        .eq('image_id', imageId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const likes: LikeDetail[] = data?.map((like: any) => ({
        user_id: like.user_id,
        full_name: like.profiles?.full_name || 'Unknown User',
        created_at: like.created_at,
      })) || [];

      setSelectedImageTitle(imageTitle);
      setSelectedImageLikes(likes);
      setLikesSearch('');
      setLikesDialogOpen(true);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const filteredLikes = selectedImageLikes.filter(l =>
    l.full_name.toLowerCase().includes(likesSearch.toLowerCase())
  );

  const filteredImages = images.filter(img =>
    img.title.toLowerCase().includes(imageSearch.toLowerCase())
  );

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h2 className="text-2xl font-bold">Gallery Management</h2>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search images..."
              value={imageSearch}
              onChange={(e) => setImageSearch(e.target.value)}
              className="pl-9 w-full sm:w-64"
            />
          </div>
          <Button asChild variant="secondary" disabled={uploading}>
            <label className="cursor-pointer">
              {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Bulk Upload
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleBulkUpload}
                disabled={uploading}
              />
            </label>
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Add Image</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Gallery Image</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Title</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Image</Label>
                  <Input type="file" accept="image/*" onChange={handleFileUpload} />
                  {uploading && <p className="text-sm text-muted-foreground mt-1">Uploading...</p>}
                  {formData.image_url && (
                    <img src={formData.image_url} alt="Preview" className="mt-2 h-32 object-cover rounded" />
                  )}
                </div>
                <Button type="submit" disabled={!formData.image_url || !formData.title}>
                  Add to Gallery
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredImages.map((image) => (
          <Card key={image.id} className="overflow-hidden">
            <div className="h-48 overflow-hidden">
              <img src={image.image_url} alt={image.title} className="w-full h-full object-cover" />
            </div>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{image.title}</CardTitle>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Heart className="h-3 w-3" />
                  {likeCounts[image.id] || 0}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {image.description && (
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{image.description}</p>
              )}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => viewLikes(image.id, image.title)}>
                  <Users className="mr-1 h-4 w-4" /> View Likes
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(image.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Likes Detail Dialog */}
      <Dialog open={likesDialogOpen} onOpenChange={setLikesDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-destructive" /> {selectedImageTitle}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Total Likes: <span className="font-semibold text-foreground">{selectedImageLikes.length}</span>
              </p>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by username..."
                value={likesSearch}
                onChange={(e) => setLikesSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <ScrollArea className="h-[300px]">
              {filteredLikes.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  {selectedImageLikes.length === 0 ? 'No likes yet' : 'No matching users'}
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredLikes.map((like, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-medium text-sm">{like.full_name}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(like.created_at).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                        {' '}
                        {new Date(like.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
