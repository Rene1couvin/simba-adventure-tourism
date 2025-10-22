import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Gallery = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-foreground mb-4">Safari Gallery</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Explore stunning moments from our safari adventures
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square rounded-lg overflow-hidden hover:scale-105 transition-transform cursor-pointer bg-gradient-to-br from-primary to-secondary"
            >
              {/* Placeholder for images */}
            </div>
          ))}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Gallery;
