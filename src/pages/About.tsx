import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, Target, Eye } from "lucide-react";

const About = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative h-[400px] flex items-center justify-center bg-gradient-to-br from-accent to-primary">
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative z-10 text-center">
          <h1 className="text-6xl font-bold text-accent-foreground mb-4">About Simba Adventure</h1>
          <p className="text-xl text-accent-foreground/90">Your gateway to Africa's wild beauty</p>
        </div>
      </section>

      {/* Company Story */}
      <section className="py-20 container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-foreground mb-6 text-center">Our Story</h2>
          <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
            Founded in 2010, Simba Adventure & Tourism has been at the forefront of providing authentic African safari experiences. 
            Our journey began with a simple vision: to share the breathtaking beauty and incredible wildlife of Africa with travelers 
            from around the world.
          </p>
          <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
            Over the years, we've grown from a small team of passionate wildlife enthusiasts to one of East Africa's most trusted 
            safari operators. Our commitment to sustainable tourism and wildlife conservation remains at the heart of everything we do.
          </p>
        </div>
      </section>

      {/* Mission, Vision, Values */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <Card className="text-center">
              <CardContent className="pt-8">
                <Heart className="h-16 w-16 mx-auto mb-4 text-primary" />
                <h3 className="text-2xl font-bold text-foreground mb-4">Our Mission</h3>
                <p className="text-muted-foreground">
                  To provide unforgettable safari experiences while promoting wildlife conservation and supporting local communities.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="pt-8">
                <Eye className="h-16 w-16 mx-auto mb-4 text-primary" />
                <h3 className="text-2xl font-bold text-foreground mb-4">Our Vision</h3>
                <p className="text-muted-foreground">
                  To be Africa's leading sustainable safari operator, setting the standard for eco-tourism and wildlife preservation.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="pt-8">
                <Target className="h-16 w-16 mx-auto mb-4 text-primary" />
                <h3 className="text-2xl font-bold text-foreground mb-4">Our Values</h3>
                <p className="text-muted-foreground">
                  Excellence, sustainability, authenticity, and respect for nature and local cultures guide every decision we make.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-foreground mb-4">Meet Our Team</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Our experienced guides and staff are passionate about wildlife and dedicated to making your safari extraordinary
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
          {[
            { name: "BYUKUSENGE Eric", role: "Senior Safari Guide", experience: "15+ years experience" },
            { name: "NSHIMIYIMANA Fabrice", role: "Tour Coordinator", experience: "10+ years experience" },
            { name: "NIYONSENGA EEAN Claude", role: "Wildlife Expert", experience: "12+ years experience" },
            { name: "NISINGIZWE Jean Aime", role: "Operations Manager", experience: "8+ years experience" },
          ].map((member, i) => (
            <Card key={i} className="text-center overflow-hidden">
              <div className="h-64 bg-gradient-to-br from-primary to-secondary" />
              <CardContent className="pt-6">
                <h3 className="text-xl font-bold text-foreground mb-1">{member.name}</h3>
                <p className="text-sm text-muted-foreground mb-2">{member.role}</p>
                <p className="text-xs text-muted-foreground">{member.experience}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default About;
