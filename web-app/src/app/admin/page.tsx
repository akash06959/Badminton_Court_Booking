'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Trash2, Plus, Save, Edit2, X, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Notification } from '@/components/ui/Notification';

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState<'courts' | 'coaches' | 'equipment' | 'rules'>('courts');

    return (
        <div className="min-h-screen bg-slate-50 relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 z-0 opacity-40 pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
            </div>

            <div className="max-w-6xl mx-auto p-8 relative z-10">
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                    <div className="flex items-center gap-4">
                        <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-indigo-800">
                            Admin Configuration
                        </h1>
                        <Link href="/" className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-600 text-xs font-bold uppercase tracking-wider rounded-full border border-indigo-100 hover:bg-indigo-50 hover:border-indigo-200 shadow-sm transition-all group">
                            Visit Site <ExternalLink size={14} className="group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                    </div>
                    <div className="flex bg-white/50 p-1 rounded-xl backdrop-blur-sm border border-white/20 shadow-sm overflow-x-auto">
                        <TabButton
                            active={activeTab === 'courts'}
                            onClick={() => setActiveTab('courts')}
                            label="Courts"
                        />
                        <TabButton
                            active={activeTab === 'coaches'}
                            onClick={() => setActiveTab('coaches')}
                            label="Coaches"
                        />
                        <TabButton
                            active={activeTab === 'equipment'}
                            onClick={() => setActiveTab('equipment')}
                            label="Equipment"
                        />
                        <TabButton
                            active={activeTab === 'rules'}
                            onClick={() => setActiveTab('rules')}
                            label="Pricing Rules"
                        />
                    </div>
                </div>

                <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 p-6 min-h-[500px]">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                        >
                            {activeTab === 'courts' && <CourtsManager />}
                            {activeTab === 'coaches' && <CoachesManager />}
                            {activeTab === 'equipment' && <EquipmentManager />}
                            {activeTab === 'rules' && <RulesManager />}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}

function TabButton({ active, onClick, label }: any) {
    return (
        <button
            onClick={onClick}
            className={`px-6 py-2 rounded-lg font-bold text-sm transition-all whitespace-nowrap ${active
                ? 'bg-white text-indigo-600 shadow-md ring-1 ring-black/5'
                : 'text-gray-500 hover:text-gray-700 hover:bg-white/30'
                }`}
        >
            {label}
        </button>
    );
}

// --- SUB-COMPONENTS ---

