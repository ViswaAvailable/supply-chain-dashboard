'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useEvents, useOutlets, useCategories, useSKUs } from '@/lib/hooks/useForecastData';
import { useCreateEvent, useUpdateEvent, useDeleteEvent, useToggleEventEnabled } from '@/lib/hooks/useEventMutations';
import { formatDateRange, getEventTypeColor } from '@/lib/forecast-utils';
import { Plus, Pencil, Trash2, Calendar, RefreshCw, AlertCircle, BarChart3, Info, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/supabase/useAuth';
import { useSupabase } from '@/components/SupabaseProvider';
import type { Event, EventFormData, EventType, EventMode, ComparisonMethod } from '@/lib/types';

const defaultFormData: EventFormData = {
  name: '',
  type: 'holiday',
  start_date: '',
  end_date: '',
  scope_outlet_id: 'all',
  scope_category_id: 'all',
  scope_sku_id: 'all',
  mode: 'flag',
  uplift_pct: 0,
  comparison_method: 'calendar',
  historical_ly_start_date: '',
  historical_ly_end_date: '',
  historical_ly2_start_date: '',
  historical_ly2_end_date: '',
};

export default function EventManagerPage() {
  const router = useRouter();
  const { user } = useAuth();
  const supabase = useSupabase();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [formData, setFormData] = useState<EventFormData>(defaultFormData);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { data: events = [], isLoading, refetch } = useEvents();
  const { data: outlets = [] } = useOutlets();
  const { data: categories = [] } = useCategories();
  const { data: skus = [] } = useSKUs();

  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();
  const toggleEnabled = useToggleEventEnabled();

  // Check admin access
  useEffect(() => {
    async function checkAdminAccess() {
      if (!user) return;
      
      const { data } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
      
      if (data?.role === 'admin') {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
        toast.error('Access denied. Admin privileges required.');
        router.push('/dashboard');
      }
    }
    
    checkAdminAccess();
  }, [user, supabase, router]);

  // Show loading while checking access
  if (isAdmin === null) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Checking access...</p>
        </div>
      </div>
    );
  }

  // Show access denied if not admin
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <ShieldAlert className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">
              You need admin privileges to access Event Manager.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Open modal for new event
  const handleNewEvent = () => {
    setEditingEvent(null);
    const today = new Date();
    const oneWeekLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    
    // Calculate default historical dates (same calendar dates last year and 2 years ago)
    const lyStart = new Date(today);
    lyStart.setFullYear(lyStart.getFullYear() - 1);
    const lyEnd = new Date(oneWeekLater);
    lyEnd.setFullYear(lyEnd.getFullYear() - 1);
    const ly2Start = new Date(today);
    ly2Start.setFullYear(ly2Start.getFullYear() - 2);
    const ly2End = new Date(oneWeekLater);
    ly2End.setFullYear(ly2End.getFullYear() - 2);
    
    setFormData({
      ...defaultFormData,
      start_date: today.toISOString().split('T')[0],
      end_date: oneWeekLater.toISOString().split('T')[0],
      historical_ly_start_date: lyStart.toISOString().split('T')[0],
      historical_ly_end_date: lyEnd.toISOString().split('T')[0],
      historical_ly2_start_date: ly2Start.toISOString().split('T')[0],
      historical_ly2_end_date: ly2End.toISOString().split('T')[0],
    });
    setIsModalOpen(true);
  };

  // Open modal for editing
  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    setFormData({
      name: event.name,
      type: event.type,
      start_date: event.start_date,
      end_date: event.end_date,
      scope_outlet_id: event.scope_outlet_id || 'all',
      scope_category_id: event.scope_category_id || 'all',
      scope_sku_id: event.scope_sku_id || 'all',
      mode: event.mode,
      uplift_pct: event.uplift_pct,
      comparison_method: event.comparison_method || 'calendar',
      historical_ly_start_date: event.historical_ly_start_date || '',
      historical_ly_end_date: event.historical_ly_end_date || '',
      historical_ly2_start_date: event.historical_ly2_start_date || '',
      historical_ly2_end_date: event.historical_ly2_end_date || '',
    });
    setIsModalOpen(true);
  };

  // Save event (create or update)
  const handleSaveEvent = async () => {
    if (!formData.name.trim()) {
      toast.error('Please enter an event name');
      return;
    }
    if (!formData.start_date || !formData.end_date) {
      toast.error('Please select start and end dates');
      return;
    }
    if (formData.start_date > formData.end_date) {
      toast.error('End date must be after start date');
      return;
    }

    try {
      if (editingEvent) {
        await updateEvent.mutateAsync({ id: editingEvent.id, data: formData });
        toast.success('Event updated successfully');
      } else {
        await createEvent.mutateAsync(formData);
        toast.success('Event created successfully');
      }
      setIsModalOpen(false);
    } catch (error) {
      toast.error('Failed to save event. Please try again.');
      console.error(error);
    }
  };

  // Delete event
  const handleDeleteEvent = async (id: string) => {
    try {
      await deleteEvent.mutateAsync(id);
      toast.success('Event deleted successfully');
      setDeleteConfirmId(null);
    } catch (error) {
      toast.error('Failed to delete event. Please try again.');
      console.error(error);
    }
  };

  // Toggle enabled
  const handleToggleEnabled = async (id: string, enabled: boolean) => {
    try {
      await toggleEnabled.mutateAsync({ id, enabled });
      toast.success(enabled ? 'Event enabled' : 'Event disabled');
    } catch (error) {
      toast.error('Failed to update event. Please try again.');
      console.error(error);
    }
  };

  // Group events by status
  const upcomingEvents = events.filter(e => e.start_date > new Date().toISOString().split('T')[0]);
  const activeEvents = events.filter(e => {
    const today = new Date().toISOString().split('T')[0];
    return e.start_date <= today && e.end_date >= today;
  });
  const pastEvents = events.filter(e => e.end_date < new Date().toISOString().split('T')[0]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Event Manager</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Flag holidays, promotions, and custom events that affect demand
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleNewEvent} className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Plus className="h-4 w-4 mr-2" />
            Add Event
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Now</p>
                <p className="text-2xl font-bold">{activeEvents.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Upcoming</p>
                <p className="text-2xl font-bold">{upcomingEvents.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">With Uplift</p>
                <p className="text-2xl font-bold">
                  {events.filter(e => e.mode === 'uplift' && e.uplift_pct > 0).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Events Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">All Events</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Event Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date Range</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Comparison</TableHead>
                <TableHead>Enabled</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No events created yet. Click "Add Event" to get started.
                  </TableCell>
                </TableRow>
              ) : (
                events.map((event) => {
                  const typeColor = getEventTypeColor(event.type);
                  const today = new Date().toISOString().split('T')[0];
                  const isActive = event.start_date <= today && event.end_date >= today;
                  const isPast = event.end_date < today;

                  // Format comparison method for display
                  const comparisonLabels: Record<string, string> = {
                    calendar: 'Calendar',
                    same_event: 'Same Event',
                  };

                  return (
                    <TableRow key={event.id} className={isPast ? 'opacity-60' : ''}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{event.name}</span>
                          {isActive && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              Active
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${typeColor.bg} ${typeColor.text} border-0 capitalize`}>
                          {event.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDateRange(event.start_date, event.end_date)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {event.scope_outlet_id ? (
                            <span>{outlets.find(o => o.id === event.scope_outlet_id)?.name || 'Specific Outlet'}</span>
                          ) : event.scope_category_id ? (
                            <span>{categories.find(c => c.id === event.scope_category_id)?.name || 'Specific Category'}</span>
                          ) : event.scope_sku_id ? (
                            <span>{skus.find(s => s.id === event.scope_sku_id)?.name || 'Specific SKU'}</span>
                          ) : (
                            <span className="text-muted-foreground">All Products</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {event.mode === 'uplift' ? (
                          <span className="text-green-600 font-medium">+{event.uplift_pct}%</span>
                        ) : (
                          <span className="text-muted-foreground">Flag Only</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {comparisonLabels[event.comparison_method] || 'Calendar'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={event.enabled}
                          onCheckedChange={(checked) => handleToggleEnabled(event.id, checked)}
                          disabled={toggleEnabled.isPending}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditEvent(event)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteConfirmId(event.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Event Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingEvent ? 'Edit Event' : 'Create New Event'}
            </DialogTitle>
            <DialogDescription>
              {editingEvent 
                ? 'Update the event details below.' 
                : 'Add a new event to affect demand forecasts.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Event Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Event Name</Label>
              <Input
                id="name"
                placeholder="e.g., Diwali 2025"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            {/* Event Type */}
            <div className="space-y-2">
              <Label>Event Type</Label>
              <Select 
                value={formData.type} 
                onValueChange={(v: EventType) => setFormData({ ...formData, type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="holiday">Holiday / Festival</SelectItem>
                  <SelectItem value="promo">Promotion</SelectItem>
                  <SelectItem value="custom">Custom Event</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>

            {/* Comparison Method Section */}
            <div className="border-t pt-4 mt-4">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <Label className="text-base font-semibold">Comparison Method</Label>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                How should we compare this event to historical data in Event Analysis?
              </p>
              
              <Select 
                value={formData.comparison_method} 
                onValueChange={(v: ComparisonMethod) => setFormData({ ...formData, comparison_method: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="calendar">
                    <div className="flex flex-col">
                      <span>Calendar Dates</span>
                      <span className="text-xs text-muted-foreground">Compare to same calendar dates last year</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="same_event">
                    <div className="flex flex-col">
                      <span>Same Event Last Year</span>
                      <span className="text-xs text-muted-foreground">Compare to when this event occurred last year</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Historical Event Dates - only show for 'same_event' */}
              {formData.comparison_method === 'same_event' && (
                <div className="mt-4 p-3 bg-muted/50 rounded-lg space-y-4">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-blue-500 mt-0.5" />
                    <p className="text-xs text-muted-foreground">
                      Enter the dates when this event occurred in previous years. This helps compare performance accurately for events like Diwali where dates shift each year.
                    </p>
                  </div>
                  
                  {/* Last Year Dates */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Last Year (LY)</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="date"
                        placeholder="Start"
                        value={formData.historical_ly_start_date}
                        onChange={(e) => setFormData({ ...formData, historical_ly_start_date: e.target.value })}
                      />
                      <Input
                        type="date"
                        placeholder="End"
                        value={formData.historical_ly_end_date}
                        onChange={(e) => setFormData({ ...formData, historical_ly_end_date: e.target.value })}
                      />
                    </div>
                  </div>
                  
                  {/* 2 Years Ago Dates */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">2 Years Ago (LY-1)</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="date"
                        placeholder="Start"
                        value={formData.historical_ly2_start_date}
                        onChange={(e) => setFormData({ ...formData, historical_ly2_start_date: e.target.value })}
                      />
                      <Input
                        type="date"
                        placeholder="End"
                        value={formData.historical_ly2_end_date}
                        onChange={(e) => setFormData({ ...formData, historical_ly2_end_date: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Scope */}
            <div className="space-y-2">
              <Label>Apply To</Label>
              <div className="grid grid-cols-3 gap-2">
                <Select 
                  value={formData.scope_outlet_id} 
                  onValueChange={(v) => setFormData({ ...formData, scope_outlet_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Outlets" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Outlets</SelectItem>
                    {outlets.map((outlet) => (
                      <SelectItem key={outlet.id} value={outlet.id}>
                        {outlet.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select 
                  value={formData.scope_category_id} 
                  onValueChange={(v) => setFormData({ ...formData, scope_category_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select 
                  value={formData.scope_sku_id} 
                  onValueChange={(v) => setFormData({ ...formData, scope_sku_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All SKUs" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All SKUs</SelectItem>
                    {skus.filter(s => !s.is_new_product).map((sku) => (
                      <SelectItem key={sku.id} value={sku.id}>
                        {sku.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Mode */}
            <div className="space-y-2">
              <Label>Event Mode</Label>
              <Select 
                value={formData.mode} 
                onValueChange={(v: EventMode) => setFormData({ ...formData, mode: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flag">Flag Only (ML training data)</SelectItem>
                  <SelectItem value="uplift">Apply Uplift %</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Uplift Percentage */}
            {formData.mode === 'uplift' && (
              <div className="space-y-2">
                <Label htmlFor="uplift_pct">Uplift Percentage</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="uplift_pct"
                    type="number"
                    min="0"
                    max="500"
                    value={formData.uplift_pct}
                    onChange={(e) => setFormData({ ...formData, uplift_pct: parseInt(e.target.value) || 0 })}
                    className="w-24"
                  />
                  <span className="text-muted-foreground">%</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Forecasts during this event will be increased by this percentage.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveEvent}
              disabled={createEvent.isPending || updateEvent.isPending}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {createEvent.isPending || updateEvent.isPending ? 'Saving...' : 'Save Event'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Delete Event
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this event? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => deleteConfirmId && handleDeleteEvent(deleteConfirmId)}
              disabled={deleteEvent.isPending}
            >
              {deleteEvent.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

