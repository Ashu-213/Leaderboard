import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Leaderboard from './pages/Leaderboard';
import Editor from './pages/Editor';
import './styles/mobile-enhancements.css';

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Navigate to="/leaderboard" replace />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/editor" element={<Editor />} />
      </Routes>
    </Router>
  );
}

export default App;
