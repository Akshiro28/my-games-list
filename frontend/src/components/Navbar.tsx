import { useEffect, useState } from "react";
import { auth, provider } from "../firebase";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";

function Navbar() {
  // State to hold current user info
  const [user, setUser] = useState<User | null>(null);

  // Listen to auth state changes and update user state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, []);

  // Sign in with Google popup
  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, provider);
      // user state updates automatically via onAuthStateChanged listener
    } catch (error) {
      console.error("Sign-in error:", error);
    }
  };

  // Sign out function
  const signOutUser = async () => {
    try {
      await signOut(auth);
      // user state updates automatically via onAuthStateChanged listener
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
