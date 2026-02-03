"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const tiers = [
    {
        name: "Basic",
        price: "$0",
        description: "Essential tools for casual traders.",
        features: [
            "Real-time market data (15m delay)",
            "Basic charting tools",
            "5 Custom scripts",
            "Community support",
        ],
        highlighted: false,
    },
    {
        name: "Pro",
        price: "$49",
        period: "/month",
        description: "Advanced insights for serious traders.",
        features: [
            "Real-time data (No delay)",
            "Unlimited custom scripts",
            "AI-powered signals",
            "Deep learning trend analysis",
            "Priority support",
        ],
        highlighted: true,
    },
    {
        name: "Enterprise",
        price: "Custom",
        description: "Tailored solutions for institutions.",
        features: [
            "Direct market access (DMA)",
            "Dedicated infrastructure",
            "Custom model training",
            "API access",
            "24/7 Dedicated account manager",
        ],
        highlighted: false,
    },
];

export function Pricing() {
    return (
        <section id="pricing" className="py-24 relative bg-black overflow-hidden">
            {/* Background Gradients */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-indigo-900/20 rounded-full blur-[128px] pointer-events-none -z-10" />

            <div className="container mx-auto px-6 md:px-12 relative z-10">
                <div className="text-center max-w-2xl mx-auto mb-16">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="text-3xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60 mb-6"
                    >
                        Simple, Transparent Pricing
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="text-gray-400 text-lg"
                    >
                        Choose the plan that fits your trading style. No hidden fees.
                    </motion.p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    {tiers.map((tier, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            whileHover={{ y: -5 }}
                            className={cn(
                                "relative p-8 rounded-2xl border transition-all duration-300 flex flex-col",
                                tier.highlighted
                                    ? "bg-white/10 border-indigo-500/50 shadow-2xl shadow-indigo-500/10"
                                    : "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10"
                            )}
                        >
                            {tier.highlighted && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-indigo-500 text-white text-xs font-bold rounded-full shadow-lg">
                                    MOST POPULAR
                                </div>
                            )}

                            <div className="mb-8">
                                <h3 className="text-xl font-semibold text-white mb-2">{tier.name}</h3>
                                <div className="flex items-baseline gap-1 mb-2">
                                    <span className="text-4xl font-bold text-white">{tier.price}</span>
                                    {tier.period && <span className="text-gray-400 text-sm">{tier.period}</span>}
                                </div>
                                <p className="text-gray-400 text-sm">{tier.description}</p>
                            </div>

                            <ul className="space-y-4 mb-8 flex-1">
                                {tier.features.map((feature, i) => (
                                    <li key={i} className="flex items-start gap-3 text-sm text-gray-300">
                                        <Check className={cn("w-5 h-5 shrink-0", tier.highlighted ? "text-indigo-400" : "text-gray-500")} />
                                        {feature}
                                    </li>
                                ))}
                            </ul>

                            <button
                                className={cn(
                                    "w-full py-3 rounded-lg font-semibold transition-colors",
                                    tier.highlighted
                                        ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/25"
                                        : "bg-white/10 hover:bg-white/20 text-white border border-white/5"
                                )}
                            >
                                {index === 2 ? "Contact Sales" : "Get Started"}
                            </button>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
