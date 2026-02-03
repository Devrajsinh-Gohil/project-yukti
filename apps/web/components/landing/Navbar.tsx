"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";

export function Navbar() {
    const [isOpen, setIsOpen] = useState(false);

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


            <div className="hidden md:flex items-center gap-4">
                <Link href="/login" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
                    Log in
                </Link>
                <Link
                    href="/dashboard"
                    className="px-4 py-2 text-sm font-semibold text-black bg-white rounded-full hover:bg-gray-200 transition-colors"
                >
                    Get Started
                </Link>
            </div>

            {/* Mobile Actions */}
            <div className="flex md:hidden items-center gap-4">
                <Link href="/login" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
                    Log in
                </Link>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="text-white p-1"
                    aria-label="Toggle menu"
                    aria-expanded={isOpen}
                    aria-controls="mobile-menu"
                >
                    {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
            </div>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        id="mobile-menu"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="md:hidden absolute top-full left-0 right-0 bg-black/95 border-b border-white/10 backdrop-blur-xl overflow-hidden"
                    >
                        <div className="flex flex-col items-center gap-6 py-8">
                            <Link href="#features" className="text-lg font-medium text-gray-300 hover:text-white" onClick={() => setIsOpen(false)}>Features</Link>
                            <Link href="#pricing" className="text-lg font-medium text-gray-300 hover:text-white" onClick={() => setIsOpen(false)}>Pricing</Link>
                            <Link href="#about" className="text-lg font-medium text-gray-300 hover:text-white" onClick={() => setIsOpen(false)}>About</Link>
                            <Link
                                href="/dashboard"
                                onClick={() => setIsOpen(false)}
                                className="px-6 py-2 text-base font-semibold text-black bg-white rounded-full hover:bg-gray-200 transition-colors"
                            >
                                Get Started
                            </Link>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.nav>
    );
}
