import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, MapPin, Calendar, DollarSign, TrendingUp, Image } from 'lucide-react';

interface Stats {
  totalUsers: number;
  totalTours: number;
  totalBookings: number;
  totalRevenue: number;
  pendingBookings: number;
  galleryImages: number;
}

export const Dashboard = () => {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalTours: 0,
    totalBookings: 0,
    totalRevenue: 0,
    pendingBookings: 0,
    galleryImages: 0,
  });
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchRecentBookings();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch counts
      const [users, tours, bookings, gallery] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('tours').select('id', { count: 'exact', head: true }),
        supabase.from('bookings').select('id, total_price, status'),
        supabase.from('gallery_images').select('id', { count: 'exact', head: true }),
      ]);

      const bookingsData = bookings.data || [];
      const totalRevenue = bookingsData
        .filter(b => b.status === 'confirmed' || b.status === 'completed')
        .reduce((sum, b) => sum + Number(b.total_price), 0);
      const pendingCount = bookingsData.filter(b => b.status === 'pending').length;

      setStats({
        totalUsers: users.count || 0,
        totalTours: tours.count || 0,
        totalBookings: bookingsData.length,
        totalRevenue,
        pendingBookings: pendingCount,
        galleryImages: gallery.count || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentBookings = async () => {
    try {
      const { data } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          number_of_people,
          total_price,
          status,
          created_at,
          tours(title),
          profiles:user_id(full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentBookings(data || []);
    } catch (error) {
      console.error('Error fetching recent bookings:', error);
    }
  };

  const statCards = [
    { title: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-blue-500' },
    { title: 'Total Tours', value: stats.totalTours, icon: MapPin, color: 'text-green-500' },
    { title: 'Total Bookings', value: stats.totalBookings, icon: Calendar, color: 'text-purple-500' },
    { title: 'Pending Bookings', value: stats.pendingBookings, icon: TrendingUp, color: 'text-orange-500' },
    { title: 'Total Revenue', value: `$${stats.totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-500' },
    { title: 'Gallery Images', value: stats.galleryImages, icon: Image, color: 'text-pink-500' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-32 bg-muted rounded-lg" />
      ))}
    </div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Bookings */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          {recentBookings.length === 0 ? (
            <p className="text-muted-foreground">No bookings yet</p>
          ) : (
            <div className="space-y-4">
              {recentBookings.map((booking) => (
                <div key={booking.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-semibold">{booking.tours?.title || 'Unknown Tour'}</p>
                    <p className="text-sm text-muted-foreground">
                      by {booking.profiles?.full_name || 'Unknown User'} • {booking.number_of_people} people
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(booking.booking_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">${booking.total_price}</p>
                    <span className={`inline-block px-2 py-1 text-xs rounded-full ${getStatusColor(booking.status)}`}>
                      {booking.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
