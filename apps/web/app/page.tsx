import { Dashboard } from "@/components/Dashboard";

export default function Home() {
  return (
    <main>
      <div className="fixed inset-0 bg-[#0B0E11] -z-20" />
      {/* Ambient Gradients */}
      <div className="fixed top-0 left-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[128px] -z-10 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-secondary/20 rounded-full blur-[128px] -z-10 translate-x-1/2 translate-y-1/2 pointer-events-none" />

      <Dashboard />
    </main>
  );
}
