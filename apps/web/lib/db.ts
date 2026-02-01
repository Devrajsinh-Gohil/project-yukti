import { db } from "./firebase";
import { doc, setDoc, getDoc, updateDoc, arrayUnion, arrayRemove, collection, addDoc, getDocs, query } from "firebase/firestore";
import { User } from "firebase/auth";

export interface UserProfile {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    createdAt: string;
}

export interface Watchlist {
    id: string;
    name: string;
    tickers: string[];
}

/**
 * Creates or updates a user profile in Firestore
 */
export async function syncUserProfile(user: User) {
    if (!user) return;
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
        const profile: UserProfile = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            createdAt: new Date().toISOString()
        };
        await setDoc(userRef, profile);
        // Create a default watchlist
        await createWatchlist(user.uid, "Favorites");
    }
}

/**
 * Creates a new watchlist for a user
 */
export async function createWatchlist(userId: string, name: string) {
    const listRef = collection(doc(db, "users", userId), "watchlists");
    await addDoc(listRef, {
        name,
        tickers: [],
        createdAt: new Date().toISOString()
    });
}

/**
 * Fetches all watchlists for a user
 */
export async function getUserWatchlists(userId: string): Promise<Watchlist[]> {
    const listRef = collection(doc(db, "users", userId), "watchlists");
    const q = query(listRef);
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as Watchlist));
}

/**
 * Adds a ticker to a specific watchlist
 */
export async function addToWatchlist(userId: string, listId: string, ticker: string) {
    const listRef = doc(db, "users", userId, "watchlists", listId);
    await updateDoc(listRef, {
        tickers: arrayUnion(ticker)
    });
}

/**
 * Removes a ticker from a specific watchlist
 */
export async function removeFromWatchlist(userId: string, listId: string, ticker: string) {
    const listRef = doc(db, "users", userId, "watchlists", listId);
    await updateDoc(listRef, {
        tickers: arrayRemove(ticker)
    });
}

/**
 * Updates the user's recently viewed history
 * Moves the ticker to the end (most recent) if it already exists.
 */
export async function updateHistory(userId: string, ticker: string) {
    const userRef = doc(db, "users", userId);

    // Remove if exists (to re-add at the end)
    await updateDoc(userRef, {
        history: arrayRemove(ticker)
    });

    // Add to end
    await updateDoc(userRef, {
        history: arrayUnion(ticker)
    });
}
