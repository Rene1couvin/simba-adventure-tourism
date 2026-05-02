import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Heart, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface GalleryImage {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  is_featured: boolean;
  created_at: string;
  tour_id: string | null;
  tour_title: string | null;
  likes_count: number;
  user_has_liked: boolean;
}

const Gallery = () => {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id || null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    fetchImages();
  }, [userId]);

  const fetchImages = async () => {
    try {
      const { data: imagesData, error: imagesError } = await supabase
        .from('gallery_images')
        .select('*, tours(title)')
        .order('created_at', { ascending: false });

      if (imagesError) throw imagesError;

      const { data: likesData } = await supabase
        .from('image_likes')
        .select('image_id');

      let userLikes: string[] = [];
      if (userId) {
        const { data: userLikesData } = await supabase
          .from('image_likes')
          .select('image_id')
          .eq('user_id', userId);
        userLikes = userLikesData?.map(l => l.image_id) || [];
      }

      const likeCounts: Record<string, number> = {};
      likesData?.forEach(like => {
        likeCounts[like.image_id] = (likeCounts[like.image_id] || 0) + 1;
      });

      const processedImages: GalleryImage[] = (imagesData as any[])?.map(img => ({
        ...img,
        tour_title: img.tours?.title || null,
        likes_count: likeCounts[img.id] || 0,
        user_has_liked: userLikes.includes(img.id),
      })) || [];

      setImages(processedImages);
    } catch (error: any) {
      toast.error("Failed to load gallery");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (imageId: string, isLiked: boolean) => {
    if (!userId) {
      toast.error("Please login to like images");
      return;
    }

    try {
      if (isLiked) {
        await supabase
          .from('image_likes')
          .delete()
          .eq('image_id', imageId)
          .eq('user_id', userId);
      } else {
        await supabase
          .from('image_likes')
          .insert({ image_id: imageId, user_id: userId });
      }

      setImages(prev => prev.map(img => {
        if (img.id === imageId) {
          return {
            ...img,
            likes_count: isLiked ? img.likes_count - 1 : img.likes_count + 1,
            user_has_liked: !isLiked,
          };
        }
        return img;
      }));
    } catch (error: any) {
      toast.error("Failed to update like");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-12 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-foreground mb-4">Simba Gallery</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Explore stunning moments from our adventures
          </p>
        </div>

        {images.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-xl text-muted-foreground">No images in the gallery yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image) => (
              <div
                key={image.id}
                className="group relative aspect-square rounded-lg overflow-hidden bg-muted"
              >
                <img
                  src={image.image_url}
                  alt={image.title}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                  <h3 className="text-white font-semibold">{image.title}</h3>
                  {image.description && (
                    <p className="text-white/80 text-sm line-clamp-2">{image.description}</p>
                  )}
                </div>
                <button
                  onClick={() => handleLike(image.id, image.user_has_liked)}
                  className="absolute top-3 right-3 p-2 rounded-full bg-white/80 hover:bg-white transition-colors"
                >
                  <Heart
                    className={cn(
                      "h-5 w-5 transition-colors",
                      image.user_has_liked ? "fill-red-500 text-red-500" : "text-gray-600"
                    )}
                  />
                </button>
                <div className="absolute bottom-3 right-3 bg-black/60 text-white text-sm px-2 py-1 rounded-full flex items-center gap-1">
                  <Heart className="h-3 w-3" />
                  {image.likes_count}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default Gallery;
