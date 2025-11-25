import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, HardDrive, FileWarning, CheckCircle, Download, Clock, User, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import Background3D from '../components/Background3D';

import ThemeToggle from '../components/ThemeToggle';
import { useTheme } from '../context/ThemeContext';

function StatCard({ label, value, icon: Icon, color, delay }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
            className="bg-white dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 p-6 rounded-2xl hover:border-primary/50 dark:hover:border-primary/50 transition-all shadow-none group"
        >
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl bg-gray-100 dark:bg-white/5 ${color} group-hover:scale-110 transition-transform shadow-sm dark:shadow-none`}>
                    <Icon size={24} />
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400 font-mono font-medium tracking-wider">LIVE</span>
            </div>
            <h3 className="text-4xl font-bold text-black dark:text-white mb-1 tracking-tight">{value}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{label}</p>
        </motion.div>
    );
}

function RecentRow({ file, index }) {
    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + (index * 0.1) }}
            className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl transition-colors border-b border-gray-100 dark:border-white/5 last:border-0"
        >
            <div className="flex items-center gap-4">
                <div className="p-2 bg-gray-100 dark:bg-white/5 rounded-lg shadow-sm dark:shadow-none">
                    {file.status === 'Duplicate' ? <FileWarning size={20} className="text-red-500 dark:text-red-400" /> : <CheckCircle size={20} className="text-green-500 dark:text-green-400" />}
                </div>
                <div>
                    <h4 className="text-gray-900 dark:text-white font-semibold text-sm">{file.name}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{file.size} • {file.user}</p>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${file.status === 'Duplicate'
                    ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400'
                    : 'bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400'
                    }`}>
                    {file.status}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1 font-mono">
                    <Clock size={12} /> {file.date}
                </span>
            </div>
        </motion.div>
    );
}

export default function Dashboard() {
    const [searchTerm, setSearchTerm] = useState('');
    const [stats, setStats] = useState({
        totalDownloads: 0,
        duplicatesBlocked: 0,
        storageSaved: '0 B',
        activeUsers: 0,
        recentActivity: []
    });
    const [searchResults, setSearchResults] = useState([]);
    const { theme } = useTheme();

    useEffect(() => {
        // Fetch stats from backend
        fetch('http://localhost:9090/api/dashboard/stats')
            .then(res => res.json())
            .then(data => {
                setStats(data);
            })
            .catch(err => console.error("Failed to fetch stats:", err));

        // Poll every 5 seconds for live updates
        const interval = setInterval(() => {
            fetch('http://localhost:9090/api/dashboard/stats')
                .then(res => res.json())
                .then(data => setStats(data))
                .catch(err => console.error("Failed to fetch stats:", err));
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    // Handle Search
    useEffect(() => {
        if (searchTerm.length > 2) {
            fetch(`http://localhost:9090/api/dashboard/search?query=${searchTerm}`)
                .then(res => res.json())
                .then(data => setSearchResults(data))
                .catch(err => console.error("Search failed:", err));
        } else {
            setSearchResults([]);
        }
    }, [searchTerm]);

    const displayActivity = searchTerm.length > 2 ? searchResults : stats.recentActivity;

    const statCards = [
        { label: 'Total Downloads', value: stats.totalDownloads.toString(), icon: Download, color: 'text-blue-500 dark:text-blue-400' },
        { label: 'Duplicates Blocked', value: stats.duplicatesBlocked.toString(), icon: FileWarning, color: 'text-red-500 dark:text-red-400' },
        { label: 'Storage Saved', value: stats.storageSaved, icon: HardDrive, color: 'text-green-500 dark:text-green-400' },
        { label: 'Active Users', value: stats.activeUsers.toString(), icon: CheckCircle, color: 'text-purple-500 dark:text-purple-400' },
    ];

    return (
        <div className="min-h-screen font-sans selection:bg-primary/30 transition-colors duration-300 text-black dark:text-white">
            {/* Show 3D background in both themes */}
            <Background3D theme={theme} />


            <div className="relative z-10 container mx-auto px-6 py-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-between items-center mb-12"
                >
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-secondary p-[1px] shadow-lg shadow-primary/20">
                            <div className="h-full w-full rounded-2xl bg-white dark:bg-dark flex items-center justify-center">
                                <Activity className="text-primary" size={24} />
                            </div>
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                                DDAS Console
                            </h1>
                            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">System Overview</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="hidden md:block text-right">
                            <p className="text-xs text-gray-400 font-mono uppercase tracking-wider">Status</p>
                            <div className="flex items-center gap-2 justify-end">
                                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                                <p className="text-sm font-bold text-gray-900 dark:text-white">ONLINE</p>
                            </div>
                        </div>
                        <ThemeToggle />
                        <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-white/10 flex items-center justify-center border border-gray-300 dark:border-white/10">
                            <span className="font-bold text-xs text-gray-700 dark:text-white">AD</span>
                        </div>
                    </div>
                </motion.div>

                {/* Search */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="relative mb-12 max-w-2xl mx-auto group"
                >
                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                        <Search className="text-gray-400 group-focus-within:text-primary transition-colors" size={20} />
                    </div>
                    <input
                        type="text"
                        placeholder="Search for files, users, or hashes..."
                        className="w-full bg-white dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-2xl py-4 pl-12 pr-4 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all shadow-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </motion.div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                    {statCards.map((stat, i) => (
                        <StatCard key={i} {...stat} delay={0.3 + (i * 0.1)} />
                    ))}
                </div>

                {/* Recent Activity */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="bg-white dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl p-8 shadow-none"
                >
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                {searchTerm.length > 2 ? 'Search Results' : 'Recent Network Activity'}
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Real-time monitoring of file transfers</p>
                        </div>
                        <Link
                            to="/history"
                            className="text-sm font-medium text-primary hover:text-primary/80 transition-colors px-4 py-2 rounded-lg hover:bg-primary/10"
                        >
                            View Full History
                        </Link>
                    </div>
                    <div className="space-y-1">
                        {displayActivity.length > 0 ? (
                            displayActivity.map((file, i) => (
                                <RecentRow key={file.id || i} file={file} index={i} />
                            ))
                        ) : (
                            <div className="text-center py-12">
                                <div className="inline-flex p-4 rounded-full bg-gray-100 dark:bg-white/5 mb-4">
                                    <Search className="text-gray-400" size={24} />
                                </div>
                                <p className="text-gray-500 dark:text-gray-400 font-medium">
                                    {searchTerm.length > 2 ? 'No files found matching your query.' : 'No recent activity found.'}
                                </p>
                            </div>
                        )}
                    </div>
                </motion.div>

            </div>
        </div>
    );
}
