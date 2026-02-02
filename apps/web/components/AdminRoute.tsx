"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function AdminRoute({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [isAdmin, setIsAdmin] = useState(false);
    const [checkingRole, setCheckingRole] = useState(true);

    useEffect(() => {
        if (loading) return;

        if (!user) {
            router.push("/login");
            return;
        }

        const checkAdmin = async () => {
            try {
                const userRef = doc(db, "users", user.uid);
                const snap = await getDoc(userRef);
                if (snap.exists() && snap.data().role === "admin") {
                    setIsAdmin(true);
                } else {
                    router.push("/"); // Not authorized
                }
            } catch (error) {
                console.error("Admin check failed", error);
                router.push("/");
            } finally {
                setCheckingRole(false);
            }
        };

        checkAdmin();
    }, [user, loading, router]);

    if (loading || checkingRole) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-[#050505] text-white">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!isAdmin) return null;

    return <>{children}</>;
}
