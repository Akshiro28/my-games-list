import { useEffect, useState } from "react";
import { auth, provider } from "../firebase";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";
import { useDebounce } from "../hooks/useDebounce"; // Adjust path if needed

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [backendUser, setBackendUser] = useState<any>(null);
  const [username, setUsername] = useState("");
  const [showUsernamePrompt, setShowUsernamePrompt] = useState(false);
  const [loading, setLoading] = useState(false);

  // For username availability check:
  const [usernameStatus, setUsernameStatus] = useState<"available" | "taken" | "checking" | null>(null);
  const debouncedUsername = useDebounce(username.trim(), 600);

  // Auth state handling + fetch backend user info
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        (async () => {
          setUser(currentUser);
          setLoading(true);
          try {
            const idToken = await currentUser.getIdToken();
            const res = await fetch(
              `${API_BASE_URL}/api/users/get-by-uid?uid=${currentUser.uid}`,
              {
                headers: {
                  Authorization: `Bearer ${idToken}`,
                },
              }
            );

            if (res.ok) {
              try {
                const data = await res.json();
                setBackendUser(data);
                setShowUsernamePrompt(!data.username);
              } catch {
                setBackendUser(null);
                setShowUsernamePrompt(true);
              }
            } else {
              setBackendUser(null);
              setShowUsernamePrompt(true);
            }
          } catch (error) {
            console.error("Failed to check user:", error);
            setBackendUser(null);
            setShowUsernamePrompt(true);
          } finally {
            setLoading(false);
          }
        })();
      } else {
        setUser(null);
        setBackendUser(null);
        setShowUsernamePrompt(false);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Check username availability when debouncedUsername changes
  useEffect(() => {
    if (!showUsernamePrompt) return;
    if (!debouncedUsername) {
      setUsernameStatus(null);
      return;
    }

    const checkAvailability = async () => {
      setUsernameStatus("checking");
      try {
        if (!user) {
          setUsernameStatus(null);
          return;
        }

        const idToken = await user.getIdToken();

        const res = await fetch(
          `${API_BASE_URL}/api/users/check-username?username=${encodeURIComponent(debouncedUsername)}`,
          {
            headers: {
              Authorization: `Bearer ${idToken}`,
            },
          }
        );

        if (res.ok) {
          const data = await res.json();
          setUsernameStatus(data.exists ? "taken" : "available");
        } else {
          setUsernameStatus(null);
        }
      } catch (error) {
        console.error("Username check failed:", error);
        setUsernameStatus(null);
      }
    };

    checkAvailability();
  }, [debouncedUsername, showUsernamePrompt, user]);

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
      setShowUsernamePrompt(false);
      setUsername("");
      setBackendUser(null);
      setUsernameStatus(null);
    } catch (error) {
      console.error("Sign-out error:", error);
    }
  };

  const handleSaveUsername = async () => {
    if (!user) return;

    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      alert("Please enter a valid username");
      return;
    }

    if (usernameStatus !== "available") {
      alert("Username is not available. Please choose another.");
      return;
    }

    setLoading(true);
    try {
      const idToken = await user.getIdToken();

      const res = await fetch(`${API_BASE_URL}/api/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          uid: user.uid,
          email: user.email,
          name: user.displayName,
          picture: user.photoURL,
          username: trimmedUsername,
        }),
      });

      if (res.ok) {
        const updatedUser = await res.json();
        setBackendUser(updatedUser); // update with new username
        setShowUsernamePrompt(false);
        setUsername("");
        setUsernameStatus(null);
      } else {
        let errorMessage = "Failed to save username";
        try {
          const errorData = await res.json();
          if (errorData.message) errorMessage = errorData.message;
        } catch {
          // Ignore JSON parse error
        }
        alert(`Error: ${errorMessage}`);
      }
    } catch (error) {
      console.error("Save username error:", error);
      alert("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <nav className="container fixed top-4 w-[calc(100%-32px)] translate-x-[-50%] left-1/2 bg-[var(--thin)] rounded-lg h-18 flex justify-between py-5 px-10">
        <a className="flex items-center" href="/">
          <img src="/logo/logo_AK.png" alt="Logo" className="h-full" />
          <p className="ms-4.5 text-xl">MyGamesList</p>
        </a>

        {!user && !loading && (
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
              <span>{backendUser?.username || user.displayName}</span>
              <button
                onClick={signOutUser}
                className="bg-red-600 px-3 py-1 rounded hover:bg-red-500 cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          ) : (
            !loading && (
              <button
                onClick={signInWithGoogle}
                className="bg-blue-600 px-3 py-1 rounded hover:bg-blue-500 cursor-pointer"
              >
                Sign in with Google
              </button>
            )
          )}
        </div>
      </nav>

      {showUsernamePrompt && (
        <div className="fixed inset-0 flex items-center justify-center bg-[rgba(0,0,0,0.32)] backdrop-blur-xs z-9">
          <div className="bg-[var(--background)] p-6 rounded max-w-sm w-full">
            <h2 className="text-lg font-semibold mb-4">Choose a username</h2>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              className="border p-2 w-full rounded"
              disabled={loading}
              onKeyDown={(e) => {
                if (e.key === "Enter" && username.trim() && usernameStatus === "available") {
                  handleSaveUsername();
                }
              }}
            />

            {/* Username status message */}
            <p
              className={`mt-2 text-sm ${
                usernameStatus === "taken"
                  ? "text-red-600"
                  : usernameStatus === "available"
                  ? "text-green-600"
                  : "text-gray-500"
              }`}
            >
              {usernameStatus === "checking"
                ? "Checking username availability..."
                : usernameStatus === "taken"
                ? "Username already taken"
                : usernameStatus === "available"
                ? "Username is available!"
                : ""}
            </p>

            <div className="flex justify-between mt-4">
              <button
                onClick={signOutUser}
                disabled={loading}
                className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
              >
                Cancel
              </button>

              <button
                onClick={handleSaveUsername}
                disabled={
                  !username.trim() ||
                  loading ||
                  usernameStatus !== "available"
                }
                className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
              >
                {loading ? "Saving..." : "Save Username"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Navbar;
