import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import MainLayout from '../sections/MainLayout';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import axiosAuth from '../axiosAuth';

function UserProfilePage() {
  const { username } = useParams<{ username: string }>();
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Ask the backend who this user is (based on their ID token)
          const res = await axiosAuth.get('/api/users/me');
          const actualUsername = res.data.username; // "Akshiro"
          setCurrentUsername(actualUsername);
        } catch (err) {
          console.error('Failed to fetch current user info:', err);
          setCurrentUsername(null);
        }
      } else {
        setCurrentUsername(null);
      }

      setCheckingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  if (checkingAuth) return <div>Loading profile...</div>;

  const isOwnProfile = currentUsername && username === currentUsername;

  return <MainLayout username={username} readOnly={!isOwnProfile} />;
}

export default UserProfilePage;
