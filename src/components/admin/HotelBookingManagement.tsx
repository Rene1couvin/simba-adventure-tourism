import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, X, Loader2 } from 'lucide-react';

interface HotelBooking {
  id: string;
  user_id: string;
  hotel_id: string;
  room_type_id: string;
  check_in_date: string;
  check_out_date: string;
  number_of_guests: number;
  number_of_rooms: number;
  total_price: number;
  special_requests: string | null;
  status: string;
  created_at: string;
  hotel_name?: string;
  room_name?: string;
  customer_name?: string;
}

export const HotelBookingManagement = () => {
  const [bookings, setBookings] = useState<HotelBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => { fetchBookings(); }, []);

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase.from('hotel_bookings').select('*').order('created_at', { ascending: false });
      if (error) throw error;

      const userIds = [...new Set(data?.map(b => b.user_id) || [])];
      const hotelIds = [...new Set(data?.map(b => b.hotel_id) || [])];
      const roomIds = [...new Set(data?.map(b => b.room_type_id) || [])];

      const [profilesRes, hotelsRes, roomsRes] = await Promise.all([
        supabase.from('profiles').select('id, full_name').in('id', userIds),
        supabase.from('hotels').select('id, name').in('id', hotelIds),
        supabase.from('room_types').select('id, name').in('id', roomIds),
      ]);

      const profilesMap = new Map(profilesRes.data?.map(p => [p.id, p.full_name]) || []);
      const hotelsMap = new Map(hotelsRes.data?.map(h => [h.id, h.name]) || []);
      const roomsMap = new Map(roomsRes.data?.map(r => [r.id, r.name]) || []);

      setBookings((data || []).map(b => ({
        ...b,
        customer_name: profilesMap.get(b.user_id) || 'Unknown',
        hotel_name: hotelsMap.get(b.hotel_id) || 'Unknown',
        room_name: roomsMap.get(b.room_type_id) || 'Unknown',
      })));
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    setActionLoading(id);
    try {
      const { error } = await supabase.from('hotel_bookings').update({ status }).eq('id', id);
      if (error) throw error;
      toast({ title: 'Success', description: 'Status updated' });
      fetchBookings();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'confirmed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100';
      case 'completed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Hotel Bookings</h2>
        <Badge variant="outline">{bookings.filter(b => b.status === 'pending').length} pending</Badge>
      </div>

      {bookings.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No hotel bookings yet</p>
      ) : (
        <div className="grid gap-4">
          {bookings.map((b) => (
            <Card key={b.id}>
              <CardContent className="p-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(b.status)}`}>{b.status}</span>
                      <span className="text-sm text-muted-foreground">Booked {new Date(b.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="font-semibold">Guest: {b.customer_name}</p>
                    <p className="text-sm"><strong>Hotel:</strong> {b.hotel_name} — <strong>Room:</strong> {b.room_name}</p>
                    <p className="text-sm text-muted-foreground">
                      Check-in: {b.check_in_date} → Check-out: {b.check_out_date}
                    </p>
                    <p className="text-sm">
                      <strong>{b.number_of_guests}</strong> guest{b.number_of_guests > 1 ? 's' : ''} • 
                      <strong className="ml-1">{b.number_of_rooms}</strong> room{b.number_of_rooms > 1 ? 's' : ''} • 
                      <strong className="ml-2 text-primary">${b.total_price}</strong>
                    </p>
                    {b.special_requests && <p className="text-sm text-muted-foreground italic">"{b.special_requests}"</p>}
                  </div>

                  <div className="flex flex-col gap-2">
                    {b.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => updateStatus(b.id, 'confirmed')} disabled={actionLoading === b.id}>
                          {actionLoading === b.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4 mr-1" /> Approve</>}
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => updateStatus(b.id, 'cancelled')} disabled={actionLoading === b.id}>
                          <X className="h-4 w-4 mr-1" /> Reject
                        </Button>
                      </div>
                    )}
                    <Select value={b.status} onValueChange={(v) => updateStatus(b.id, v)}>
                      <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
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
