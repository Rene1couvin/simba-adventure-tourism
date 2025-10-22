import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Users } from "lucide-react";
import { Link } from "react-router-dom";

const Tours = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-foreground mb-4">Safari Tours & Packages</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose from our carefully curated collection of African safari adventures
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="overflow-hidden hover:shadow-xl transition-shadow">
              <div className="h-56 bg-gradient-to-br from-primary to-secondary relative">
                <div className="absolute top-4 right-4 bg-secondary text-secondary-foreground px-3 py-1 rounded-full text-sm font-semibold">
                  Featured
                </div>
              </div>
              <CardHeader>
                <CardTitle>Serengeti Grand Safari</CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Serengeti National Park, Tanzania
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Experience the Great Migration and witness incredible wildlife in their natural habitat.
                  This comprehensive tour includes luxury accommodations and expert guides.
                </p>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>7 Days / 6 Nights</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>Max 6 people</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <div>
                    <p className="text-sm text-muted-foreground">From</p>
                    <p className="text-3xl font-bold text-primary">$2,499</p>
                  </div>
                  <Button asChild variant="default">
                    <Link to="/auth">Book Now</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Tours;
