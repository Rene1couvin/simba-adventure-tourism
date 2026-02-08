import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { MapPin, Calendar, Users, Star, Hotel, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Tour {
  id: string;
  title: string;
  description: string;
  location: string;
  price: number;
  image_url: string | null;
}

interface HotelPreview {
  id: string;
  name: string;
  location: string;
  star_rating: number;
  image_url: string | null;
}

const Index = () => {
  const [tours, setTours] = useState<Tour[]>([]);
  const [hotels, setHotels] = useState<HotelPreview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [toursRes, hotelsRes] = await Promise.all([
        supabase.from("tours").select("id, title, description, location, price, image_url").eq("available", true).order("created_at", { ascending: false }).limit(3),
        supabase.from("hotels").select("id, name, location, star_rating, image_url").eq("available", true).order("created_at", { ascending: false }).limit(3),
      ]);
      setTours(toursRes.data || []);
      setHotels(hotelsRes.data || []);
      setLoading(false);
    };
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative h-[600px] flex items-center justify-center text-center bg-gradient-to-br from-accent to-primary">
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative z-10 container mx-auto px-4">
          <h1 className="text-5xl md:text-7xl font-bold text-accent-foreground mb-6">
            Experience the Wild
            <br />
            <span className="text-secondary">Like Never Before</span>
          </h1>
          <p className="text-xl md:text-2xl text-accent-foreground/90 mb-8 max-w-2xl mx-auto">
            Discover the untamed beauty of Africa with unforgettable Simba adventures
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" variant="secondary" className="text-lg">
              <Link to="/tours">Explore Tours</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="text-lg border-accent-foreground text-accent-foreground hover:bg-accent-foreground/10">
              <Link to="/hotels">Book Hotels</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-foreground mb-4">Why Choose Simba Adventure?</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            We provide world-class safari experiences with expert guides and unmatched service
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="text-center">
            <CardHeader>
              <MapPin className="h-12 w-12 mx-auto mb-4 text-primary" />
              <CardTitle>Best Destinations</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Explore Africa's most stunning wildlife reserves and national parks with Simba
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Users className="h-12 w-12 mx-auto mb-4 text-primary" />
              <CardTitle>Expert Guides</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Experienced local guides with deep knowledge of wildlife and culture
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Hotel className="h-12 w-12 mx-auto mb-4 text-primary" />
              <CardTitle>Luxury Hotels</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Premium accommodations from cozy lodges to 5-star resorts
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Star className="h-12 w-12 mx-auto mb-4 text-primary" />
              <CardTitle>5-Star Service</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Luxury accommodations and exceptional customer service throughout
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Popular Tours Preview - Dynamic */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-foreground mb-4">Popular Simba Tours</h2>
            <p className="text-muted-foreground text-lg">
              Hand-picked adventures for the ultimate wildlife experience
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : tours.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No tours available yet. Check back soon!</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
              {tours.map((tour) => (
                <Card key={tour.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="h-48 bg-gradient-to-br from-primary to-secondary relative">
                    {tour.image_url && (
                      <img src={tour.image_url} alt={tour.title} className="w-full h-full object-cover" loading="lazy" />
                    )}
                  </div>
                  <CardHeader>
                    <CardTitle>{tour.title}</CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {tour.location}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4 line-clamp-2">{tour.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-primary">${tour.price}</span>
                      <Button asChild variant="secondary">
                        <Link to="/tours">View Details</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="text-center">
            <Button asChild size="lg" variant="default">
              <Link to="/tours">View All Tours</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Hotels Preview - Dynamic */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-foreground mb-4">Featured Hotels</h2>
            <p className="text-muted-foreground text-lg">
              Stay in comfort with our handpicked lodges and resorts
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : hotels.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Hotels coming soon!</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
              {hotels.map((hotel) => (
                <Card key={hotel.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="h-48 bg-gradient-to-br from-secondary to-accent relative">
                    {hotel.image_url && (
                      <img src={hotel.image_url} alt={hotel.name} className="w-full h-full object-cover" loading="lazy" />
                    )}
                  </div>
                  <CardHeader>
                    <CardTitle>{hotel.name}</CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {hotel.location}
                      <span className="ml-auto flex items-center gap-1">
                        {Array.from({ length: hotel.star_rating }).map((_, i) => (
                          <Star key={i} className="h-3 w-3 fill-primary text-primary" />
                        ))}
                      </span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button asChild variant="secondary" className="w-full">
                      <Link to="/hotels">View Rooms</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="text-center">
            <Button asChild size="lg" variant="default">
              <Link to="/hotels">View All Hotels</Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
