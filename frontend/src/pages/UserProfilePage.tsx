import { useParams } from 'react-router-dom';
import MainLayout from '../sections/MainLayout';

function UserProfilePage() {
  const { username } = useParams<{ username: string }>();
  return <MainLayout username={username} readOnly />;
}

export default UserProfilePage;
