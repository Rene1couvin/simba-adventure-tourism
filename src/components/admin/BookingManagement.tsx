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
import { Check, X, Loader2, Mail } from 'lucide-react';

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
    id: string;
  } | null;
  users?: {
    email: string;
  } | null;
  tours?: {
    title: string;
    location: string;
  } | null;
}

export const BookingManagement = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          tours (
            title,
            location
          )
        `)
        .order('booking_date', { ascending: false });

      if (error) throw error;

      // Fetch profiles for each booking
      const userIds = [...new Set(data?.map(b => b.user_id) || [])];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, phone')
        .in('id', userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

      const enrichedBookings = data?.map(booking => ({
        ...booking,
        profiles: profilesMap.get(booking.user_id) || null,
      })) || [];

      // Log admin access to booking data
      await supabase.rpc('log_admin_access', {
        _action: 'VIEW_BOOKINGS',
        _table_name: 'bookings',
        _accessed_fields: ['total_price', 'special_requests', 'user_id']
      });
      
      setBookings(enrichedBookings as Booking[]);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (bookingId: string, newStatus: 'pending' | 'confirmed' | 'cancelled' | 'completed', sendEmail: boolean = false) => {
    setActionLoading(bookingId);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: newStatus })
        .eq('id', bookingId);

      if (error) throw error;

      // Optionally send email notification
      if (sendEmail) {
        const booking = bookings.find(b => b.id === bookingId);
        if (booking) {
          try {
            await supabase.functions.invoke('send-booking-confirmation', {
              body: {
                bookingId,
                status: newStatus,
                tourTitle: booking.tours?.title,
                bookingDate: booking.booking_date,
                numberOfPeople: booking.number_of_people,
                totalPrice: booking.total_price,
              }
            });
            toast({ title: 'Success', description: 'Status updated and notification sent' });
          } catch (emailError) {
            console.error('Email send error:', emailError);
            toast({ title: 'Success', description: 'Status updated (email notification failed)' });
          }
        }
      } else {
        toast({ title: 'Success', description: 'Booking status updated' });
      }
      
      fetchBookings();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100';
      case 'completed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Booking Management</h2>
        <Badge variant="outline">{bookings.filter(b => b.status === 'pending').length} pending</Badge>
      </div>
      
      {bookings.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No bookings yet</p>
      ) : (
        <div className="grid gap-4">
          {bookings.map((booking) => (
            <Card key={booking.id}>
              <CardContent className="p-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(booking.status)}`}>
                        {booking.status}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {new Date(booking.booking_date).toLocaleDateString()}
                      </span>
                    </div>
                    
                    {/* Customer Information */}
                    <div className="space-y-1">
                      <p className="font-semibold">
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
                        <p className="text-sm font-medium">
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
                      <strong className="ml-2 text-primary">${booking.total_price}</strong>
                    </p>
                    
                    {booking.special_requests && (
                      <p className="text-sm text-muted-foreground italic">
                        "{booking.special_requests}"
                      </p>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    {/* Quick Actions for Pending Bookings */}
                    {booking.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => updateStatus(booking.id, 'confirmed', true)}
                          disabled={actionLoading === booking.id}
                          variant="default"
                        >
                          {actionLoading === booking.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Check className="h-4 w-4 mr-1" /> Approve
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => updateStatus(booking.id, 'cancelled', true)}
                          disabled={actionLoading === booking.id}
                        >
                          <X className="h-4 w-4 mr-1" /> Reject
                        </Button>
                      </div>
                    )}
                    
                    {/* Status Selector */}
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
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
