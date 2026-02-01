"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { LogOut, User as UserIcon, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

export function UserMenu() {
    const { user, logout } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (!user) return null;

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 group focus:outline-none"
            >
                <div className="flex flex-col items-end hidden md:flex">
                    <span className="text-sm font-medium leading-none text-foreground/90 group-hover:text-foreground transition-colors">
                        {user.displayName || "Trader"}
                    </span>
                    <span className="text-[10px] text-muted-foreground w-full text-right">
                        Pro Plan
                    </span>
                </div>
                <div className="h-10 w-10 rounded-full bg-primary/10 border border-white/10 flex items-center justify-center overflow-hidden hover:border-primary/50 transition-colors">
                    {user.photoURL ? (
                        <img src={user.photoURL} alt="User" className="h-full w-full object-cover" />
                    ) : (
                        <UserIcon className="w-5 h-5 text-primary" />
                    )}
                </div>
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 rounded-xl glass border border-white/10 bg-[#0B0E11]/90 backdrop-blur-xl shadow-2xl py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-3 border-b border-white/5 md:hidden">
                        <p className="text-sm font-medium">{user.displayName || "User"}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>

                    <Link
                        href="/settings"
                        onClick={() => setIsOpen(false)}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                    >
                        <Settings className="w-4 h-4" />
                        Settings
                    </Link>

                    <div className="h-px bg-white/5 my-1" />

                    <button
                        onClick={() => logout()}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        Log Out
                    </button>
                </div>
            )}
        </div>
    );
}
