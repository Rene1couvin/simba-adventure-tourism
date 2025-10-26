import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Booking {
  id: string;
  booking_date: string;
  number_of_people: number;
  total_price: number;
  status: string;
  special_requests: string | null;
  tour_id: string;
  user_id: string;
  profiles?: {
    full_name: string;
    phone: string | null;
  };
  tours?: {
    title: string;
    location: string;
  };
}

export const BookingManagement = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        profiles!bookings_user_id_fkey (
          full_name,
          phone
        ),
        tours!bookings_tour_id_fkey (
          title,
          location
        )
      `)
      .order('booking_date', { ascending: false });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      // Log admin access to booking data
      await supabase.rpc('log_admin_access', {
        _action: 'VIEW_BOOKINGS',
        _table_name: 'bookings',
        _accessed_fields: ['total_price', 'special_requests', 'user_id']
      });
      setBookings(data || []);
    }
  };

  const updateStatus = async (bookingId: string, newStatus: 'pending' | 'confirmed' | 'cancelled' | 'completed') => {
    const { error } = await supabase
      .from('bookings')
      .update({ status: newStatus })
      .eq('id', bookingId);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Booking status updated' });
      fetchBookings();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'default';
      case 'pending': return 'secondary';
      case 'cancelled': return 'destructive';
      case 'completed': return 'outline';
      default: return 'default';
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Booking Management</h2>
      
      <div className="grid gap-4">
        {bookings.map((booking) => (
          <Card key={booking.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusColor(booking.status)}>
                      {booking.status}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {new Date(booking.booking_date).toLocaleDateString()}
                    </span>
                  </div>
                  
                  {/* Customer Information */}
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">
                      Customer: {booking.profiles?.full_name || 'Unknown'}
                    </p>
                    {booking.profiles?.phone && (
                      <p className="text-sm text-muted-foreground">
                        Phone: {booking.profiles.phone}
                      </p>
                    )}
                  </div>

                  {/* Tour Information */}
                  {booking.tours && (
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">
                        Tour: {booking.tours.title}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Location: {booking.tours.location}
                      </p>
                    </div>
                  )}

                  {/* Booking Details */}
                  <p className="text-sm">
                    <strong>{booking.number_of_people}</strong> people • 
                    <strong className="ml-2">${booking.total_price}</strong>
                  </p>
                  
                  {booking.special_requests && (
                    <p className="text-sm text-muted-foreground">
                      Special requests: {booking.special_requests}
                    </p>
                  )}
                </div>
                <Select
                  value={booking.status}
                  onValueChange={(value) => updateStatus(booking.id, value as 'pending' | 'confirmed' | 'cancelled' | 'completed')}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
