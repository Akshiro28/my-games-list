import { useEffect, useState } from "react";
import { auth, provider } from "../firebase";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";

function Navbar() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Sign-in error:", error);
    }
  };

  const signOutUser = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Sign-out error:", error);
    }
  };

  return (
    <nav className="container fixed top-4 w-[calc(100%-32px)] translate-x-[-50%] left-1/2 bg-[var(--thin)] rounded-lg h-18 flex justify-between py-5 px-10">
      <a className="flex items-center" href="/">
        <img src="/logo/logo_AK.png" alt="Logo" className="h-full" />
        <p className="ms-4.5 text-xl">MyGamesList</p>
      </a>

      {/* Show template notice only when NOT signed in */}
      {!user && (
        <div className="flex items-center text-sm italic text-[var(--text-thin)]">
          Welcome! You're viewing Akshiro's list. Sign in to create your own!
        </div>
      )}

      <div>
        {user ? (
          <div className="flex items-center gap-4">
            <img
              src={user.photoURL || "/default-avatar.png"}
              alt={user.displayName || "User"}
              className="w-8 h-8 rounded-full"
            />
            <span>{user.displayName}</span>
            <button
              onClick={signOutUser}
              className="bg-red-600 px-3 py-1 rounded hover:bg-red-500 cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <button
            onClick={signInWithGoogle}
            className="bg-blue-600 px-3 py-1 rounded hover:bg-blue-500 cursor-pointer"
          >
            Sign in with Google
          </button>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
