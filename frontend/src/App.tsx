// src/App.tsx

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from "./sections/MainLayout";
import Footer from "./components/Footer";
import UserProfilePage from "./pages/UserProfilePage";
import './App.css';
import './index.css';
import './firebase';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout forceTemplateMode={true} />} />
        <Route path="/:username" element={<UserProfilePage />} />
      </Routes>
      <Footer />
    </BrowserRouter>
  );
}

export default App;
