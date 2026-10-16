import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Programs from './pages/Programs';
import ProgramDetails from './pages/ProgramDetails';
import MyApplications from './pages/MyApplications';
import Profile from './pages/Profile';
import Apply from './pages/Apply';
import ApplicationDetails from './pages/ApplicationDetails';
import DonorPortal from './pages/DonorPortal';
import './App.css';

function App() {
  return (
    <div className="app">
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/programs" element={<Programs />} />
          <Route path="/program/:programId" element={<ProgramDetails />} />
          <Route path="/apply/:programId" element={<Apply />} />
          <Route path="/my-applications" element={<MyApplications />} />
          <Route path="/application/:applicationId" element={<ApplicationDetails />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/donor" element={<DonorPortal />} />
          <Route path="/donor-portal" element={<DonorPortal />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
