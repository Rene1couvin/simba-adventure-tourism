import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash, Star, Loader2, Image as ImageIcon, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface HotelRow {
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
  available: boolean;
}

interface RoomTypeRow {
  id: string;
  hotel_id: string;
  name: string;
  description: string | null;
  price_per_night: number;
  max_guests: number;
  bed_type: string;
  image_url: string | null;
  amenities: string[];
  total_rooms: number;
  available: boolean;
}

interface HotelImage {
  id: string;
  hotel_id: string;
  image_url: string;
  display_order: number;
}

const MAX_HOTEL_IMAGES = 15;

export const HotelManagement = () => {
  const [hotels, setHotels] = useState<HotelRow[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomTypeRow[]>([]);
  const [hotelImages, setHotelImages] = useState<Record<string, HotelImage[]>>({});
  const [editingHotel, setEditingHotel] = useState<HotelRow | null>(null);
  const [editingRoom, setEditingRoom] = useState<RoomTypeRow | null>(null);
  const [hotelDialogOpen, setHotelDialogOpen] = useState(false);
  const [roomDialogOpen, setRoomDialogOpen] = useState(false);
  const [imagesDialogOpen, setImagesDialogOpen] = useState(false);
  const [selectedHotelId, setSelectedHotelId] = useState<string>('');
  const [selectedHotelName, setSelectedHotelName] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  useEffect(() => { fetchHotels(); fetchRoomTypes(); fetchAllHotelImages(); }, []);

  const fetchHotels = async () => {
    const { data, error } = await supabase.from('hotels').select('*').order('created_at', { ascending: false });
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else setHotels((data || []).map(h => ({ ...h, amenities: h.amenities || [] })));
  };

  const fetchRoomTypes = async () => {
    const { data, error } = await supabase.from('room_types').select('*').order('created_at', { ascending: false });
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else setRoomTypes((data || []).map(r => ({ ...r, amenities: r.amenities || [] })));
  };

  const fetchAllHotelImages = async () => {
    const { data, error } = await supabase.from('hotel_images').select('*').order('display_order');
    if (error) return;
    const grouped: Record<string, HotelImage[]> = {};
    data?.forEach(img => {
      if (!grouped[img.hotel_id]) grouped[img.hotel_id] = [];
      grouped[img.hotel_id].push(img);
    });
    setHotelImages(grouped);
  };

  const handleImageUpload = async (file: File) => {
    try {
      setUploading(true);
      const ext = file.name.split('.').pop();
      const path = `${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('hotel-images').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('hotel-images').getPublicUrl(path);
      return publicUrl;
    } catch (e: any) {
      toast({ title: 'Upload Error', description: e.message, variant: 'destructive' });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleMultipleImageUpload = async (files: FileList, hotelId: string) => {
    const currentCount = hotelImages[hotelId]?.length || 0;
    const remaining = MAX_HOTEL_IMAGES - currentCount;
    
    if (files.length > remaining) {
      toast({ title: 'Limit Reached', description: `You can only add ${remaining} more image(s). Max is ${MAX_HOTEL_IMAGES}.`, variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const url = await handleImageUpload(files[i]);
        if (url) {
          await supabase.from('hotel_images').insert({
            hotel_id: hotelId,
            image_url: url,
            display_order: currentCount + i,
          });
        }
      }
      toast({ title: 'Success', description: `${files.length} image(s) uploaded` });
      fetchAllHotelImages();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const deleteHotelImage = async (imageId: string) => {
    const { error } = await supabase.from('hotel_images').delete().eq('id', imageId);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else {
      toast({ title: 'Deleted' });
      fetchAllHotelImages();
    }
  };

  const handleHotelSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const imageFile = fd.get('image') as File;
    let imageUrl = editingHotel?.image_url || null;
    if (imageFile && imageFile.size > 0) {
      imageUrl = await handleImageUpload(imageFile);
      if (!imageUrl && imageFile.size > 0) return;
    }

    const amenitiesStr = fd.get('amenities') as string;
    const hotelData = {
      name: fd.get('name') as string,
      description: fd.get('description') as string,
      location: fd.get('location') as string,
      address: (fd.get('address') as string) || null,
      star_rating: parseInt(fd.get('star_rating') as string) || 3,
      check_in_time: (fd.get('check_in_time') as string) || '14:00',
      check_out_time: (fd.get('check_out_time') as string) || '10:00',
      amenities: amenitiesStr ? amenitiesStr.split(',').map(s => s.trim()).filter(Boolean) : [],
      image_url: imageUrl,
      available: fd.get('available') === 'true',
    };

    const { error } = editingHotel
      ? await supabase.from('hotels').update(hotelData).eq('id', editingHotel.id)
      : await supabase.from('hotels').insert([hotelData]);

    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else {
      toast({ title: 'Success', description: editingHotel ? 'Hotel updated' : 'Hotel created' });
      setHotelDialogOpen(false);
      fetchHotels();
    }
  };

  const handleRoomSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const imageFile = fd.get('image') as File;
    let imageUrl = editingRoom?.image_url || null;
    if (imageFile && imageFile.size > 0) {
      imageUrl = await handleImageUpload(imageFile);
      if (!imageUrl && imageFile.size > 0) return;
    }

    const amenitiesStr = fd.get('amenities') as string;
    const roomData = {
      hotel_id: (fd.get('hotel_id') as string) || selectedHotelId,
      name: fd.get('name') as string,
      description: (fd.get('description') as string) || null,
      price_per_night: parseFloat(fd.get('price_per_night') as string),
      max_guests: parseInt(fd.get('max_guests') as string) || 2,
      bed_type: (fd.get('bed_type') as string) || 'Double',
      total_rooms: parseInt(fd.get('total_rooms') as string) || 1,
      amenities: amenitiesStr ? amenitiesStr.split(',').map(s => s.trim()).filter(Boolean) : [],
      image_url: imageUrl,
      available: fd.get('available') === 'true',
    };

    const { error } = editingRoom
      ? await supabase.from('room_types').update(roomData).eq('id', editingRoom.id)
      : await supabase.from('room_types').insert([roomData]);

    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else {
      toast({ title: 'Success', description: editingRoom ? 'Room type updated' : 'Room type created' });
      setRoomDialogOpen(false);
      fetchRoomTypes();
    }
  };

  const deleteHotel = async (id: string) => {
    if (!confirm('Delete this hotel and all its rooms?')) return;
    const { error } = await supabase.from('hotels').delete().eq('id', id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Deleted' }); fetchHotels(); fetchRoomTypes(); fetchAllHotelImages(); }
  };

  const deleteRoom = async (id: string) => {
    if (!confirm('Delete this room type?')) return;
    const { error } = await supabase.from('room_types').delete().eq('id', id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Deleted' }); fetchRoomTypes(); }
  };

  const openImagesDialog = (hotel: HotelRow) => {
    setSelectedHotelId(hotel.id);
    setSelectedHotelName(hotel.name);
    setImagesDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="hotels">
        <TabsList>
          <TabsTrigger value="hotels">Hotels</TabsTrigger>
          <TabsTrigger value="rooms">Room Types</TabsTrigger>
        </TabsList>

        <TabsContent value="hotels" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Hotels</h2>
            <Dialog open={hotelDialogOpen} onOpenChange={setHotelDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingHotel(null)}><Plus className="mr-2 h-4 w-4" /> Add Hotel</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingHotel ? 'Edit Hotel' : 'Add New Hotel'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleHotelSubmit} className="space-y-4">
                  <div><Label htmlFor="name">Hotel Name</Label><Input id="name" name="name" defaultValue={editingHotel?.name} required /></div>
                  <div><Label htmlFor="description">Description</Label><Textarea id="description" name="description" defaultValue={editingHotel?.description} required /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label htmlFor="location">Location</Label><Input id="location" name="location" defaultValue={editingHotel?.location} required /></div>
                    <div><Label htmlFor="address">Address</Label><Input id="address" name="address" defaultValue={editingHotel?.address || ''} /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div><Label htmlFor="star_rating">Star Rating</Label>
                      <Select name="star_rating" defaultValue={String(editingHotel?.star_rating || 3)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {[1,2,3,4,5].map(n => <SelectItem key={n} value={String(n)}>{n} Star{n > 1 ? 's' : ''}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label htmlFor="check_in_time">Check-in Time</Label><Input id="check_in_time" name="check_in_time" defaultValue={editingHotel?.check_in_time || '14:00'} /></div>
                    <div><Label htmlFor="check_out_time">Check-out Time</Label><Input id="check_out_time" name="check_out_time" defaultValue={editingHotel?.check_out_time || '10:00'} /></div>
                  </div>
                  <div><Label htmlFor="amenities">Amenities (comma separated)</Label><Input id="amenities" name="amenities" defaultValue={editingHotel?.amenities?.join(', ')} placeholder="WiFi, Pool, Spa, Parking" /></div>
                  <div>
                    <Label htmlFor="available">Available</Label>
                    <Select name="available" defaultValue={editingHotel?.available !== false ? 'true' : 'false'}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="true">Yes</SelectItem><SelectItem value="false">No</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div><Label htmlFor="image">Cover Image</Label><Input id="image" name="image" type="file" accept="image/*" />
                    {editingHotel?.image_url && <img src={editingHotel.image_url} alt="Current" className="mt-2 h-20 object-cover rounded" />}
                  </div>
                  <Button type="submit" disabled={uploading}>{uploading ? 'Uploading...' : editingHotel ? 'Update Hotel' : 'Create Hotel'}</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {hotels.map((hotel) => (
              <Card key={hotel.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    {hotel.image_url && <img src={hotel.image_url} alt={hotel.name} className="h-20 w-20 object-cover rounded" />}
                    <div>
                      <h3 className="font-semibold">{hotel.name}</h3>
                      <p className="text-sm text-muted-foreground">{hotel.location}</p>
                      <div className="flex items-center gap-1 mt-1">
                        {Array.from({ length: hotel.star_rating }).map((_, i) => <Star key={i} className="h-3 w-3 fill-primary text-primary" />)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {hotelImages[hotel.id]?.length || 0}/{MAX_HOTEL_IMAGES} images
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openImagesDialog(hotel)}>
                      <ImageIcon className="h-4 w-4 mr-1" /> Images
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => { setEditingHotel(hotel); setHotelDialogOpen(true); }}><Edit className="h-4 w-4" /></Button>
                    <Button variant="destructive" size="sm" onClick={() => deleteHotel(hotel.id)}><Trash className="h-4 w-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {hotels.length === 0 && <p className="text-center text-muted-foreground py-8">No hotels yet. Add your first hotel!</p>}
          </div>
        </TabsContent>

        <TabsContent value="rooms" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Room Types</h2>
            <Dialog open={roomDialogOpen} onOpenChange={setRoomDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingRoom(null)}><Plus className="mr-2 h-4 w-4" /> Add Room Type</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingRoom ? 'Edit Room Type' : 'Add Room Type'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleRoomSubmit} className="space-y-4">
                  <div><Label htmlFor="hotel_id">Hotel</Label>
                    <Select name="hotel_id" defaultValue={editingRoom?.hotel_id || ''} onValueChange={setSelectedHotelId}>
                      <SelectTrigger><SelectValue placeholder="Select hotel" /></SelectTrigger>
                      <SelectContent>
                        {hotels.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label htmlFor="name">Room Name</Label><Input id="name" name="name" defaultValue={editingRoom?.name} required placeholder="e.g. Deluxe Suite" /></div>
                  <div><Label htmlFor="description">Description</Label><Textarea id="description" name="description" defaultValue={editingRoom?.description || ''} /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label htmlFor="price_per_night">Price per Night ($)</Label><Input id="price_per_night" name="price_per_night" type="number" step="0.01" defaultValue={editingRoom?.price_per_night} required /></div>
                    <div><Label htmlFor="max_guests">Max Guests</Label><Input id="max_guests" name="max_guests" type="number" defaultValue={editingRoom?.max_guests || 2} required /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label htmlFor="bed_type">Bed Type</Label>
                      <Select name="bed_type" defaultValue={editingRoom?.bed_type || 'Double'}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Single">Single</SelectItem>
                          <SelectItem value="Double">Double</SelectItem>
                          <SelectItem value="Queen">Queen</SelectItem>
                          <SelectItem value="King">King</SelectItem>
                          <SelectItem value="Twin">Twin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label htmlFor="total_rooms">Total Rooms</Label><Input id="total_rooms" name="total_rooms" type="number" defaultValue={editingRoom?.total_rooms || 1} required /></div>
                  </div>
                  <div><Label htmlFor="amenities">Amenities (comma separated)</Label><Input id="amenities" name="amenities" defaultValue={editingRoom?.amenities?.join(', ')} placeholder="AC, Mini Bar, Balcony" /></div>
                  <div>
                    <Label htmlFor="available">Available</Label>
                    <Select name="available" defaultValue={editingRoom?.available !== false ? 'true' : 'false'}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="true">Yes</SelectItem><SelectItem value="false">No</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div><Label htmlFor="image">Room Image</Label><Input id="image" name="image" type="file" accept="image/*" />
                    {editingRoom?.image_url && <img src={editingRoom.image_url} alt="Current" className="mt-2 h-20 object-cover rounded" />}
                  </div>
                  <Button type="submit" disabled={uploading}>{uploading ? 'Uploading...' : editingRoom ? 'Update Room' : 'Create Room'}</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {roomTypes.map((room) => {
              const hotel = hotels.find(h => h.id === room.hotel_id);
              return (
                <Card key={room.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      {room.image_url && <img src={room.image_url} alt={room.name} className="h-16 w-16 object-cover rounded" />}
                      <div>
                        <h3 className="font-semibold">{room.name}</h3>
                        <p className="text-sm text-muted-foreground">{hotel?.name || 'Unknown hotel'} • {room.bed_type} • Max {room.max_guests} guests</p>
                        <p className="text-sm font-semibold text-primary">${room.price_per_night}/night</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => { setEditingRoom(room); setSelectedHotelId(room.hotel_id); setRoomDialogOpen(true); }}><Edit className="h-4 w-4" /></Button>
                      <Button variant="destructive" size="sm" onClick={() => deleteRoom(room.id)}><Trash className="h-4 w-4" /></Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {roomTypes.length === 0 && <p className="text-center text-muted-foreground py-8">No room types yet. Add hotels first, then create room types.</p>}
          </div>
        </TabsContent>
      </Tabs>

      {/* Hotel Images Dialog */}
      <Dialog open={imagesDialogOpen} onOpenChange={setImagesDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Images for {selectedHotelName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {hotelImages[selectedHotelId]?.length || 0} / {MAX_HOTEL_IMAGES} images
              </p>
              {(hotelImages[selectedHotelId]?.length || 0) < MAX_HOTEL_IMAGES && (
                <div>
                  <Input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => {
                      if (e.target.files) handleMultipleImageUpload(e.target.files, selectedHotelId);
                    }}
                    disabled={uploading}
                  />
                </div>
              )}
            </div>
            {uploading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Uploading...
              </div>
            )}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {(hotelImages[selectedHotelId] || []).map((img) => (
                <div key={img.id} className="relative group aspect-square rounded-lg overflow-hidden">
                  <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => deleteHotelImage(img.id)}
                    className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            {(!hotelImages[selectedHotelId] || hotelImages[selectedHotelId].length === 0) && (
              <p className="text-center text-muted-foreground py-8">No images yet. Upload some!</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
