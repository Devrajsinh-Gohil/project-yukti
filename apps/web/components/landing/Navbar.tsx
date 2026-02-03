"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils"; // Assuming utils exists, if not I'll just use clsx/tailwind-merge directly or verify path later
import { Button } from "@/components/ui/button"; // Assuming shadcn/ui exists or generic button, will verify. 
// If specific UI components don't exist, I'll build them inline for now or check. 
// Existing code used @/components/Dashboard so likely no strict "ui" folder structure yet?
// I will stick to standard HTML/Tailwind for safety unless I check.

export function Navbar() {
    return (
        <motion.nav
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 md:px-12 backdrop-blur-md bg-black/10 border-b border-white/5"
        >
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                    Y
                </div>
                <span className="text-xl font-semibold tracking-tight text-white">Yukti</span>
            </div>

            <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-300">
                <Link href="#features" className="hover:text-white transition-colors">Features</Link>
                <Link href="#pricing" className="hover:text-white transition-colors">Pricing</Link>
                <Link href="#about" className="hover:text-white transition-colors">About</Link>
            </div>

            <div className="flex items-center gap-4">
                <Link href="/login" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
                    Log in
                </Link>
                <Link href="/dashboard">
                    <button className="px-4 py-2 text-sm font-semibold text-black bg-white rounded-full hover:bg-gray-200 transition-colors">
                        Get Started
                    </button>
                </Link>
            </div>
        </motion.nav>
    );
}
