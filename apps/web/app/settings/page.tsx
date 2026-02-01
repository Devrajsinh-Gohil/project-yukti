"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { ArrowLeft, Mail, User, Shield, Calendar } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
    const { user } = useAuth();
    const router = useRouter();

    if (!user) return null;

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-[#050505] text-foreground p-6 md:p-10">
                <div className="max-w-2xl mx-auto space-y-8">
                    {/* Header */}
                    <header className="flex items-center gap-4">
                        <button
                            onClick={() => router.back()}
                            className="p-2 hover:bg-white/5 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <h1 className="text-2xl font-bold tracking-tight">Account Settings</h1>
                    </header>

                    {/* Profile Card */}
                    <div className="glass rounded-xl p-8 border border-white/5 space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="h-20 w-20 rounded-full bg-primary/10 border border-white/10 flex items-center justify-center overflow-hidden">
                                {user.photoURL ? (
                                    <img src={user.photoURL} alt="User" className="h-full w-full object-cover" />
                                ) : (
                                    <User className="w-8 h-8 text-primary" />
                                )}
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold">{user.displayName || "Trader"}</h2>
                                <span className="text-sm text-muted-foreground bg-primary/10 text-primary px-2 py-0.5 rounded-full inline-block mt-1">
                                    Pro Plan
                                </span>
                            </div>
                        </div>

                        <div className="grid gap-4 mt-6">
                            <div className="space-y-1">
                                <label className="text-xs uppercase text-muted-foreground font-semibold flex items-center gap-2">
                                    <Mail className="w-3 h-3" /> Email Address
                                </label>
                                <div className="p-3 bg-black/40 rounded-lg border border-white/10 text-sm font-mono">
                                    {user.email}
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs uppercase text-muted-foreground font-semibold flex items-center gap-2">
                                    <Shield className="w-3 h-3" /> Account ID
                                </label>
                                <div className="p-3 bg-black/40 rounded-lg border border-white/10 text-sm font-mono text-muted-foreground">
                                    {user.uid}
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs uppercase text-muted-foreground font-semibold flex items-center gap-2">
                                    <Calendar className="w-3 h-3" /> Member Since
                                </label>
                                <div className="p-3 bg-black/40 rounded-lg border border-white/10 text-sm">
                                    {user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : "Unknown"}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Preferences Placeholder */}
                    <div className="glass rounded-xl p-8 border border-white/5 opacity-50 relative overflow-hidden">
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10 backdrop-blur-sm">
                            <span className="text-muted-foreground text-sm font-medium border border-white/10 px-3 py-1 rounded-full bg-black/50">
                                Global Settings Coming Soon
                            </span>
                        </div>
                        <h3 className="text-lg font-semibold mb-4">App Preferences</h3>
                        <div className="space-y-4 filter blur-sm">
                            <div className="flex items-center justify-between p-3 rounded-lg bg-black/20">
                                <span>Dark Mode</span>
                                <div className="w-10 h-5 bg-primary rounded-full relative"><div className="w-3 h-3 bg-white rounded-full absolute right-1 top-1" /></div>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg bg-black/20">
                                <span>Notifications</span>
                                <div className="w-10 h-5 bg-primary rounded-full relative"><div className="w-3 h-3 bg-white rounded-full absolute right-1 top-1" /></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}
