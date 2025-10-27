import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const bookingSchema = z.object({
  bookingDate: z.date({
    required_error: 'Please select a date',
  }),
  numberOfPeople: z.number().min(1, 'At least 1 person required').max(50, 'Maximum 50 people'),
  specialRequests: z.string().max(500, 'Maximum 500 characters').optional(),
});

interface BookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tour: {
    id: string;
    title: string;
    location: string;
    price: number;
    max_group_size: number;
  };
}

export const BookingDialog = ({ open, onOpenChange, tour }: BookingDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof bookingSchema>>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      numberOfPeople: 1,
      specialRequests: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof bookingSchema>) => {
    setIsSubmitting(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: 'Authentication Required',
          description: 'Please sign in to book a tour',
          variant: 'destructive',
        });
        return;
      }

      const totalPrice = tour.price * values.numberOfPeople;

      // Create booking
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          user_id: user.id,
          tour_id: tour.id,
          booking_date: values.bookingDate.toISOString(),
          number_of_people: values.numberOfPeople,
          total_price: totalPrice,
          special_requests: values.specialRequests || null,
          status: 'pending',
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      // Send confirmation email
      await supabase.functions.invoke('send-booking-confirmation', {
        body: {
          email: user.email,
          customerName: profile?.full_name || 'Valued Customer',
          tourTitle: tour.title,
          tourLocation: tour.location,
          bookingDate: values.bookingDate.toISOString(),
          numberOfPeople: values.numberOfPeople,
          totalPrice,
        },
      });

      toast({
        title: 'Booking Successful!',
        description: 'Your booking has been confirmed. Check your email for details.',
      });

      form.reset();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Booking error:', error);
      toast({
        title: 'Booking Failed',
        description: error.message || 'Failed to create booking. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Book {tour.title}</DialogTitle>
          <DialogDescription>
            Complete the form below to book your safari adventure
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="bookingDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Booking Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? (
                            format(field.value, 'PPP')
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date < new Date() || date < new Date('1900-01-01')
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="numberOfPeople"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Number of People (Max: {tour.max_group_size})</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      max={tour.max_group_size}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="specialRequests"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Special Requests (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any special requirements or requests..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="bg-muted p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Total Price:</span>
                <span className="text-2xl font-bold text-primary">
                  ${(tour.price * (form.watch('numberOfPeople') || 1)).toFixed(2)}
                </span>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Confirm Booking'
              )}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
