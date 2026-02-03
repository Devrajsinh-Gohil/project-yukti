"use client";

import { motion } from "framer-motion";
import {
    LineChart,
    Cpu,
    ShieldCheck,
    Zap,
    Globe,
    Code
} from "lucide-react";

const features = [
    {
        icon: LineChart,
        title: "Advanced Charting",
        description: "Multi-layered technical analysis with over 100+ indicators and real-time visualization."
    },
    {
        icon: Cpu,
        title: "AI Insights",
        description: "Get market predictions and trend analysis powered by our proprietary deep learning models."
    },
    {
        icon: Code,
        title: "Custom Scripting",
        description: "Write and execute your own trading strategies using our powerful, Pine Script-inspired engine."
    },
    {
        icon: Zap,
        title: "Low Latency execution",
        description: "Experience lightning-fast data updates ensuring you never miss a market beat."
    },
    {
        icon: Globe,
        title: "Global Markets",
        description: "Access data from crypto exchanges and stock markets worldwide in a single dashboard."
    },
    {
        icon: ShieldCheck,
        title: "Enterprise Security",
        description: "Your data and strategies are protected with bank-grade encryption and security protocols."
    }
];

export function Features() {
    return (
        <section id="features" className="py-24 relative bg-black">
            {/* Background gradients */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-900/10 rounded-full blur-[128px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-900/10 rounded-full blur-[128px] pointer-events-none" />

            <div className="container mx-auto px-6 md:px-12 relative z-10">
                <div className="text-center max-w-2xl mx-auto mb-20">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="text-3xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60 mb-6"
                    >
                        Built for Serious Traders
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="text-gray-400 text-lg"
                    >
                        Capabilities that define the next generation of trading platforms.
                        Everything you need, nothing you don't.
                    </motion.p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {features.map((feature, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            whileHover={{ y: -5 }}
                            className="group p-8 rounded-2xl bg-white/5 border border-white/10 hover:border-indigo-500/30 hover:bg-white/10 transition-all duration-300"
                        >
                            <div className="w-12 h-12 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-6 group-hover:bg-indigo-500/20 group-hover:text-indigo-300 transition-colors">
                                <feature.icon className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                            <p className="text-gray-400 leading-relaxed">
                                {feature.description}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
