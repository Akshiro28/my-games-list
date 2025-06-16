import { useEffect, useState, useRef } from "react";
import { auth, provider } from "../firebase";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";
import { useDebounce } from "../hooks/useDebounce";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface NavbarProps {
  viewedUsername?: string | null;
  onToggleSidebar?: () => void;
}

interface BackendUser {
  uid: string;
  email: string;
  name?: string;
  picture?: string;
  username?: string;
}

function Navbar({ viewedUsername, onToggleSidebar }: NavbarProps) {
  const usernameFromUrl: string | undefined = window.location.pathname.split("/")[1];
  const [user, setUser] = useState<User | null>(null);
  const [backendUser, setBackendUser] = useState<BackendUser | null>(null);
  const [username, setUsername] = useState("");
  const [showUsernamePrompt, setShowUsernamePrompt] = useState(false);
  const [loading, setLoading] = useState(false);
  const debouncedUsername = useDebounce(username.trim(), 600);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const usernameInputRef = useRef<HTMLInputElement>(null);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  type UsernameStatus = "available" | "taken" | "checking" | "current" | "empty" | "tooShort" | null;
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>(null);
  const rawDisplayUsername = viewedUsername ?? usernameFromUrl ?? "";
  const displayUsername = rawDisplayUsername.trim() !== "" ? rawDisplayUsername : "Akshiro";
  const [backendUserLoading, setBackendUserLoading] = useState(true);
  const isUserFullyLoaded = !backendUserLoading;

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch auth state and backend user info
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setBackendUserLoading(true);
        (async () => {
          try {
            const idToken = await firebaseUser.getIdToken();
            const res = await fetch(`${API_BASE_URL}/api/users/get-by-uid?uid=${firebaseUser.uid}`, {
              headers: { Authorization: `Bearer ${idToken}` },
            });
            if (res.ok) {
              const data = await res.json();
              setBackendUser(data);
              setShowUsernamePrompt(!data.username);
            } else {
              setBackendUser(null);
              setShowUsernamePrompt(true);
            }
          } catch (err) {
            console.error("Error fetching user:", err);
            setBackendUser(null);
            setShowUsernamePrompt(true);
          } finally {
            setBackendUserLoading(false);
          }
        })();
      } else {
        setUser(null);
        setBackendUser(null);
        setShowUsernamePrompt(false);
        setBackendUserLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Auto-focus input & place cursor at end
  useEffect(() => {
    if (showUsernamePrompt && usernameInputRef.current) {
      const input = usernameInputRef.current;
      input.focus();
      const len = input.value.length;
      input.setSelectionRange(len, len);
    }
  }, [showUsernamePrompt]);

  // Prevent flicker: immediately clear or set "checking" on typing
  useEffect(() => {
    if (!showUsernamePrompt) return;
    if (!username.trim()) {
      setUsernameStatus(null);
    } else {
      setUsernameStatus("checking");
    }
  }, [username, showUsernamePrompt]);

  // Debounced availability check
  useEffect(() => {
    if (!showUsernamePrompt) return;

    let isCancelled = false;

    if (!debouncedUsername) {
      if (isEditingUsername) {
        setUsernameStatus(null); // Stay quiet during editing
      } else {
        setUsernameStatus("empty");
      }
      return;
    }

    if (debouncedUsername.length < 3) {
      setUsernameStatus("tooShort");
      return;
    }

    if (debouncedUsername === backendUser?.username) {
      setUsernameStatus("current");
      return;
    }

    setUsernameStatus("checking");

    const checkAvailability = async () => {
      try {
        if (!user) {
          if (!isCancelled) setUsernameStatus(null);
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

        if (!isCancelled && res.ok) {
          const data = await res.json();
          setUsernameStatus(data.exists ? "taken" : "available");
        }
      } catch (error) {
        console.error("Username check failed:", error);
        if (!isCancelled) setUsernameStatus(null);
      }
    };

    checkAvailability();

    return () => {
      isCancelled = true;
    };
  }, [debouncedUsername, showUsernamePrompt, user, backendUser]);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Sign-in error:", err);
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
    } catch (err) {
      console.error("Sign-out error:", err);
    }
  };

  const navigate = useNavigate(); // inside your component

  const handleSaveUsername = async () => {
    if (!user) return;
    const trimmed = username.trim();
    if (!trimmed) {
      alert("Please enter a valid username");
      return;
    }
    if (usernameStatus !== "available") {
      alert("Username not available");
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
          username: trimmed,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setBackendUser(data);
        setShowUsernamePrompt(false);
        setUsername("");
        setUsernameStatus(null);
        setIsEditingUsername(false);

        toast.success("Username successfully changed!");

        setTimeout(() => {
          navigate(`/${trimmed}`);
        }, 1200); // wait ~1.2s before redirect
      } else {
        const errData = await res.json().catch(() => null);
        alert(errData?.message ?? "Error saving username");
      }
    } catch (err) {
      console.error("Save username error:", err);
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <nav className="container fixed top-4 w-[calc(100%-32px)] translate-x-[-50%] left-1/2 bg-[var(--thin)] rounded-lg h-14 md:h-18 flex justify-between py-4.5 md:py-5 px-5 md:px-10 z-10">
        <a className="flex items-center" href="/">
          <img src="/logo/logo_AK.png" alt="Logo" className="h-full" />
          <p className="ms-3 md:ms-4.5 text-sm md:text-xl">MyGamesList</p>
        </a>

        {!user && isUserFullyLoaded && (
          <div className="flex items-center text-sm italic text-[var(--text-thin)] hidden lg:block my-auto">
            Welcome! You're viewing <span className="font-bold">&nbsp;{displayUsername}</span>'s game list. Sign in to create your own!
          </div>
        )}

        {user && isUserFullyLoaded && backendUser?.username !== displayUsername && (
          <div className="flex items-center text-sm italic text-[var(--text-thin)]">
            You're viewing <span className="font-bold">&nbsp;{displayUsername}</span>'s game list.&nbsp;
            <a
              href={`/${backendUser?.username}`}
              className="text-blue-600 underline hover:text-blue-600 cursor-pointer"
            >
              Go to my list &rarr;
            </a>
          </div>
        )}

        <div>
          {user ? (
            <div
              ref={dropdownRef}
              className="relative cursor-pointer select-none translate-y-[-8px] md:translate-x-3"
              onClick={() => setShowDropdown((v) => !v)}
            >
              <div className="flex items-center gap-3 hover:bg-[var(--thin-brighter)] py-2 px-3 rounded-md text-sm md:text-xl">
                <img src={user.photoURL || "/default-avatar.png"} className="w-5 md:w-8 h-5 md:h-8 rounded-full" alt="avatar" />
                <span>{backendUser === null ? "Loading..." : backendUser?.username || "Anonymous"}</span>
              </div>
              {showDropdown && (
                <div className="absolute top-full right-0 mt-2 w-43 bg-[var(--thin)] border-2 border-[var(--thin-brighter)] rounded-md z-10 flex flex-col overflow-hidden">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDropdown(false);
                      // Redirect to user's list page
                      window.location.href = `/${backendUser?.username}`;
                    }}
                    className="px-3 py-2 hover:bg-[var(--thin-brighter)] text-left cursor-pointer"
                  >
                    My Games List
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setUsername(backendUser?.username || "");
                      setIsEditingUsername(true);
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
                    className="px-3 py-2 hover:bg-[var(--thin-brighter)] text-left text-red-600 cursor-pointer"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            !loading && (
              <button onClick={signInWithGoogle} className="bg-blue-600 px-3 py-1 rounded hover:bg-blue-500 cursor-pointer text-[10px] md:text-[16px] translate-y-[-4px]">
                Sign in with Google
              </button>
            )
          )}
        </div>

        {onToggleSidebar && (
          <button
            className="md:hidden hover:bg-[var(--thin-brighter)] rounded-md cursor-pointer px-1 translate-x-1 md:translate-x-0"
            onClick={onToggleSidebar}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
      </nav>

      {showUsernamePrompt && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-[rgba(0,0,0,0.32)] backdrop-blur-xs">
          <div className="bg-[var(--background)] p-6 rounded-md max-w-120 w-full border-2 border-[var(--thin-brighter)] large-shadow-darker">
            <h2 className="text-3xl font-semibold mb-6">
              {isEditingUsername ? "Edit username" : "Choose a username"}
            </h2>
            <p
              className={`mb-2 text-sm font-semibold ${
                usernameStatus === "taken"
                  ? "text-red-600"
                  : usernameStatus === "available"
                  ? "text-green-600"
                  : usernameStatus === "current"
                  ? "text-blue-600"
                  : usernameStatus === "empty" || usernameStatus === "tooShort"
                  ? "text-red-600"
                  : "text-gray-500"
              }`}
            >
              {usernameStatus === "checking"
                ? "Checking username availability..."
                : usernameStatus === "taken"
                ? "Username already taken"
                : usernameStatus === "available"
                ? "Username is available!"
                : usernameStatus === "current"
                ? "This is your current username."
                : usernameStatus === "empty"
                ? "Username cannot be empty."
                : usernameStatus === "tooShort"
                ? "Username must be at least 3 characters long."
                : "\u00A0"}
            </p>
            <input
              ref={usernameInputRef}
              type="text"
              value={username}
              onChange={(e) => {
                const value = e.target.value;
                if (value.length > 25) {
                  toast.error("Username cannot be more than 25 characters.");
                  return;
                }
                setUsername(value);
              }}
              placeholder="Enter your username"
              className="border-2 border-[var(--thin)] focus:border-[var(--thin-brighter)] hover:border-[var(--thin-brighter)] px-3 py-2 w-full rounded-md focus:outline-none placeholder-[var(--thin-brighter)] hover:placeholder-[var(--text-thin)] focus:placeholder-[var(--text-thin)]"
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
                className="bg-[var(--thin)] px-4 py-2 rounded-md hover:bg-[var(--thin-brighter)] cursor-pointer"
              >
                &larr; Go back
              </button>
              <button
                onClick={handleSaveUsername}
                disabled={!username.trim() || loading || usernameStatus !== "available"}
                className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-md disabled:opacity-50 disabled:hover:bg-blue-600 cursor-pointer"
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
