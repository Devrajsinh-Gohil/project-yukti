"use client";

import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { Pricing } from "@/components/landing/Pricing";
import { About } from "@/components/landing/About";
import { Footer } from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-black text-white selection:bg-indigo-500/30 selection:text-indigo-200">
      <Navbar />
      <Hero />
      <Features />
      <Pricing />
      <About />
      <Footer />
    </main>
  );
}
