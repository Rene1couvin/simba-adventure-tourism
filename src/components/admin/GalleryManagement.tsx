import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Heart, Users, Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';

interface GalleryImage {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  is_featured: boolean;
  created_at: string;
}

interface ImageLike {
  user_id: string;
  profiles: { full_name: string } | null;
}

export const GalleryManagement = () => {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [likesDialogOpen, setLikesDialogOpen] = useState(false);
  const [selectedImageLikes, setSelectedImageLikes] = useState<{ image_id: string; users: string[] }>({ image_id: '', users: [] });
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

  const viewLikes = async (imageId: string) => {
    try {
      const { data, error } = await supabase
        .from('image_likes')
        .select('user_id, profiles(full_name)')
        .eq('image_id', imageId);

      if (error) throw error;

      const users = data?.map((like: any) => like.profiles?.full_name || 'Unknown User') || [];
      setSelectedImageLikes({ image_id: imageId, users });
      setLikesDialogOpen(true);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gallery Management</h2>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {images.map((image) => (
          <Card key={image.id}>
            <div className="h-48 overflow-hidden">
              <img src={image.image_url} alt={image.title} className="w-full h-full object-cover" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{image.title}</CardTitle>
            </CardHeader>
            <CardContent>
              {image.description && (
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{image.description}</p>
              )}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => viewLikes(image.id)}>
                  <Heart className="mr-1 h-4 w-4" /> View Likes
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(image.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={likesDialogOpen} onOpenChange={setLikesDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" /> Users Who Liked This Image
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {selectedImageLikes.users.length === 0 ? (
              <p className="text-muted-foreground">No likes yet</p>
            ) : (
              selectedImageLikes.users.map((user, idx) => (
                <div key={idx} className="p-2 bg-muted rounded">{user}</div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
