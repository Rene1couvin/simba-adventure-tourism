import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, User, LogOut, Shield } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useAdmin } from "@/hooks/useAdmin";
import { ThemeToggle } from "@/components/ThemeToggle";

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  const { isAdmin } = useAdmin();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/");
  };

  return (
    <nav className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-primary">Simba</span>
            <span className="text-2xl font-light text-foreground">Adventure</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-foreground hover:text-primary transition-colors">
              Home
            </Link>
            <Link to="/tours" className="text-foreground hover:text-primary transition-colors">
              Tours
            </Link>
            <Link to="/hotels" className="text-foreground hover:text-primary transition-colors">
              Hotels
            </Link>
            <Link to="/destinations" className="text-foreground hover:text-primary transition-colors">
              Destinations
            </Link>
            <Link to="/gallery" className="text-foreground hover:text-primary transition-colors">
              Gallery
            </Link>
            <Link to="/about" className="text-foreground hover:text-primary transition-colors">
              About
            </Link>
            <Link to="/contact" className="text-foreground hover:text-primary transition-colors">
              Contact
            </Link>
            
            {isAdmin && (
              <Link to="/admin" className="text-foreground hover:text-primary transition-colors flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Admin
              </Link>
            )}
            
            <ThemeToggle />
            
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <User className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="w-full cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild variant="default">
                <Link to="/auth">Login</Link>
              </Button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-foreground"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 space-y-3">
            <Link
              to="/"
              className="block text-foreground hover:text-primary transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Home
            </Link>
            <Link
              to="/tours"
              className="block text-foreground hover:text-primary transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Tours
            </Link>
            <Link
              to="/hotels"
              className="block text-foreground hover:text-primary transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Hotels
            </Link>
            <Link
              to="/destinations"
              className="block text-foreground hover:text-primary transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Destinations
            </Link>
            <Link
              to="/gallery"
              className="block text-foreground hover:text-primary transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Gallery
            </Link>
            <Link
              to="/about"
              className="block text-foreground hover:text-primary transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              About
            </Link>
            <Link
              to="/contact"
              className="block text-foreground hover:text-primary transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Contact
            </Link>
            
            {isAdmin && (
              <Link
                to="/admin"
                className="block text-foreground hover:text-primary transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Shield className="inline h-4 w-4 mr-2" />
                Admin Panel
              </Link>
            )}
            
            {user ? (
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => {
                  handleSignOut();
                  setMobileMenuOpen(false);
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            ) : (
              <Button asChild variant="default" className="w-full">
                <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                  Login
                </Link>
              </Button>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;