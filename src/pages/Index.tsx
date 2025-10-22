import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { MapPin, Calendar, Users, Star } from "lucide-react";

const Index = () => {
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
            Discover the untamed beauty of Africa with unforgettable safari adventures
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" variant="secondary" className="text-lg">
              <Link to="/tours">Explore Tours</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="text-lg border-accent-foreground text-accent-foreground hover:bg-accent-foreground/10">
              <Link to="/contact">Book Now</Link>
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
                Explore Africa's most stunning wildlife reserves and national parks
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
              <Calendar className="h-12 w-12 mx-auto mb-4 text-primary" />
              <CardTitle>Flexible Booking</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Easy online booking with flexible dates and customizable packages
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

      {/* Popular Tours Preview */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-foreground mb-4">Popular Safari Tours</h2>
            <p className="text-muted-foreground text-lg">
              Hand-picked adventures for the ultimate wildlife experience
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="h-48 bg-gradient-to-br from-primary to-secondary" />
                <CardHeader>
                  <CardTitle>Serengeti Explorer</CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Serengeti National Park
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    7-day adventure through the heart of Tanzania's wildlife paradise
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-primary">$2,499</span>
                    <Button asChild variant="secondary">
                      <Link to="/tours">View Details</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center">
            <Button asChild size="lg" variant="default">
              <Link to="/tours">View All Tours</Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
