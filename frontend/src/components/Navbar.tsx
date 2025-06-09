import { useEffect, useState, useRef } from "react";
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
  const [usernameStatus, setUsernameStatus] = useState<
    "available" | "taken" | "checking" | null
  >(null);
  const debouncedUsername = useDebounce(username.trim(), 600);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const usernameInputRef = useRef<HTMLInputElement>(null);
  const [isEditingUsername, setIsEditingUsername] = useState(false);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  // Focus input & move cursor to end when prompt opens
  useEffect(() => {
    if (showUsernamePrompt && usernameInputRef.current) {
      const input = usernameInputRef.current;
      input.focus();
      const length = input.value.length;
      input.setSelectionRange(length, length);
    }
  }, [showUsernamePrompt]);

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
          `${API_BASE_URL}/api/users/check-username?username=${encodeURIComponent(
            debouncedUsername
          )}`,
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
      setShowDropdown(false);
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
      <nav className="container fixed top-4 w-[calc(100%-32px)] translate-x-[-50%] left-1/2 bg-[var(--thin)] rounded-lg h-18 flex justify-between py-5 px-10 z-9">
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
            <div
              className="relative cursor-pointer select-none translate-y-[-8px] translate-x-3"
              ref={dropdownRef}
              onClick={() => setShowDropdown((prev) => !prev)}
            >
              <div className="flex items-center gap-3 hover:bg-[var(--thin-brighter)] py-2 px-3 rounded-md">
                <img
                  src={user.photoURL || "/default-avatar.png"}
                  alt={user.displayName || "User"}
                  className="w-8 h-8 rounded-full"
                />
                <span>{backendUser?.username || user.displayName}</span>
              </div>

              {showDropdown && (
                <div className="absolute top-full right-0 mt-2 w-43 bg-[var(--thin)] border-2 border-[var(--thin-brighter)] rounded-md z-9 flex flex-col overflow-hidden">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setUsername(backendUser?.username || ""); // fill input with current username
                      setIsEditingUsername(true);               // <--- indicate it's edit mode
                      setShowUsernamePrompt(true);
                      setShowDropdown(false);
                    }}
                    className="px-3 py-2 hover:bg-[var(--thin-brighter)] text-left cursor-pointer"
                  >
                    Change username
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      signOutUser();
                    }}
                    className="px-3 py-2 hover:bg-[var(--thin-brighter)] text-left cursor-pointer text-red-600"
                  >
                    Sign out
                  </button>
                </div>
              )}
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
          <div className="bg-[var(--background)] p-6 rounded-md max-w-120 w-full border-2 border-[var(--thin-brighter)] large-shadow-darker">
            <h2 className="text-3xl font-semibold mb-6">
              {isEditingUsername ? "Edit username" : "Choose a username"}
            </h2>

            <p
              className={`mb-2 text-sm ${
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

            <input
              ref={usernameInputRef}
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              className="border-2 border-[var(--thin)] py-2 px-3 w-full rounded-md hover:border-[var(--thin-brighter)] focus:outline-none focus:border-[var(--thin-brighter)]"
              disabled={loading}
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  username.trim() &&
                  usernameStatus === "available"
                ) {
                  handleSaveUsername();
                }
              }}
            />

            <div className="flex justify-between mt-6">
              <button
                onClick={() => {
                  setShowUsernamePrompt(false);
                  setIsEditingUsername(false);
                }}
                disabled={loading}
                className="bg-[var(--thin)] text-white px-4 py-2 rounded-md hover:bg-[var(--thin-brighter)] cursor-pointer"
              >
                &larr; Go back
              </button>

              <button
                onClick={handleSaveUsername}
                disabled={
                  !username.trim() || loading || usernameStatus !== "available"
                }
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-md disabled:opacity-50 cursor-pointer disabled:cursor-default disabled:hover:bg-blue-600"
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
