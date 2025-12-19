'use client';

import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { twMerge } from 'tailwind-merge';
import { motion } from 'framer-motion';

type BookingItem = {
    resource_type: 'court' | 'coach' | 'equipment';
    resource_name: string;
    quantity: number;
    price: string;
};

type Booking = {
    id: number;
    start_time: string;
    end_time: string;
    total_price: string;
    status: 'confirmed' | 'cancelled';
    items: BookingItem[];
};

export default function BookingHistory() {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await fetch('/api/my-bookings?user_name=Guest User');
                const contentType = res.headers.get("content-type");

                if (res.ok && contentType && contentType.includes("application/json")) {
                    const data = await res.json();
                    setBookings(data);
                } else {
                    // Handle non-JSON response silently or log warning
                    const text = await res.text();
                    console.warn("BookingHistory: Invalid API response", text.substring(0, 50));
                }
            } catch (err) {
                console.error("BookingHistory Error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, []);

    if (loading) return <div className="text-center p-8 text-gray-500">Loading history...</div>;

    if (bookings.length === 0) {
        return (
            <div className="text-center p-8 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                <p className="text-gray-500">No bookings found.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-black text-gray-800 pl-2 border-l-4 border-indigo-600">Booking History</h2>
            <div className="grid gap-6">
                {bookings.map((booking) => (
                    // @ts-ignore - framer motion type issue with server components sometimes, but ok here
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ scale: 1.01, boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)' }}
                        key={booking.id}
                        className="bg-white/60 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-white/50 hover:border-indigo-100 transition-colors"
                    >
                        {/* Header */}
                        <div className="flex justify-between items-start mb-4 border-b border-dashed border-gray-200 pb-4">
                            <div>
                                <p className="text-lg font-bold text-gray-900">
                                    {format(parseISO(booking.start_time), 'MMMM d, yyyy')}
                                </p>
                                <p className="text-sm font-medium text-gray-500 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                                    {format(parseISO(booking.start_time), 'h:mm a')} - {format(parseISO(booking.end_time), 'h:mm a')}
                                </p>
                            </div>
                            <div className="text-right">
                                <span className="block text-2xl font-black text-gray-900 tracking-tight">
                                    ${parseFloat(booking.total_price).toFixed(2)}
                                </span>
                                <span className={twMerge(
                                    "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide mt-1",
                                    booking.status === 'confirmed' ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                                )}>
                                    {booking.status}
                                </span>
                            </div>
                        </div>

                        {/* Items */}
                        <div className="space-y-3">
                            {booking.items.map((item, idx) => (
                                <div key={idx} className="flex items-center text-sm text-gray-700 bg-gray-50/50 p-2 rounded-lg">
                                    <span className="w-24 font-bold uppercase text-xs text-gray-400 tracking-wider">
                                        {item.resource_type}
                                    </span>
                                    <span className="flex-grow font-semibold text-gray-800">
                                        {item.resource_name}
                                        {item.quantity > 1 && <span className="ml-2 inline-block bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full font-bold">x{item.quantity}</span>}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
