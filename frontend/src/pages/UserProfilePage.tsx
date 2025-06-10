import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import MainLayout from '../sections/MainLayout';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import axiosAuth from '../axiosAuth';

function UserProfilePage() {
  const { username } = useParams<{ username: string }>();
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [userExists, setUserExists] = useState<boolean | null>(null); // null = unknown

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const res = await axiosAuth.get('/api/users/me');
          setCurrentUsername(res.data.username);
        } catch (err) {
          console.error('Failed to fetch current user info:', err);
          setCurrentUsername(null);
        }
      } else {
        setCurrentUsername(null);
      }

      // Check if profile user exists
      try {
        const res = await axiosAuth.get(`/api/users/exists/${username}`);
        setUserExists(res.data.exists); // Assume backend returns { exists: true/false }
      } catch (err) {
        console.error('Failed to check user existence:', err);
        setUserExists(false);
      }

      setCheckingAuth(false);
    });

    return () => unsubscribe();
  }, [username]);

  if (checkingAuth) {
    return (
      <div className="fixed inset-0 z-10 flex items-center justify-center bg-[rgba(0,0,0,0.32)] backdrop-blur-xs">
        <div className="bg-[var(--background)] px-8 py-6 rounded-lg shadow-md text-center large-shadow-darker border-2 border-[var(--thin-brighter)]">
          Loading profile...
        </div>
      </div>
    );
  }

  if (userExists === false) {
    return (
      <div className="fixed inset-0 z-10 flex flex-col items-center justify-center bg-[rgba(0,0,0,0.32)] backdrop-blur-xs px-4">
        <div className="bg-[var(--background)] p-6 rounded-lg text-center large-shadow-darker border-2 border-[var(--thin-brighter)] space-y-4">
          <p className="text-lg font-semibold text-red-500">
            User "{username}" not found.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-2">
            <a
              href="/"
              className="px-4 py-2 rounded bg-[var(--thin)] hover:bg-[var(--thin-brighter)]"
            >
              Go to homepage
            </a>
            {currentUsername && (
              <a
                href={`/${currentUsername}`}
                className="px-4 py-2 rounded bg-[var(--thin)] hover:bg-[var(--thin-brighter)]"
              >
                Go to my list
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  const isOwnProfile = currentUsername && username === currentUsername;

  return <MainLayout username={username} readOnly={!isOwnProfile} />;
}

export default UserProfilePage;
