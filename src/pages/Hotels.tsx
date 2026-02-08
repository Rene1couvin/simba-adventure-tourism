import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Star, Users, Wifi, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { HotelBookingDialog } from "@/components/HotelBookingDialog";
import { useNavigate } from "react-router-dom";

interface RoomType {
  id: string;
  name: string;
  description: string | null;
  price_per_night: number;
  max_guests: number;
  bed_type: string;
  image_url: string | null;
  amenities: string[];
  total_rooms: number;
}

interface Hotel {
  id: string;
  name: string;
  description: string;
  location: string;
  address: string | null;
  star_rating: number;
  image_url: string | null;
  amenities: string[];
  check_in_time: string;
  check_out_time: string;
  room_types: RoomType[];
}

const Hotels = () => {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<RoomType | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchHotels();
  }, []);

  const fetchHotels = async () => {
    try {
      const { data: hotelsData, error: hotelsError } = await supabase
        .from("hotels")
        .select("*")
        .eq("available", true)
        .order("created_at", { ascending: false });

      if (hotelsError) throw hotelsError;

      const { data: roomsData, error: roomsError } = await supabase
        .from("room_types")
        .select("*")
        .eq("available", true);

      if (roomsError) throw roomsError;

      const hotelsWithRooms = (hotelsData || []).map((hotel) => ({
        ...hotel,
        amenities: hotel.amenities || [],
        room_types: (roomsData || [])
          .filter((r) => r.hotel_id === hotel.id)
          .map((r) => ({ ...r, amenities: r.amenities || [] })),
      }));

      setHotels(hotelsWithRooms);
    } catch (error: any) {
      toast.error("Failed to load hotels");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleBookRoom = async (hotel: Hotel, room: RoomType) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
      return;
    }
    setSelectedHotel(hotel);
    setSelectedRoom(room);
    setBookingOpen(true);
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
          <h1 className="text-5xl font-bold text-foreground mb-4">Simba Hotels & Lodges</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Find the perfect stay for your African adventure — from luxury resorts to cozy lodges
          </p>
        </div>

        {hotels.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-xl text-muted-foreground">No hotels available at the moment. Check back soon!</p>
          </div>
        ) : (
          <div className="space-y-12">
            {hotels.map((hotel) => (
              <Card key={hotel.id} className="overflow-hidden">
                <div className="md:flex">
                  <div className="md:w-1/3 h-64 md:h-auto bg-gradient-to-br from-secondary to-accent relative">
                    {hotel.image_url && (
                      <img src={hotel.image_url} alt={hotel.name} className="w-full h-full object-cover" loading="lazy" />
                    )}
                  </div>
                  <div className="md:w-2/3">
                    <CardHeader>
                      <div className="flex items-start justify-between flex-wrap gap-2">
                        <div>
                          <CardTitle className="text-2xl">{hotel.name}</CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-1">
                            <MapPin className="h-4 w-4" />
                            {hotel.location}
                            {hotel.address && <span className="text-xs">• {hotel.address}</span>}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: hotel.star_rating }).map((_, i) => (
                            <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                          ))}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground mb-4">{hotel.description}</p>

                      {hotel.amenities.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {hotel.amenities.map((a) => (
                            <Badge key={a} variant="secondary">{a}</Badge>
                          ))}
                        </div>
                      )}

                      <p className="text-sm text-muted-foreground mb-4">
                        Check-in: <strong>{hotel.check_in_time}</strong> • Check-out: <strong>{hotel.check_out_time}</strong>
                      </p>

                      {/* Room Types */}
                      {hotel.room_types.length > 0 ? (
                        <div className="space-y-3">
                          <h4 className="font-semibold text-foreground">Available Rooms</h4>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                            {hotel.room_types.map((room) => (
                              <div key={room.id} className="border border-border rounded-lg p-4 flex flex-col gap-2">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h5 className="font-medium text-foreground">{room.name}</h5>
                                    <p className="text-sm text-muted-foreground">{room.bed_type} bed</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-lg font-bold text-primary">${room.price_per_night}</p>
                                    <p className="text-xs text-muted-foreground">per night</p>
                                  </div>
                                </div>
                                {room.description && (
                                  <p className="text-sm text-muted-foreground line-clamp-2">{room.description}</p>
                                )}
                                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Users className="h-3 w-3" /> Max {room.max_guests} guests
                                  </span>
                                  <span>{room.total_rooms} rooms</span>
                                </div>
                                {room.amenities.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {room.amenities.slice(0, 4).map((a) => (
                                      <Badge key={a} variant="outline" className="text-xs">{a}</Badge>
                                    ))}
                                  </div>
                                )}
                                <Button
                                  className="mt-2"
                                  onClick={() => handleBookRoom(hotel, room)}
                                >
                                  Book This Room
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">No rooms listed yet.</p>
                      )}
                    </CardContent>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Footer />

      {selectedHotel && selectedRoom && (
        <HotelBookingDialog
          open={bookingOpen}
          onOpenChange={setBookingOpen}
          hotel={selectedHotel}
          roomType={selectedRoom}
        />
      )}
    </div>
  );
};

export default Hotels;
