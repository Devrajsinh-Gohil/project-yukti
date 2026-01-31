"use client";

import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function SignupPage() {
    const { signInWithGoogle } = useAuth();
    const [isLoading, setIsLoading] = useState(false);

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        await signInWithGoogle();
        setIsLoading(false);
    };
    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#0B0E11]">
            <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/20 blur-[150px] rounded-full mix-blend-screen opacity-30" />
            <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-secondary/20 blur-[150px] rounded-full mix-blend-screen opacity-30" />

            <div className="w-full max-w-md p-8 relative z-10">
                <div className="text-center mb-10 space-y-2">
                    <h1 className="text-4xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                        Request Access
                    </h1>
                    <p className="text-muted-foreground">Join the waitlist for Project Yukti</p>
                </div>

                <div className="glass-strong rounded-2xl p-8 border border-white/5 shadow-2xl">
                    <div className="space-y-6">
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
                            Sign up with Google
                        </button>
                        <p className="text-xs text-center text-muted-foreground/60">
                            By continuing, you agree to our Terms of Service and Privacy Policy.
                        </p>
                    </div>

                    <div className="mt-6 text-center text-xs text-muted-foreground">
                        <p>Already have an account? <Link href="/login" className="text-primary hover:underline">Sign in</Link></p>
                    </div>
                </div>
            </div>
        </div>
    );
}
