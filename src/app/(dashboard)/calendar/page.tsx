'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  X, 
  ChevronLeft, 
  ChevronRight,
  Clock,
  MapPin,
  Users as UsersIcon,
  Trash2
} from 'lucide-react';
import { db } from '@/lib/firebase/client';
import { collection, addDoc, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { toast } from '@/lib/toast';

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  description?: string;
  type: 'meeting' | 'deadline' | 'event';
  attendees?: string[];
  location?: string;
}

const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => 
  `${i.toString().padStart(2, '0')}:00`
);

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [showEventModal, setShowEventModal] = useState(false);
  const [calendarView, setCalendarView] = useState<'month' | 'week' | 'day' | 'list'>('month');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showEventDetails, setShowEventDetails] = useState(false);

  // Event form state
  const [newEvent, setNewEvent] = useState({
    title: '',
    time: '',
    description: '',
    type: 'meeting' as 'meeting' | 'deadline' | 'event',
    attendees: '',
    location: ''
  });

  // Fetch calendar events
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'md_events'),
      (snapshot) => {
        const eventsData = snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        } as CalendarEvent));
        setEvents(eventsData);
      },
      (error) => {
        console.error('Error fetching events:', error);
      }
    );
    return () => unsubscribe();
  }, []);

  // Helper functions
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    return {
      daysInMonth: lastDay.getDate(),
      startingDayOfWeek: firstDay.getDay()
    };
  };

  const getWeekDates = (date: Date) => {
    const currentDay = date.getDay();
    const diff = date.getDate() - currentDay;
    const weekStart = new Date(date);
    weekStart.setDate(diff);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      return d;
    });
  };

  const getEventsForDay = (date: Date) => {
    return events.filter(event => 
      new Date(event.date).toDateString() === date.toDateString()
    );
  };

  const changeMonth = (delta: number) => {
    setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + delta, 1));
  };

  const addEvent = async () => {
    if (!newEvent.title.trim()) {
      toast.error('Please enter an event title');
      return;
    }

    try {
      await addDoc(collection(db, 'md_events'), {
        title: newEvent.title,
        date: selectedDate.toISOString(),
        time: newEvent.time,
        description: newEvent.description,
        type: newEvent.type,
        attendees: newEvent.attendees ? newEvent.attendees.split(',').map(a => a.trim()) : [],
        location: newEvent.location,
        createdAt: new Date().toISOString()
      });
      
      toast.success('Event added successfully');
      setShowEventModal(false);
      setNewEvent({
        title: '',
        time: '',
        description: '',
        type: 'meeting',
        attendees: '',
        location: ''
      });
    } catch (error) {
      console.error('Error adding event:', error);
      toast.error('Failed to add event');
    }
  };

  const deleteEvent = async () => {
    if (!selectedEvent) return;
    
    try {
      await deleteDoc(doc(db, 'md_events', selectedEvent.id));
      toast.success('Event deleted');
      setShowEventDetails(false);
      setSelectedEvent(null);
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Failed to delete event');
    }
  };

  // Render functions
  const renderMonthView = () => {
    const { daysInMonth, startingDayOfWeek } = getDaysInMonth(selectedDate);
    
    return (
      <div className="grid grid-cols-7 gap-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center py-3 text-zinc-400 font-semibold text-sm border-b border-white/10">
            {day}
          </div>
        ))}
        
        {Array.from({ length: startingDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}
        
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const currentDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day);
          const dayEvents = getEventsForDay(currentDate);
          const isToday = currentDate.toDateString() === new Date().toDateString();
          
          return (
            <motion.div
              key={day}
              whileHover={{ scale: 1.02 }}
              onClick={() => { setSelectedDate(currentDate); setShowEventModal(true); }}
              className={`min-h-[120px] p-3 rounded-xl border transition-all cursor-pointer ${
                isToday 
                  ? 'bg-cyan-500/20 border-cyan-500/40 ring-2 ring-cyan-500/50' 
                  : dayEvents.length > 0 
                  ? 'bg-white/5 border-white/20 hover:border-cyan-500/30'
                  : 'bg-white/5 border-white/10 hover:border-white/20'
              }`}
            >
              <div className={`text-sm font-semibold mb-2 ${isToday ? 'text-cyan-400' : 'text-white'}`}>{day}</div>
              <div className="space-y-1 max-h-[80px] overflow-y-auto custom-scrollbar">
                {dayEvents.map(event => (
                  <div
                    key={event.id}
                    onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); setShowEventDetails(true); }}
                    className={`text-xs px-2 py-1.5 rounded-lg truncate cursor-pointer hover:opacity-80 transition-all ${
                      event.type === 'meeting' ? 'bg-blue-500/30 text-blue-200 border border-blue-500/40' :
                      event.type === 'deadline' ? 'bg-red-500/30 text-red-200 border border-red-500/40' :
                      'bg-purple-500/30 text-purple-200 border border-purple-500/40'
                    }`}
                  >
                    {event.time && <span className="font-semibold">{event.time}</span>} {event.title}
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>
    );
  };

  const renderWeekView = () => {
    const weekDates = getWeekDates(selectedDate);
    
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-8 gap-2">
          <div className="text-xs text-zinc-500 py-2"></div>
          {weekDates.map(date => {
            const isToday = date.toDateString() === new Date().toDateString();
            return (
              <div key={date.toISOString()} className={`text-center py-2 rounded-lg ${isToday ? 'bg-cyan-500/20 border border-cyan-500/40' : 'bg-white/5'}`}>
                <div className="text-xs text-zinc-400">{date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                <div className={`text-lg font-bold ${isToday ? 'text-cyan-400' : 'text-white'}`}>{date.getDate()}</div>
              </div>
            );
          })}
        </div>
        
        <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-8 gap-2">
            {TIME_SLOTS.map((time) => (
              <React.Fragment key={time}>
                <div className="text-xs text-zinc-500 py-2 pr-2 text-right border-r border-white/10">{time}</div>
                {weekDates.map(date => {
                  const dayEvents = getEventsForDay(date).filter(e => e.time?.startsWith(time.split(':')[0]));
                  return (
                    <div
                      key={`${date.toISOString()}-${time}`}
                      onClick={() => { setSelectedDate(date); setShowEventModal(true); }}
                      className="min-h-[60px] p-1 rounded-lg border border-white/5 hover:border-cyan-500/30 hover:bg-white/5 transition-all cursor-pointer"
                    >
                      {dayEvents.map(event => (
                        <div
                          key={event.id}
                          onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); setShowEventDetails(true); }}
                          className={`text-xs px-2 py-1 rounded mb-1 truncate ${
                            event.type === 'meeting' ? 'bg-blue-500/30 text-blue-200' :
                            event.type === 'deadline' ? 'bg-red-500/30 text-red-200' :
                            'bg-purple-500/30 text-purple-200'
                          }`}
                        >
                          {event.title}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const dayEvents = getEventsForDay(selectedDate);
    
    return (
      <div className="space-y-2">
        <div className="text-center py-4 bg-white/5 rounded-xl border border-white/10">
          <div className="text-sm text-zinc-400">{selectedDate.toLocaleDateString('en-US', { weekday: 'long' })}</div>
          <div className="text-3xl font-bold text-white mt-1">{selectedDate.getDate()}</div>
          <div className="text-sm text-zinc-400">{selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
        </div>
        
        <div className="max-h-[600px] overflow-y-auto custom-scrollbar space-y-1">
          {TIME_SLOTS.map(time => {
            const timeEvents = dayEvents.filter(e => e.time?.startsWith(time.split(':')[0]));
            return (
              <div
                key={time}
                onClick={() => setShowEventModal(true)}
                className="flex items-start gap-3 p-3 rounded-lg border border-white/10 hover:border-cyan-500/30 hover:bg-white/5 transition-all cursor-pointer min-h-[70px]"
              >
                <div className="text-xs text-zinc-500 font-medium w-16">{time}</div>
                <div className="flex-1 space-y-2">
                  {timeEvents.map(event => (
                    <div
                      key={event.id}
                      onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); setShowEventDetails(true); }}
                      className={`p-3 rounded-lg border ${
                        event.type === 'meeting' ? 'bg-blue-500/20 border-blue-500/40 text-blue-200' :
                        event.type === 'deadline' ? 'bg-red-500/20 border-red-500/40 text-red-200' :
                        'bg-purple-500/20 border-purple-500/40 text-purple-200'
                      }`}
                    >
                      <div className="font-semibold">{event.title}</div>
                      {event.description && <div className="text-xs mt-1 opacity-80">{event.description}</div>}
                      {event.attendees && event.attendees.length > 0 && (
                        <div className="text-xs mt-2 opacity-60">👥 {event.attendees.join(', ')}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderListView = () => {
    const upcoming = events
      .filter(e => new Date(e.date) >= new Date())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    return (
      <div className="space-y-3 max-h-[700px] overflow-y-auto custom-scrollbar">
        {upcoming.map(event => (
          <motion.div
            key={event.id}
            whileHover={{ scale: 1.01 }}
            onClick={() => { setSelectedEvent(event); setShowEventDetails(true); }}
            className={`p-5 rounded-xl border cursor-pointer transition-all ${
              event.type === 'meeting' ? 'bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20' :
              event.type === 'deadline' ? 'bg-red-500/10 border-red-500/20 hover:bg-red-500/20' :
              'bg-purple-500/10 border-purple-500/20 hover:bg-purple-500/20'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    event.type === 'meeting' ? 'bg-blue-500/30 text-blue-200' :
                    event.type === 'deadline' ? 'bg-red-500/30 text-red-200' :
                    'bg-purple-500/30 text-purple-200'
                  }`}>
                    {event.type.toUpperCase()}
                  </div>
                  <div className="text-sm text-zinc-400">
                    {new Date(event.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                    {event.time && ` • ${event.time}`}
                  </div>
                </div>
                <h4 className="text-white font-semibold text-lg mb-1">{event.title}</h4>
                {event.description && <p className="text-zinc-400 text-sm">{event.description}</p>}
                {event.attendees && event.attendees.length > 0 && (
                  <div className="mt-2 text-xs text-zinc-500">👥 Attendees: {event.attendees.join(', ')}</div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
        {upcoming.length === 0 && (
          <div className="text-center py-16">
            <CalendarIcon className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
            <p className="text-zinc-400">No upcoming events</p>
          </div>
        )}
      </div>
    );
  };

  const monthName = selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <CalendarIcon className="w-10 h-10 text-cyan-400" />
            Calendar
          </h1>
          <p className="text-zinc-400">Manage your schedule and events</p>
        </div>

        {/* Calendar Card */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-2xl font-semibold text-white">{monthName}</h3>
              <p className="text-sm text-zinc-400 mt-1">{events.length} events scheduled</p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* View Mode Selector */}
              <div className="flex items-center gap-1 p-1 bg-white/5 rounded-lg border border-white/10">
                {[
                  { id: 'month', label: 'Month' },
                  { id: 'week', label: 'Week' },
                  { id: 'day', label: 'Day' },
                  { id: 'list', label: 'List' }
                ].map(view => (
                  <button
                    key={view.id}
                    onClick={() => setCalendarView(view.id as 'month' | 'week' | 'day' | 'list')}
                    className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                      calendarView === view.id
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                        : 'text-zinc-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {view.label}
                  </button>
                ))}
              </div>

              <div className="h-6 w-px bg-white/10" />
              
              {/* Navigation */}
              <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white/10 rounded-lg transition-all">
                <ChevronLeft className="w-5 h-5 text-white" />
              </button>
              <button onClick={() => setSelectedDate(new Date())} className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm hover:bg-white/10 transition-all font-medium">
                Today
              </button>
              <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white/10 rounded-lg transition-all">
                <ChevronRight className="w-5 h-5 text-white" />
              </button>
              
              <div className="h-6 w-px bg-white/10" />
              
              <button
                onClick={() => setShowEventModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/40 rounded-lg text-cyan-400 hover:from-cyan-500/30 hover:to-blue-500/30 transition-all flex items-center gap-2 font-medium"
              >
                <Plus className="w-4 h-4" />
                New Event
              </button>
            </div>
          </div>

          {/* Render Selected View */}
          {calendarView === 'month' && renderMonthView()}
          {calendarView === 'week' && renderWeekView()}
          {calendarView === 'day' && renderDayView()}
          {calendarView === 'list' && renderListView()}
        </div>
      </div>

      {/* Add Event Modal */}
      <AnimatePresence>
        {showEventModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setShowEventModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-900 border border-white/20 rounded-2xl p-6 max-w-md w-full shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-white">New Event</h3>
                <button onClick={() => setShowEventModal(false)} className="text-zinc-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Title *</label>
                  <input
                    type="text"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                    placeholder="Event title"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Date</label>
                    <input
                      type="text"
                      value={selectedDate.toLocaleDateString()}
                      disabled
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-zinc-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Time</label>
                    <input
                      type="time"
                      value={newEvent.time}
                      onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Type</label>
                  <select
                    value={newEvent.type}
                    onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value as 'meeting' | 'deadline' | 'event' })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="meeting">Meeting</option>
                    <option value="deadline">Deadline</option>
                    <option value="event">Event</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Description</label>
                  <textarea
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                    rows={3}
                    placeholder="Event description"
                  />
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Location</label>
                  <input
                    type="text"
                    value={newEvent.location}
                    onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                    placeholder="Meeting room, venue, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Attendees</label>
                  <input
                    type="text"
                    value={newEvent.attendees}
                    onChange={(e) => setNewEvent({ ...newEvent, attendees: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                    placeholder="Comma-separated names"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowEventModal(false)}
                  className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={addEvent}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg text-white hover:from-cyan-600 hover:to-blue-600 transition-all font-medium"
                >
                  Add Event
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Event Details Modal */}
      <AnimatePresence>
        {showEventDetails && selectedEvent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setShowEventDetails(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-900 border border-white/20 rounded-2xl p-6 max-w-md w-full shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  selectedEvent.type === 'meeting' ? 'bg-blue-500/30 text-blue-200' :
                  selectedEvent.type === 'deadline' ? 'bg-red-500/30 text-red-200' :
                  'bg-purple-500/30 text-purple-200'
                }`}>
                  {selectedEvent.type.toUpperCase()}
                </div>
                <button onClick={() => setShowEventDetails(false)} className="text-zinc-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <h3 className="text-2xl font-bold text-white mb-4">{selectedEvent.title}</h3>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2 text-zinc-300">
                  <CalendarIcon className="w-4 h-4 text-cyan-400" />
                  <span>{new Date(selectedEvent.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
                </div>
                
                {selectedEvent.time && (
                  <div className="flex items-center gap-2 text-zinc-300">
                    <Clock className="w-4 h-4 text-cyan-400" />
                    <span>{selectedEvent.time}</span>
                  </div>
                )}

                {selectedEvent.location && (
                  <div className="flex items-center gap-2 text-zinc-300">
                    <MapPin className="w-4 h-4 text-cyan-400" />
                    <span>{selectedEvent.location}</span>
                  </div>
                )}

                {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
                  <div className="flex items-start gap-2 text-zinc-300">
                    <UsersIcon className="w-4 h-4 text-cyan-400 mt-1" />
                    <span>{selectedEvent.attendees.join(', ')}</span>
                  </div>
                )}
              </div>

              {selectedEvent.description && (
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-zinc-400 mb-2">Description</h4>
                  <p className="text-zinc-300 text-sm leading-relaxed">{selectedEvent.description}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setShowEventDetails(false)}
                  className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white hover:bg-white/10 transition-all"
                >
                  Close
                </button>
                <button
                  onClick={deleteEvent}
                  className="px-4 py-2 bg-red-500/20 border border-red-500/40 rounded-lg text-red-400 hover:bg-red-500/30 transition-all flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
