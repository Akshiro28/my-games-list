import Navbar from "./components/Navbar";
import MainLayout from "./sections/MainLayout";
import Footer from "./components/Footer";
import './App.css';
import './index.css';
import './firebase';

function App() {
  return (
    <>
      <Navbar />
      <MainLayout />
      <Footer />
    </>
  );
}

export default App;
