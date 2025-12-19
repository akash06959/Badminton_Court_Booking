'use client';

import { useState, useEffect, useMemo } from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { format, addHours, startOfDay, isBefore, parseISO, areIntervalsOverlapping, setHours, setMinutes } from 'date-fns';
import { twMerge } from 'tailwind-merge';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Clock, AlertCircle } from 'lucide-react';
import { Notification } from '@/components/ui/Notification';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

// types
type Resource = {
    id: number;
    name: string;
}

type Court = Resource & { type: string; base_price_per_hour: string };
type Coach = Resource & { hourly_rate: string; bio: string };
type Equipment = Resource & { price_per_use: string; total_quantity: number };

type BookingItem = {
    resource_type: 'court' | 'coach' | 'equipment';
    resource_id: number;
    quantity?: number;
};

type BusySlot = {
    start_time: string;
    end_time: string;
    resource_type: string;
    resource_id: number;
};

const OPENING_HOUR = 8;
const CLOSING_HOUR = 22;

export default function BookingForm() {
    // --- State ---
    const [courts, setCourts] = useState<Court[]>([]);
    const [coaches, setCoaches] = useState<Coach[]>([]);
    const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);

    // Selections
    const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
    const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);
    const [selectedEquipment, setSelectedEquipment] = useState<{ [key: number]: number }>({}); // { eqId: quantity }

    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [duration, setDuration] = useState<number>(1);
    const [selectedStartTime, setSelectedStartTime] = useState<Date | null>(null);

    // Data
    const [busySlots, setBusySlots] = useState<BusySlot[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    // Waitlist State
    const [waitlistModal, setWaitlistModal] = useState<{ isOpen: boolean, slot: Date | null }>({ isOpen: false, slot: null });

    // --- Effects ---

    // Initial Data Fetch
    useEffect(() => {
        const fetchResources = async () => {
            try {
                // Helper to safely fetch JSON
                const safeFetch = async (url: string) => {
                    const res = await fetch(url);
                    const contentType = res.headers.get("content-type");
                    if (res.ok && contentType && contentType.includes("application/json")) {
                        return res.json();
                    }
                    const text = await res.text();
                    console.error(`API Error (${url}): Invalid JSON`, text.substring(0, 50));
                    return []; // Return empty array on failure to prevent crash
                };

                const [courtsData, coachesData, equipData] = await Promise.all([
                    safeFetch('/api/courts'),
                    safeFetch('/api/coaches'),
                    safeFetch('/api/equipment')
                ]);

                setCourts(courtsData);
                setCoaches(coachesData);
                setEquipmentList(equipData);

                if (courtsData.length > 0) setSelectedCourt(courtsData[0]);

            } catch (err) {
                console.error("Failed to load resources", err);
                setErrorMessage("Failed to connect to backend server.");
            }
        };
        fetchResources();
    }, []);

    // Fetch Availability
    useEffect(() => {
        setLoading(true);
        const dateStr = format(selectedDate, 'yyyy-MM-dd');

        fetch(`/api/bookings?date=${dateStr}`)
            .then(res => res.json())
            .then(data => {
                setBusySlots(data);
                setLoading(false);
                setSelectedStartTime(null);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [selectedDate]);


    // --- Logic ---

    // 1. Generate Time Slots
    const slots = useMemo(() => {
        const slotsArr = [];
        let current = setMinutes(setHours(selectedDate, OPENING_HOUR), 0);
        const end = setMinutes(setHours(selectedDate, CLOSING_HOUR), 0);

        while (current < end) {
            slotsArr.push(current);
            current = addHours(current, 1);
        }
        return slotsArr;
    }, [selectedDate]);

    // 2. Check Combo Availability
    const isSlotAvailable = (slotStart: Date) => {
        const slotEnd = addHours(slotStart, duration);

        // A. Court Check
        if (selectedCourt) {
            const courtBusy = busySlots.some(b =>
                b.resource_type === 'court' &&
                b.resource_id === selectedCourt.id &&
                areIntervalsOverlapping({ start: slotStart, end: slotEnd }, { start: parseISO(b.start_time), end: parseISO(b.end_time) })
            );
            if (courtBusy) return false;
        }

        // B. Coach Check
        if (selectedCoach) {
            const coachBusy = busySlots.some(b =>
                b.resource_type === 'coach' &&
                b.resource_id === selectedCoach.id &&
                areIntervalsOverlapping({ start: slotStart, end: slotEnd }, { start: parseISO(b.start_time), end: parseISO(b.end_time) })
            );
            if (coachBusy) return false;
        }

        // C. Closing Time Check
        const closingTime = setMinutes(setHours(selectedDate, CLOSING_HOUR), 0);
        if (isBefore(closingTime, slotEnd)) return false;

        return true;
    };

    const handleSlotClick = (slot: Date, available: boolean) => {
        if (!available) {
            // Open Waitlist Modal
            setWaitlistModal({ isOpen: true, slot });
            return;
        }
        setSelectedStartTime(slot);
    };

    const handleJoinWaitlist = async () => {
        if (!waitlistModal.slot || !selectedCourt) return;

        try {
            const payload = {
                user_name: 'Guest User', // Hardcoded for now
                resource_type: 'court',
                resource_id: selectedCourt.id,
                start_time: waitlistModal.slot.toISOString(),
                end_time: addHours(waitlistModal.slot, duration).toISOString()
            };

            const res = await fetch('/api/waitlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error("Failed to join waitlist");

            setNotification({ message: "Added to Waitlist! We'll notify you if a slot opens.", type: 'success' });
            setWaitlistModal({ isOpen: false, slot: null });

        } catch (e: any) {
            setNotification({ message: e.message, type: 'error' });
            setWaitlistModal({ isOpen: false, slot: null });
        }
    };

    // 3. Equipment Helpers
    const handleEquipmentChange = (id: number, qty: number) => {
        setSelectedEquipment(prev => ({
            ...prev,
            [id]: qty
        }));
    };

    // 4. Price Calculation (Client-Side Estimate)
    const estimatedPrice = useMemo(() => {
        if (!selectedCourt) return 0;

        let total = 0;

        // Court
        total += parseFloat(selectedCourt.base_price_per_hour) * duration;

        // Coach
        if (selectedCoach) {
            total += parseFloat(selectedCoach.hourly_rate) * duration;
        }

        // Equipment
        Object.entries(selectedEquipment).forEach(([id, qty]) => {
            if (qty > 0) {
                const item = equipmentList.find(e => e.id === parseInt(id));
                if (item) {
                    total += parseFloat(item.price_per_use) * qty;
                }
            }
        });

        // Current Rule Estimate (Weekend +20%)
        const day = selectedDate.getDay();
        if (day === 0 || day === 6) {
            total *= 1.2;
        }

        return total;
    }, [selectedCourt, selectedCoach, selectedEquipment, duration, equipmentList, selectedDate]);


    // 5. Submit Booking
    const handleBook = async () => {
        if (!selectedCourt || !selectedStartTime) return;

        setSubmitStatus('idle');
        setErrorMessage('');
        setNotification(null);

        // Build Payload
        const items: BookingItem[] = [
            { resource_type: 'court', resource_id: selectedCourt.id }
        ];

        if (selectedCoach) {
            items.push({ resource_type: 'coach', resource_id: selectedCoach.id });
        }

        Object.entries(selectedEquipment).forEach(([id, qty]) => {
            if (qty > 0) {
                items.push({ resource_type: 'equipment', resource_id: parseInt(id), quantity: qty });
            }
        });

        const payload = {
            user_name: 'Guest User',
            start_time: selectedStartTime.toISOString(),
            end_time: addHours(selectedStartTime, duration).toISOString(),
            items
        };

        try {
            const res = await fetch('/api/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Booking failed');
            }

            setSubmitStatus('success');
            setNotification({ message: 'Booking confirmed successfully!', type: 'success' });

            // Refresh Slots
            const dateStr = format(selectedDate, 'yyyy-MM-dd');
            fetch(`/api/bookings?date=${dateStr}`)
                .then(r => r.json())
                .then(d => setBusySlots(d));

            setSelectedStartTime(null);

        } catch (err: any) {
            setSubmitStatus('error');
            setErrorMessage(err.message);
            setNotification({ message: err.message, type: 'error' });
        }
    };

    return (
        <div className="relative">
            <AnimatePresence>
                {notification && (
                    <Notification
                        message={notification.message}
                        type={notification.type}
                        onClose={() => setNotification(null)}
                    />
                )}
            </AnimatePresence>

            <ConfirmModal
                isOpen={waitlistModal.isOpen}
                title="Join Waitlist?"
                message={waitlistModal.slot ? `This slot at ${format(waitlistModal.slot, 'h:mm a')} is currently booked. Would you like to join the waitlist?` : ''}
                onConfirm={handleJoinWaitlist}
                onCancel={() => setWaitlistModal({ isOpen: false, slot: null })}
                confirmText="Yes, Join Waitlist"
            />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="max-w-6xl mx-auto p-4 sm:p-8 bg-white/80 backdrop-blur-xl shadow-2xl rounded-3xl border border-white/50"
            >
                <h2 className="text-4xl font-black mb-8 text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-indigo-800 pb-2 border-b-2 border-gray-100">
                    Book Your Session
                </h2>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

                    {/* --- Left Column: Configuration --- */}
                    <div className="lg:col-span-4 space-y-8">

                        {/* Date */}
                        <div className="relative group z-30">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 group-focus-within:text-indigo-600 transition-colors">1. Select Date</label>
                            <div className="relative rounded-xl shadow-sm border border-gray-200 group-focus-within:ring-2 ring-indigo-500/50 transition-all bg-white">
                                <DatePicker
                                    selected={selectedDate}
                                    onChange={(date) => date && setSelectedDate(date)}
                                    className="w-full p-4 bg-transparent outline-none font-medium text-gray-700 rounded-xl"
                                    dateFormat="MMMM d, yyyy"
                                    minDate={new Date()}
                                />
                            </div>
                        </div>

                        {/* Court */}
                        <div className="relative group z-20">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 group-focus-within:text-indigo-600 transition-colors">2. Select Court</label>
                            <div className="relative">
                                <select
                                    className="w-full p-4 bg-gray-50/50 border border-gray-200 rounded-xl outline-none font-medium text-gray-700 appearance-none shadow-sm focus:ring-2 ring-indigo-500/50 transition-all cursor-pointer"
                                    onChange={(e) => {
                                        const court = courts.find(c => c.id === parseInt(e.target.value));
                                        setSelectedCourt(court || null);
                                    }}
                                    value={selectedCourt?.id || ''}
                                >
                                    {courts.length === 0 && <option>Loading courts...</option>}
                                    {courts.map(court => (
                                        <option key={court.id} value={court.id}>
                                            {court.name} - ${court.base_price_per_hour}/hr
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                    <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                </div>
                            </div>
                        </div>

                        {/* Coach */}
                        <div className="relative group z-10">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 group-focus-within:text-indigo-600 transition-colors">3. Add Coach (Optional)</label>
                            <div className="relative">
                                <select
                                    className="w-full p-4 bg-gray-50/50 border border-gray-200 rounded-xl outline-none font-medium text-gray-700 appearance-none shadow-sm focus:ring-2 ring-indigo-500/50 transition-all cursor-pointer"
                                    onChange={(e) => {
                                        const coach = coaches.find(c => c.id === parseInt(e.target.value));
                                        setSelectedCoach(coach || null);
                                    }}
                                    value={selectedCoach?.id || ''}
                                >
                                    <option value="">No Coach</option>
                                    {coaches.map(coach => (
                                        <option key={coach.id} value={coach.id}>
                                            {coach.name} (+${coach.hourly_rate}/hr)
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                    <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                </div>
                            </div>
                            {selectedCoach && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="mt-3 p-3 bg-indigo-50 rounded-lg border border-indigo-100"
                                >
                                    <p className="text-xs text-indigo-700 font-medium italic">"{selectedCoach.bio}"</p>
                                </motion.div>
                            )}
                        </div>

                        {/* Equipment */}
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">4. Rent Equipment</label>
                            <div className="space-y-4">
                                {equipmentList.map(item => (
                                    <motion.div
                                        whileHover={{ scale: 1.02, backgroundColor: '#F9FAFB' }}
                                        key={item.id}
                                        className="flex justify-between items-center p-3 rounded-xl border border-gray-100 transition-colors"
                                    >
                                        <span className="text-sm font-medium text-gray-700">{item.name} <span className="text-gray-400 text-xs">(+${item.price_per_use})</span></span>
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="number"
                                                min="0"
                                                max={item.total_quantity}
                                                value={selectedEquipment[item.id] || 0}
                                                onChange={(e) => handleEquipmentChange(item.id, parseInt(e.target.value))}
                                                className="w-16 p-2 bg-white border border-gray-200 rounded-lg text-center font-bold text-gray-800 outline-none focus:border-indigo-500 transition-colors"
                                            />
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>

                        {/* Duration */}
                        <div>
                            <div className="flex justify-between items-end mb-2">
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Duration</label>
                                <span className="text-indigo-600 font-bold text-lg">{duration} Hour{duration > 1 ? 's' : ''}</span>
                            </div>
                            <input
                                type="range"
                                min="1"
                                max="4"
                                value={duration}
                                onChange={(e) => setDuration(parseInt(e.target.value))}
                                className="w-full h-3 bg-gray-200 rounded-full appearance-none cursor-pointer accent-indigo-600 hover:accent-indigo-500 transition-all"
                            />
                            <div className="flex justify-between text-xs text-gray-400 mt-2 px-1">
                                <span>1h</span><span>4h</span>
                            </div>
                        </div>

                    </div>

                    {/* --- Right Column: Availability & Summary --- */}
                    <div className="lg:col-span-8 flex flex-col h-full">

                        {/* Time Slots */}
                        <div className="flex-grow mb-8 bg-gray-50/50 p-6 rounded-3xl border border-gray-100">
                            <h3 className="text-lg font-bold mb-6 text-gray-800 flex items-center gap-2">
                                Available Start Times
                                <span className="px-2 py-1 bg-white text-xs border rounded-md font-normal text-gray-500">
                                    {format(selectedDate, 'MMM d')}
                                </span>
                            </h3>

                            {loading ? (
                                <div className="flex justify-center items-center h-48">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                                    {slots.map((slot, idx) => {
                                        const available = isSlotAvailable(slot);
                                        const isSelected = selectedStartTime && slot.getTime() === selectedStartTime.getTime();

                                        return (
                                            <motion.button
                                                key={idx}
                                                whileHover={{ scale: 1.05, y: -2 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => handleSlotClick(slot, available)}
                                                className={twMerge(
                                                    "py-4 rounded-2xl text-sm font-bold transition-all relative overflow-hidden flex flex-col justify-center items-center gap-1",
                                                    !available
                                                        ? "bg-red-50 text-red-300 border border-red-100 opacity-80 hover:bg-red-100 hover:text-red-500 hover:border-red-200"
                                                        : isSelected
                                                            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 ring-2 ring-indigo-400 ring-offset-2"
                                                            : "bg-white text-gray-600 border border-gray-200 shadow-sm hover:shadow-md hover:border-indigo-200 hover:text-indigo-600"
                                                )}
                                            >
                                                {format(slot, 'HH:mm')}
                                                {!available && (
                                                    <span className="text-[10px] uppercase font-bold tracking-widest text-red-400">Busy</span>
                                                )}
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            )}
                            {!loading && slots.length === 0 && <p className="text-center text-gray-400 mt-8">No slots available for this configuration.</p>}
                        </div>

                        {/* Summary Footer */}
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="bg-black/95 backdrop-blur-xl text-white p-8 rounded-3xl shadow-2xl border border-white/10"
                        >
                            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                                <div className="w-full md:w-auto">
                                    <p className="text-gray-400 text-xs uppercase tracking-widest font-bold mb-1">Estimated Total</p>
                                    <div className="flex items-center gap-4">
                                        <span className="text-5xl font-black tracking-tight text-white">
                                            ${estimatedPrice.toFixed(0)}<span className="text-2xl text-gray-500 font-medium">.00</span>
                                        </span>
                                        {selectedDate.getDay() % 6 === 0 && (
                                            <div className="px-3 py-1 bg-yellow-500/20 border border-yellow-500/50 text-yellow-300 text-xs font-bold rounded-full uppercase tracking-wide">
                                                Weekend Rates
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-sm text-gray-400 mt-3 flex items-center gap-2">
                                        <span className="bg-white/10 px-2 py-1 rounded">{selectedCourt?.name}</span>
                                        {selectedCoach && <span className="bg-white/10 px-2 py-1 rounded">+ Coach</span>}
                                        {Object.values(selectedEquipment).some(q => q > 0) && <span className="bg-white/10 px-2 py-1 rounded">+ Equip</span>}
                                    </div>
                                </div>

                                <motion.button
                                    whileHover={!selectedStartTime ? {} : { scale: 1.02, boxShadow: "0px 10px 30px rgba(52, 211, 153, 0.4)" }}
                                    whileTap={!selectedStartTime ? {} : { scale: 0.98 }}
                                    onClick={handleBook}
                                    disabled={!selectedStartTime || submitStatus === 'success'}
                                    className={twMerge(
                                        "px-10 py-5 rounded-2xl font-bold text-lg transition-all w-full md:w-auto",
                                        !selectedStartTime
                                            ? "bg-gray-800 text-gray-600 cursor-not-allowed"
                                            : "bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-emerald-500/20"
                                    )}
                                >
                                    {submitStatus === 'success' ? (
                                        <span className="flex items-center gap-2"><Check size={20} /> Confirmed</span>
                                    ) : (
                                        "Book Session"
                                    )}
                                </motion.button>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
