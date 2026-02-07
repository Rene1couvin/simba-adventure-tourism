import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface HotelBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hotel: {
    id: string;
    name: string;
    location: string;
    check_in_time: string;
    check_out_time: string;
  };
  roomType: {
    id: string;
    name: string;
    price_per_night: number;
    max_guests: number;
  };
}

export const HotelBookingDialog = ({ open, onOpenChange, hotel, roomType }: HotelBookingDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkIn, setCheckIn] = useState<Date>();
  const [checkOut, setCheckOut] = useState<Date>();
  const [guests, setGuests] = useState(1);
  const [rooms, setRooms] = useState(1);
  const [specialRequests, setSpecialRequests] = useState('');

  const nights = checkIn && checkOut ? differenceInDays(checkOut, checkIn) : 0;
  const totalPrice = nights * roomType.price_per_night * rooms;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!checkIn || !checkOut) {
      toast.error('Please select check-in and check-out dates');
      return;
    }
    if (nights < 1) {
      toast.error('Check-out must be after check-in');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to book a hotel');
        return;
      }

      const { error } = await supabase
        .from('hotel_bookings')
        .insert({
          user_id: user.id,
          hotel_id: hotel.id,
          room_type_id: roomType.id,
          check_in_date: checkIn.toISOString().split('T')[0],
          check_out_date: checkOut.toISOString().split('T')[0],
          number_of_guests: guests,
          number_of_rooms: rooms,
          total_price: totalPrice,
          special_requests: specialRequests || null,
          status: 'pending',
        });

      if (error) throw error;

      toast.success('Hotel booking submitted! You will receive a confirmation soon.');
      onOpenChange(false);
      setCheckIn(undefined);
      setCheckOut(undefined);
      setGuests(1);
      setRooms(1);
      setSpecialRequests('');
    } catch (error: any) {
      console.error('Hotel booking error:', error);
      toast.error(error.message || 'Failed to book. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Book {roomType.name}</DialogTitle>
          <DialogDescription>
            {hotel.name} — {hotel.location}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Check-in</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !checkIn && 'text-muted-foreground')}>
                    {checkIn ? format(checkIn, 'PP') : <span>Select date</span>}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={checkIn} onSelect={setCheckIn} disabled={(d) => d < new Date()} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Check-out</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !checkOut && 'text-muted-foreground')}>
                    {checkOut ? format(checkOut, 'PP') : <span>Select date</span>}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={checkOut} onSelect={setCheckOut} disabled={(d) => d < (checkIn || new Date())} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="guests">Guests (max {roomType.max_guests})</Label>
              <Input id="guests" type="number" min={1} max={roomType.max_guests} value={guests} onChange={(e) => setGuests(parseInt(e.target.value) || 1)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rooms">Rooms</Label>
              <Input id="rooms" type="number" min={1} max={10} value={rooms} onChange={(e) => setRooms(parseInt(e.target.value) || 1)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="special">Special Requests (Optional)</Label>
            <Textarea id="special" placeholder="Any special requirements..." value={specialRequests} onChange={(e) => setSpecialRequests(e.target.value)} className="resize-none" />
          </div>

          <div className="bg-muted p-4 rounded-lg space-y-1">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>${roomType.price_per_night} × {nights} night{nights !== 1 ? 's' : ''} × {rooms} room{rooms !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold">Total:</span>
              <span className="text-2xl font-bold text-primary">${totalPrice.toFixed(2)}</span>
            </div>
            <p className="text-xs text-muted-foreground">Check-in: {hotel.check_in_time} • Check-out: {hotel.check_out_time}</p>
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting || nights < 1}>
            {isSubmitting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
            ) : (
              'Confirm Booking'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
