import { Link } from "react-router-dom";
import { Facebook, Instagram, Twitter, Mail, Phone, MapPin, MessageCircle } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Footer = () => {
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [subscribing, setSubscribing] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;

    setSubscribing(true);
    try {
      const { error } = await supabase
        .from("newsletter_subscribers")
        .insert({ email: newsletterEmail.trim() });

      if (error) {
        if (error.code === "23505") {
          toast.info("You're already subscribed!");
        } else {
          throw error;
        }
      } else {
        toast.success("Successfully subscribed to our newsletter!");
      }
      setNewsletterEmail("");
    } catch (error: any) {
      toast.error("Failed to subscribe. Please try again.");
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <footer className="bg-accent text-accent-foreground">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div>
            <h3 className="text-xl font-bold mb-4 text-secondary">Simba Adventure</h3>
            <p className="text-sm mb-4">
              Experience the wild like never before. Your trusted partner for unforgettable African adventures.
            </p>
            <div className="flex space-x-4">
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="hover:text-secondary transition-colors">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="hover:text-secondary transition-colors">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="hover:text-secondary transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/" className="hover:text-secondary transition-colors">Home</Link>
              </li>
              <li>
                <Link to="/tours" className="hover:text-secondary transition-colors">Tours</Link>
              </li>
              <li>
                <Link to="/hotels" className="hover:text-secondary transition-colors">Hotels</Link>
              </li>
              <li>
                <Link to="/destinations" className="hover:text-secondary transition-colors">Destinations</Link>
              </li>
              <li>
                <Link to="/gallery" className="hover:text-secondary transition-colors">Gallery</Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-secondary transition-colors">About Us</Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-secondary transition-colors">Contact Us</Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact Us</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <a href="tel:+250788564396" className="flex items-center space-x-2 hover:text-secondary transition-colors">
                  <Phone className="h-4 w-4" />
                  <span>+250 788 564 396</span>
                </a>
              </li>
              <li>
                <a href="mailto:simba.tour.250@gmail.com" className="flex items-center space-x-2 hover:text-secondary transition-colors">
                  <Mail className="h-4 w-4" />
                  <span>simba.tour.250@gmail.com</span>
                </a>
              </li>
              <li>
                <a
                  href="https://maps.app.goo.gl/UuBCw4zSotmT7Z2d8"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 hover:text-secondary transition-colors"
                >
                  <MapPin className="h-4 w-4" />
                  <span>Kigali, Rwanda</span>
                </a>
              </li>
              <li>
                <a
                  href="https://wa.me/250788564396"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 hover:text-secondary transition-colors"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>WhatsApp</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Newsletter</h3>
            <p className="text-sm mb-4">Subscribe to get special offers and updates.</p>
            <form onSubmit={handleSubscribe} className="flex">
              <input
                type="email"
                placeholder="Your email"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                required
                className="px-3 py-2 text-sm rounded-l-md border-0 text-foreground bg-background flex-1"
              />
              <button
                type="submit"
                disabled={subscribing}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-r-md hover:bg-secondary/90 transition-colors disabled:opacity-50"
              >
                {subscribing ? "..." : "Subscribe"}
              </button>
            </form>
          </div>
        </div>

        <div className="border-t border-accent-foreground/20 mt-8 pt-8 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} Simba Adventure & Tourism. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
