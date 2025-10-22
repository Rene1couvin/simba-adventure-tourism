import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";
import { Link } from "react-router-dom";

const Destinations = () => {
  const destinations = [
    {
      name: "Serengeti National Park",
      country: "Tanzania",
      description: "Home to the Great Migration and the Big Five, offering unparalleled wildlife viewing opportunities.",
    },
    {
      name: "Ngorongoro Crater",
      country: "Tanzania",
      description: "A UNESCO World Heritage Site with the world's largest inactive volcanic caldera.",
    },
    {
      name: "Masai Mara",
      country: "Kenya",
      description: "Famous for exceptional populations of lions, leopards, and cheetahs.",
    },
    {
      name: "Tarangire National Park",
      country: "Tanzania",
      description: "Known for huge elephant herds and ancient baobab trees.",
    },
    {
      name: "Lake Manyara",
      country: "Tanzania",
      description: "Beautiful alkaline lake attracting thousands of flamingos and diverse birdlife.",
    },
    {
      name: "Amboseli National Park",
      country: "Kenya",
      description: "Best place to observe elephants up close with Mount Kilimanjaro backdrop.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-foreground mb-4">Safari Destinations</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Discover Africa's most spectacular wildlife reserves and national parks
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {destinations.map((destination, i) => (
            <Card key={i} className="overflow-hidden hover:shadow-xl transition-shadow">
              <div className="h-48 bg-gradient-to-br from-primary to-secondary relative">
                <div className="absolute bottom-4 left-4 bg-background/90 px-3 py-1 rounded-full text-sm font-semibold text-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {destination.country}
                </div>
              </div>
              <CardHeader>
                <CardTitle>{destination.name}</CardTitle>
                <CardDescription>{destination.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="default" className="w-full">
                  <Link to="/tours">View Tours</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Destinations;