function CourtsManager() {
    const [courts, setCourts] = useState<any[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, id: number | null }>({ isOpen: false, id: null });

    // Form State
    const [newCourt, setNewCourt] = useState({ name: '', type: 'indoor', base_price_per_hour: '20' });

    const fetchCourts = () => {
        fetch('/api/courts').then(res => res.json()).then(setCourts);
    };

    useEffect(() => { fetchCourts(); }, []);

    const handleCreate = async () => {
        try {
            const res = await fetch('/api/admin/courts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newCourt)
            });
            if (!res.ok) throw new Error("Failed to create court");

            setNotification({ message: "Court created successfully", type: "success" });
            setIsAdding(false);
            setNewCourt({ name: '', type: 'indoor', base_price_per_hour: '20' });
            fetchCourts();
        } catch (e) {
            setNotification({ message: "Error creating court", type: "error" });
        }
    };

    const confirmDelete = (id: number) => {
        setConfirmModal({ isOpen: true, id });
    };

    const handleDelete = async () => {
        if (!confirmModal.id) return;
        try {
            const res = await fetch(`/api/admin/courts/${confirmModal.id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error("Failed to delete");

            setNotification({ message: "Court deleted successfully", type: "success" });
            fetchCourts();
        } catch (e) {
            setNotification({ message: "Could not delete court (it may have bookings)", type: "error" });
        } finally {
            setConfirmModal({ isOpen: false, id: null });
        }
    };

    return (
        <div>
            {/* Popups */}
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
                isOpen={confirmModal.isOpen}
                title="Delete Court?"
                message="Are you sure you want to delete this court? This action cannot be undone if there are no active bookings."
                onConfirm={handleDelete}
                onCancel={() => setConfirmModal({ isOpen: false, id: null })}
                isDanger={true}
                confirmText="Yes, Delete"
            />

            <div className="flex justify-between mb-6 border-b border-gray-100 pb-4">
                <h2 className="text-xl font-bold text-gray-800">Manage Courts</h2>
                <button
                    onClick={() => setIsAdding(true)}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 transition-all font-semibold text-sm"
                >
                    <Plus size={16} /> Add Court
                </button>
            </div>

            {isAdding && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mb-6 p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 grid grid-cols-1 md:grid-cols-4 gap-4 items-end"
                >
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase">Name</label>
                        <input className="w-full p-2 border border-gray-200 rounded-lg text-sm" value={newCourt.name} onChange={e => setNewCourt({ ...newCourt, name: e.target.value })} placeholder="Court Name" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase">Type</label>
                        <select className="w-full p-2 border border-gray-200 rounded-lg text-sm" value={newCourt.type} onChange={e => setNewCourt({ ...newCourt, type: e.target.value })}>
                            <option value="indoor">Indoor</option>
                            <option value="outdoor">Outdoor</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase">Base Price ($)</label>
                        <input type="number" className="w-full p-2 border border-gray-200 rounded-lg text-sm" value={newCourt.base_price_per_hour} onChange={e => setNewCourt({ ...newCourt, base_price_per_hour: e.target.value })} />
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleCreate} className="bg-indigo-600 text-white p-2 rounded-lg flex-1 shadow font-medium text-sm">Save</button>
                        <button onClick={() => setIsAdding(false)} className="bg-white text-gray-500 p-2 rounded-lg border border-gray-200 hover:bg-gray-50"><X size={20} /></button>
                    </div>
                </motion.div>
            )}

            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="border-b border-gray-200 text-gray-400 text-xs uppercase tracking-wider">
                        <th className="py-3 pl-2">ID</th>
                        <th className="py-3">Name</th>
                        <th className="py-3">Type</th>
                        <th className="py-3">Base Price</th>
                        <th className="py-3 text-right pr-2">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {courts.map(court => (
                        <tr key={court.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                            <td className="py-4 pl-2 text-gray-500 text-sm font-mono">#{court.id}</td>
                            <td className="py-4 font-bold text-gray-800">{court.name}</td>
                            <td className="py-4">
                                <span className={`px-2 py-1 text-xs rounded-full uppercase font-bold tracking-wide ${court.type === 'indoor' ? 'bg-indigo-100 text-indigo-700' : 'bg-orange-100 text-orange-700'}`}>
                                    {court.type}
                                </span>
                            </td>
                            <td className="py-4 font-medium text-gray-600">${court.base_price_per_hour}/hr</td>
                            <td className="py-4 text-right pr-2">
                                <button
                                    onClick={() => confirmDelete(court.id)}
                                    className="text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function CoachesManager() {
    const [coaches, setCoaches] = useState<any[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const [newCoach, setNewCoach] = useState({ name: '', bio: '', hourly_rate: '40' });

    const fetchCoaches = () => {
        fetch('/api/coaches').then(res => res.json()).then(setCoaches);
    };

    useEffect(() => { fetchCoaches(); }, []);

    const handleCreate = async () => {
        try {
            const res = await fetch('/api/admin/coaches', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newCoach)
            });
            if (!res.ok) throw new Error("Failed");
            setNotification({ message: "Coach added", type: "success" });
            setIsAdding(false);
            setNewCoach({ name: '', bio: '', hourly_rate: '40' });
            fetchCoaches();
        } catch (e) {
            setNotification({ message: "Error adding coach", type: "error" });
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure?')) return;
        try {
            const res = await fetch(`/api/admin/coaches/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error("Failed");
            setNotification({ message: "Coach removed", type: "success" });
            fetchCoaches();
        } catch (e) {
            setNotification({ message: "Error removing coach", type: "error" });
        }
    }

    return (
        <div>
            <AnimatePresence>
                {notification && (
                    <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />
                )}
            </AnimatePresence>

            <div className="flex justify-between mb-6 border-b border-gray-100 pb-4">
                <h2 className="text-xl font-bold text-gray-800">Manage Coaches</h2>
                <button
                    onClick={() => setIsAdding(true)}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 transition-all font-semibold text-sm"
                >
                    <Plus size={16} /> Add Coach
                </button>
            </div>

            {isAdding && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mb-6 p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 grid grid-cols-1 md:grid-cols-4 gap-4 items-end"
                >
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase">Name</label>
                        <input className="w-full p-2 border border-gray-200 rounded-lg text-sm" value={newCoach.name} onChange={e => setNewCoach({ ...newCoach, name: e.target.value })} placeholder="Coach Name" />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-gray-500 uppercase">Bio</label>
                        <input className="w-full p-2 border border-gray-200 rounded-lg text-sm" value={newCoach.bio} onChange={e => setNewCoach({ ...newCoach, bio: e.target.value })} placeholder="Short bio" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase">Rate ($/hr)</label>
                        <input type="number" className="w-full p-2 border border-gray-200 rounded-lg text-sm" value={newCoach.hourly_rate} onChange={e => setNewCoach({ ...newCoach, hourly_rate: e.target.value })} />
                    </div>
                    <div className="flex gap-2 md:col-span-4 justify-end">
                        <button onClick={() => setIsAdding(false)} className="bg-white text-gray-500 p-2 rounded-lg border border-gray-200 hover:bg-gray-50">Cancel</button>
                        <button onClick={handleCreate} className="bg-indigo-600 text-white px-6 py-2 rounded-lg shadow font-medium text-sm">Save Coach</button>
                    </div>
                </motion.div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {coaches.map(coach => (
                    <div key={coach.id} className="bg-gradient-to-br from-white to-gray-50 p-6 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center group hover:shadow-md hover:border-indigo-100 transition-all relative">
                        <div>
                            <h4 className="font-bold text-gray-900 text-lg group-hover:text-indigo-700 transition-colors">{coach.name}</h4>
                            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{coach.bio}</p>
                        </div>
                        <div className="text-right pl-4">
                            <div className="text-2xl font-black text-gray-900">${coach.hourly_rate}</div>
                            <div className="text-xs text-gray-400 uppercase font-bold">per hour</div>
                        </div>
                        <button onClick={() => handleDelete(coach.id)} className="absolute top-2 right-2 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors">
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}

function EquipmentManager() {
    const [equipment, setEquipment] = useState<any[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const [newEquip, setNewEquip] = useState({ name: '', total_quantity: '10', price_per_use: '5' });

    const fetchEquipment = () => {
        fetch('/api/equipment').then(res => res.json()).then(setEquipment);
    };

    useEffect(() => { fetchEquipment(); }, []);

    const handleCreate = async () => {
        try {
            const res = await fetch('/api/admin/equipment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newEquip)
            });
            if (!res.ok) throw new Error("Failed");
            setNotification({ message: "Equipment added", type: "success" });
            setIsAdding(false);
            setNewEquip({ name: '', total_quantity: '10', price_per_use: '5' });
            fetchEquipment();
        } catch (e) {
            setNotification({ message: "Error adding equipment", type: "error" });
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure?')) return;
        try {
            const res = await fetch(`/api/admin/equipment/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error("Failed");
            setNotification({ message: "Equipment removed", type: "success" });
            fetchEquipment();
        } catch (e) {
            setNotification({ message: "Error removing equipment", type: "error" });
        }
    }

    return (
        <div>
            <AnimatePresence>
                {notification && (
                    <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />
                )}
            </AnimatePresence>

            <div className="flex justify-between mb-6 border-b border-gray-100 pb-4">
                <h2 className="text-xl font-bold text-gray-800">Manage Equipment</h2>
                <button
                    onClick={() => setIsAdding(true)}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 transition-all font-semibold text-sm"
                >
                    <Plus size={16} /> Add Equipment
                </button>
            </div>

            {isAdding && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mb-6 p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 grid grid-cols-1 md:grid-cols-4 gap-4 items-end"
                >
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase">Item Name</label>
                        <input className="w-full p-2 border border-gray-200 rounded-lg text-sm" value={newEquip.name} onChange={e => setNewEquip({ ...newEquip, name: e.target.value })} placeholder="e.g. Racket" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase">Total Qty</label>
                        <input type="number" className="w-full p-2 border border-gray-200 rounded-lg text-sm" value={newEquip.total_quantity} onChange={e => setNewEquip({ ...newEquip, total_quantity: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase">Price ($)</label>
                        <input type="number" className="w-full p-2 border border-gray-200 rounded-lg text-sm" value={newEquip.price_per_use} onChange={e => setNewEquip({ ...newEquip, price_per_use: e.target.value })} />
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleCreate} className="bg-indigo-600 text-white p-2 rounded-lg flex-1 shadow font-medium text-sm">Save</button>
                        <button onClick={() => setIsAdding(false)} className="bg-white text-gray-500 p-2 rounded-lg border border-gray-200 hover:bg-gray-50"><X size={20} /></button>
                    </div>
                </motion.div>
            )}

            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="border-b border-gray-200 text-gray-400 text-xs uppercase tracking-wider">
                        <th className="py-3 pl-2">ID</th>
                        <th className="py-3">Name</th>
                        <th className="py-3">Inventory</th>
                        <th className="py-3">Price</th>
                        <th className="py-3 text-right pr-2">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {equipment.map(item => (
                        <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                            <td className="py-4 pl-2 text-gray-500 text-sm font-mono">#{item.id}</td>
                            <td className="py-4 font-bold text-gray-800">{item.name}</td>
                            <td className="py-4">
                                <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-bold">{item.total_quantity} units</span>
                            </td>
                            <td className="py-4 font-medium text-emerald-600">+${item.price_per_use}</td>
                            <td className="py-4 text-right pr-2">
                                <button
                                    onClick={() => handleDelete(item.id)}
                                    className="text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function RulesManager() {
    const [rules, setRules] = useState<any[]>([]);
    const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const [isAdding, setIsAdding] = useState(false);

    // Simplistic Rule Builder
    const [newRule, setNewRule] = useState({
        name: '',
        type: 'multiplier',
        value: '1.2',
        conditionType: 'weekend' // 'weekend' | 'peak'
    });

    const fetchRules = () => {
        fetch('/api/admin/rules').then(res => res.json()).then(setRules);
    };

    useEffect(() => { fetchRules(); }, []);

    const toggleRule = async (id: number, currentStatus: boolean, name: string) => {
        try {
            await fetch(`/api/admin/rules/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_active: !currentStatus })
            });
            fetchRules();
            setNotification({
                message: `${name} ${!currentStatus ? 'Activated' : 'Disabled'}`,
                type: 'success'
            });
        } catch (e) {
            setNotification({ message: "Failed to update rule", type: 'error' });
        }
    };

    const handleCreate = async () => {
        try {
            let conditions = {};
            if (newRule.conditionType === 'weekend') {
                conditions = { days_of_week: [0, 6] };
            } else {
                conditions = { start_hour: 18, end_hour: 21 }; // Hardcoded 6-9PM for demo
            }

            const payload = {
                name: newRule.name,
                type: newRule.type,
                value: newRule.value,
                conditions: JSON.stringify(conditions)
            };

            const res = await fetch('/api/admin/rules', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error("Failed");

            setNotification({ message: "Rule added successfully", type: "success" });
            setIsAdding(false);
            setNewRule({ name: '', type: 'multiplier', value: '1.2', conditionType: 'weekend' });
            fetchRules();
        } catch (e) {
            setNotification({ message: "Error creating rule", type: "error" });
        }
    };

    return (
        <div>
            <AnimatePresence>
                {notification && (
                    <Notification
                        message={notification.message}
                        type={notification.type}
                        onClose={() => setNotification(null)}
                    />
                )}
            </AnimatePresence>

            <div className="flex justify-between mb-6 border-b border-gray-100 pb-4">
                <h2 className="text-xl font-bold text-gray-800">Pricing Configuration</h2>
                <button
                    onClick={() => setIsAdding(true)}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 transition-all font-semibold text-sm"
                >
                    <Plus size={16} /> Add Rule
                </button>
            </div>

            {isAdding && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mb-6 p-4 bg-indigo-50/50 rounded-xl border border-indigo-100"
                >
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div className="md:col-span-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase">Rule Name</label>
                            <input className="w-full p-2 border border-gray-200 rounded-lg text-sm" value={newRule.name} onChange={e => setNewRule({ ...newRule, name: e.target.value })} placeholder="e.g. Weekend Boom" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase">Type</label>
                            <select className="w-full p-2 border border-gray-200 rounded-lg text-sm" value={newRule.type} onChange={e => setNewRule({ ...newRule, type: e.target.value })}>
                                <option value="multiplier">Multiplier</option>
                                <option value="flat_fee">Flat Fee</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase">Value</label>
                            <input className="w-full p-2 border border-gray-200 rounded-lg text-sm" type="number" step="0.1" value={newRule.value} onChange={e => setNewRule({ ...newRule, value: e.target.value })} />
                            <span className="text-[10px] text-gray-400">Ex: 1.5 for 1.5x, 5 for $5</span>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase">Preset</label>
                            <select className="w-full p-2 border border-gray-200 rounded-lg text-sm" value={newRule.conditionType} onChange={e => setNewRule({ ...newRule, conditionType: e.target.value })}>
                                <option value="weekend">Weekend (Sat/Sun)</option>
                                <option value="peak">Peak Hours (6-9 PM)</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex gap-2 justify-end mt-4">
                        <button onClick={() => setIsAdding(false)} className="bg-white text-gray-500 p-2 rounded-lg border border-gray-200 hover:bg-gray-50">Cancel</button>
                        <button onClick={handleCreate} className="bg-indigo-600 text-white px-6 py-2 rounded-lg shadow font-medium text-sm">Create Rule</button>
                    </div>
                </motion.div>
            )}

            <div className="space-y-4">
                {rules.map(rule => (
                    <div key={rule.id} className={`p-4 rounded-xl flex justify-between items-center transition-all border ${rule.is_active ? 'bg-white border-indigo-100 shadow-sm' : 'bg-gray-50 border-gray-200 opacity-60 grayscale-[0.5]'}`}>
                        <div>
                            <div className="flex items-center gap-3">
                                <h4 className={`font-bold ${rule.is_active ? 'text-gray-900' : 'text-gray-500'}`}>{rule.name}</h4>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold border tracking-wider ${rule.type === 'multiplier' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                                    {rule.type}
                                </span>
                            </div>
                            <code className="text-xs text-gray-400 font-mono mt-1.5 inline-block">
                                {JSON.stringify(rule.conditions)}
                            </code>
                        </div>

                        <div className="flex items-center gap-6">
                            <div className="text-right">
                                <div className="text-lg font-black text-gray-800">
                                    {rule.type === 'multiplier' ? `${rule.value}x` : `+$${rule.value}`}
                                </div>
                            </div>

                            <button
                                onClick={() => toggleRule(rule.id, rule.is_active, rule.name)}
                                className={`
                                    w-14 h-8 rounded-full p-1 transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2
                                    ${rule.is_active ? 'bg-emerald-500 focus:ring-emerald-400' : 'bg-gray-200 focus:ring-gray-400'}
                                `}
                            >
                                <motion.div
                                    className="bg-white w-6 h-6 rounded-full shadow-md"
                                    layout
                                    transition={{ type: "spring", stiffness: 700, damping: 30 }}
                                    animate={{ x: rule.is_active ? 24 : 0 }}
                                />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
