"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { ArrowRight, Loader2, PlayCircle } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
    const { signInWithGoogle } = useAuth();
    const [isLoading, setIsLoading] = useState(false);

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        await signInWithGoogle();
        setIsLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#0B0E11]">
            {/* Background Gradients */}
            <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-primary/20 blur-[150px] rounded-full mix-blend-screen opacity-30" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-secondary/20 blur-[150px] rounded-full mix-blend-screen opacity-30" />

            <div className="w-full max-w-md p-8 relative z-10">
                <div className="text-center mb-10 space-y-2">
                    <h1 className="text-4xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                        Project Yukti
                    </h1>
                    <p className="text-muted-foreground">Access your intelligent financial terminal</p>
                </div>

                <div className="glass-strong rounded-2xl p-8 border border-white/5 shadow-2xl">
                    <div className="space-y-6">
                        <div>
                            <label className="block text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-2">Email</label>
                            <input
                                type="email"
                                placeholder="trader@yukti.ai"
                                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-muted-foreground/50"
                                disabled
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-2">Password</label>
                            <input
                                type="password"
                                placeholder="••••••••"
                                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-muted-foreground/50"
                                disabled
                            />
                        </div>

                        <button className="w-full bg-primary/10 text-primary-foreground/50 font-medium py-3 rounded-lg text-sm border border-primary/20 cursor-not-allowed flex items-center justify-center gap-2" disabled>
                            Sign In (Email Disabled)
                        </button>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-white/10" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-[#0B0E11] px-2 text-muted-foreground">Or continue with</span>
                            </div>
                        </div>

                        <button
                            onClick={handleGoogleLogin}
                            disabled={isLoading}
                            className="w-full bg-white text-black font-semibold py-3 rounded-lg text-sm hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                                <svg className="w-4 h-4" viewBox="0 0 24 24">
                                    <path
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                        fill="#4285F4"
                                    />
                                    <path
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                        fill="#34A853"
                                    />
                                    <path
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                        fill="#FBBC05"
                                    />
                                    <path
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                        fill="#EA4335"
                                    />
                                </svg>
                            )}
                            Google
                        </button>
                    </div>

                    <div className="mt-6 text-center text-xs text-muted-foreground">
                        <p>Don't have an account? <Link href="/signup" className="text-primary hover:underline">Request Access</Link></p>
                    </div>
                </div>
            </div>
        </div>
    );
}
