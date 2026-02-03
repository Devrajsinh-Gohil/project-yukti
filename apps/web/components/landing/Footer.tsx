"use client";

import Link from "next/link";
import { Github, Twitter, Linkedin } from "lucide-react";

export function Footer() {
    return (
        <footer className="bg-zinc-950 border-t border-white/10 pt-16 pb-8">
            <div className="container mx-auto px-6 md:px-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
                    <div className="col-span-1 md:col-span-2">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                                Y
                            </div>
                            <span className="text-xl font-semibold text-white">Yukti</span>
                        </div>
                        <p className="text-gray-400 max-w-sm mb-6">
                            Empowering traders with AI-driven insights and professional-grade tools.
                            Trade smarter, faster, and with more confidence.
                        </p>
                        <div className="flex gap-4 text-gray-400">
                            <Link href="#" className="hover:text-white transition-colors"><Twitter className="w-5 h-5" /></Link>
                            <Link href="#" className="hover:text-white transition-colors"><Github className="w-5 h-5" /></Link>
                            <Link href="#" className="hover:text-white transition-colors"><Linkedin className="w-5 h-5" /></Link>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-white font-semibold mb-4">Platform</h4>
                        <ul className="space-y-2 text-gray-400">
                            <li><Link href="#features" className="hover:text-white transition-colors">Features</Link></li>
                            <li><Link href="#pricing" className="hover:text-white transition-colors">Pricing</Link></li>
                            <li><Link href="/dashboard" className="hover:text-white transition-colors">Live Demo</Link></li>
                            <li><Link href="#" className="hover:text-white transition-colors">Roadmap</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white font-semibold mb-4">Company</h4>
                        <ul className="space-y-2 text-gray-400">
                            <li><Link href="#" className="hover:text-white transition-colors">About Us</Link></li>
                            <li><Link href="#" className="hover:text-white transition-colors">Careers</Link></li>
                            <li><Link href="#" className="hover:text-white transition-colors">Blog</Link></li>
                            <li><Link href="#" className="hover:text-white transition-colors">Contact</Link></li>
                        </ul>
                    </div>
                </div>

                <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center bg-zinc-950/20">
                    <p className="text-gray-500 text-sm">© {new Date().getFullYear()} Yukti. All rights reserved.</p>
                    <div className="flex gap-6 text-sm text-gray-500 mt-4 md:mt-0">
                        <Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link>
                        <Link href="#" className="hover:text-white transition-colors">Terms of Service</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
