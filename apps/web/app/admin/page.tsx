"use client";

import AdminRoute from "@/components/AdminRoute";
import { useEffect, useState } from "react";
import { UserProfile, getAllUsers, updateUserRole, getSystemConfig, updateSystemConfig, SystemConfig } from "@/lib/db";
import { SystemStats, fetchSystemStats } from "@/lib/api";
import { Loader2, Users, Server, Activity, Clock, Shield, ShieldAlert, BadgeCheck, Settings, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function AdminPage() {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [stats, setStats] = useState<SystemStats | null>(null);
    const [config, setConfig] = useState<SystemConfig | null>(null);
    const [loading, setLoading] = useState(true);

    const refreshData = async () => {
        setLoading(true);
        try {
            const [usersData, statsData, configData] = await Promise.all([
                getAllUsers(),
                fetchSystemStats(),
                getSystemConfig()
            ]);
            setUsers(usersData);
            setStats(statsData);
            setConfig(configData);
        } catch (error) {
            console.error("Failed to load admin data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshData();
    }, []);

    const handleToggleRole = async (user: UserProfile) => {
        const newRole = user.role === "admin" ? "user" : "admin";
        if (confirm(`Change role of ${user.displayName || user.email} to ${newRole}?`)) {
            await updateUserRole(user.uid, newRole);
            setUsers(prev => prev.map(u => u.uid === user.uid ? { ...u, role: newRole } : u));
        }
    };

    const toggleAIInsights = async () => {
        if (!config) return;
        const newValue = !config.features.showAIInsights;
        await updateSystemConfig({ features: { ...config.features, showAIInsights: newValue } });
        setConfig(prev => prev ? { ...prev, features: { ...prev.features, showAIInsights: newValue } } : null);
    };

    const formatUptime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return `${h}h ${m}m`;
    };

    return (
        <AdminRoute>
            <div className="min-h-screen bg-[#050505] text-white p-8 font-sans">
                <header className="mb-8 border-b border-white/10 pb-4 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight mb-1">Admin Dashboard</h1>
                        <p className="text-muted-foreground text-sm">System Overview & User Management</p>
                    </div>
                    <Button onClick={refreshData} variant="outline" size="sm">
                        Refresh Data
                    </Button>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <StatsCard title="Active Connections" value={stats?.active_connections || "-"} icon={<Users className="text-blue-400" />} />
                    <StatsCard title="CPU Usage" value={stats ? `${stats.cpu_usage}%` : "-"} icon={<Activity className="text-green-400" />} />
                    <StatsCard title="Total API Calls" value={stats?.total_api_calls || "-"} icon={<Server className="text-purple-400" />} />
                    <StatsCard title="System Uptime" value={stats ? formatUptime(stats.uptime_seconds) : "-"} icon={<Clock className="text-orange-400" />} />
                </div>

                <div className="mb-8">
                    <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <Settings className="w-5 h-5 text-primary" />
                        Feature Toggles
                    </h2>
                    <div className="bg-[#0B0E11] border border-white/10 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-medium">AI Insights Visibility</h3>
                                <p className="text-sm text-muted-foreground">Show/Hide AI Insight tab for all users</p>
                            </div>
                            <button
                                onClick={toggleAIInsights}
                                className={cn("transition-colors", config?.features.showAIInsights ? "text-primary" : "text-muted-foreground")}
                            >
                                {config?.features.showAIInsights ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="glass border border-white/10 rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-white/10 bg-white/5 flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <h2 className="font-semibold">Registered Users ({users.length})</h2>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-[#0B0E11] text-muted-foreground uppercase text-xs font-semibold">
                                <tr>
                                    <th className="px-4 py-3 text-left">User</th>
                                    <th className="px-4 py-3 text-left">Email</th>
                                    <th className="px-4 py-3 text-left">Role</th>
                                    <th className="px-4 py-3 text-left">Joined</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {loading && users.length === 0 ? (
                                    <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Loading...</td></tr>
                                ) : users.map(user => (
                                    <tr key={user.uid} className="hover:bg-white/5 transition-colors">
                                        <td className="px-4 py-3 flex items-center gap-3">
                                            {user.photoURL ? (
                                                <img src={user.photoURL} className="w-8 h-8 rounded-full bg-white/10" alt="" />
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-bold text-xs">
                                                    {(user.displayName?.[0] || user.email?.[0] || "?").toUpperCase()}
                                                </div>
                                            )}
                                            <span className="font-medium">{user.displayName || "Anonymous"}</span>
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                                        <td className="px-4 py-3">
                                            <span className={cn(
                                                "px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider",
                                                user.role === "admin" ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" : "bg-white/5 text-muted-foreground border border-white/10"
                                            )}>
                                                {user.role || "user"}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                                            {new Date(user.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => handleToggleRole(user)}
                                                className="text-muted-foreground hover:text-white transition-colors"
                                                title={user.role === "admin" ? "Demote to User" : "Promote to Admin"}
                                            >
                                                {user.role === "admin" ? <ShieldAlert className="w-4 h-4 text-red-500" /> : <Shield className="w-4 h-4" />}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AdminRoute>
    );
}

function StatsCard({ title, value, icon }: { title: string, value: string | number, icon: React.ReactNode }) {
    return (
        <div className="bg-[#0B0E11] border border-white/10 rounded-xl p-4 flex items-center justify-between">
            <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{title}</p>
                <p className="text-2xl font-bold font-mono">{value}</p>
            </div>
            <div className="p-3 bg-white/5 rounded-lg border border-white/5 decoration-slice">
                {icon}
            </div>
        </div>
    );
}
