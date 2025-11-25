import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, FileWarning, CheckCircle, Clock, Search, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import Background3D from '../components/Background3D';
import ThemeToggle from '../components/ThemeToggle';
import { useTheme } from '../context/ThemeContext';

export default function History() {
    const [history, setHistory] = useState([]);
    const [filter, setFilter] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const { theme } = useTheme();

    useEffect(() => {
        fetch('http://localhost:9090/api/dashboard/history')
            .then(res => res.json())
            .then(data => setHistory(data))
            .catch(err => console.error("Failed to fetch history:", err));
    }, []);

    const filteredHistory = history.filter(item => {
        const matchesFilter = filter === 'All' || item.status === filter;
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.user.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    return (
        <div className="min-h-screen font-sans selection:bg-primary/30 transition-colors duration-300">
            {/* Show 3D background in both themes */}
            <Background3D theme={theme} />

            <div className="relative z-10 container mx-auto px-6 py-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between mb-8"
                >
                    <div className="flex items-center gap-4">
                        <Link
                            to="/"
                            className="p-2 rounded-full bg-white dark:bg-white/10 hover:bg-gray-100 dark:hover:bg-white/20 transition-colors border border-gray-200 dark:border-white/10 text-gray-700 dark:text-white"
                        >
                            <ArrowLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Download History</h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Full audit log of all file transfers</p>
                        </div>
                    </div>
                    <ThemeToggle />
                </motion.div>

                {/* Controls */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex flex-col md:flex-row gap-4 mb-8"
                >
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search history..."
                            className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl py-3 pl-12 pr-4 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all shadow-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2">
                        {['All', 'Saved', 'Duplicate'].map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-6 py-3 rounded-xl font-medium transition-all ${filter === f
                                    ? 'bg-primary text-black shadow-none'
                                    : 'bg-white dark:bg-white/5 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10'
                                    }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </motion.div>

                {/* Table */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl overflow-hidden shadow-none"
                >
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5">
                                    <th className="text-left py-5 px-6 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                    <th className="text-left py-5 px-6 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">File Name</th>
                                    <th className="text-left py-5 px-6 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
                                    <th className="text-left py-5 px-6 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Size</th>
                                    <th className="text-left py-5 px-6 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                {filteredHistory.map((file, index) => (
                                    <motion.tr
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: index * 0.05 }}
                                        key={file.id || index}
                                        className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group"
                                    >
                                        <td className="py-4 px-6">
                                            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${file.status === 'Duplicate'
                                                ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400'
                                                : 'bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400'
                                                }`}>
                                                {file.status === 'Duplicate' ? <FileWarning size={14} /> : <CheckCircle size={14} />}
                                                {file.status}
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className="font-medium text-gray-900 dark:text-white">{file.name}</span>
                                        </td>
                                        <td className="py-4 px-6 text-gray-600 dark:text-gray-400">{file.user}</td>
                                        <td className="py-4 px-6 text-gray-600 dark:text-gray-400 font-mono text-xs">{file.size}</td>
                                        <td className="py-4 px-6 text-gray-600 dark:text-gray-400 text-sm">
                                            <div className="flex items-center gap-2">
                                                <Clock size={14} className="text-gray-400" />
                                                {file.date}
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {filteredHistory.length === 0 && (
                        <div className="text-center py-12">
                            <div className="inline-flex p-4 rounded-full bg-gray-100 dark:bg-white/5 mb-4">
                                <Filter className="text-gray-400" size={24} />
                            </div>
                            <p className="text-gray-500 dark:text-gray-400 font-medium">No records found matching your filters.</p>
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
}
