import { useState, useEffect } from 'react';
import socketService from '../services/socket';
import ScoreRow from '../components/ScoreRow';
import '../styles/Editor.css';

const API_URL = import.meta.env.VITE_API_URL || '';

function Editor() {
  const [teams, setTeams] = useState([]);
  const [newTeamName, setNewTeamName] = useState('');
  const [connected, setConnected] = useState(false);
  const [activeEditors, setActiveEditors] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [serverStats, setServerStats] = useState({ connections: 0, updatesPerSecond: 0 });
  const [connectionQuality, setConnectionQuality] = useState('good');
  
  // Performance monitoring
  useEffect(() => {
    const pingInterval = setInterval(() => {
      if (socketService.isConnected()) {
        const startTime = Date.now();
        socketService.emit('ping');
        
        const handlePong = (data) => {
          const latency = Date.now() - startTime;
          setServerStats({
            connections: data.connections,
            updatesPerSecond: data.updatesPerSecond
          });
          
          // Determine connection quality based on latency and server load
          if (latency > 1000 || data.updatesPerSecond > 15) {
            setConnectionQuality('poor');
          } else if (latency > 500 || data.updatesPerSecond > 8) {
            setConnectionQuality('moderate');
          } else {
            setConnectionQuality('good');
          }
          
          socketService.off('pong', handlePong);
        };
        
        socketService.on('pong', handlePong);
      }
    }, 5000); // Ping every 5 seconds
    
    return () => clearInterval(pingInterval);
  }, []);

  // Function to fetch initial teams data
  const fetchTeams = async () => {
    try {
      const response = await fetch(`${API_URL}/api/teams`);
      if (response.ok) {
        const teamsData = await response.json();
        setTeams(teamsData);
      }
    } catch (error) {
      console.error('Failed to fetch teams:', error);
    }
  };

  useEffect(() => {
    // Fetch initial data
    fetchTeams();
    
    // Connect to Socket.io server
    const socket = socketService.connect();
    
    // Set initial connection status
    setConnected(socketService.isConnected());

    const handleConnect = () => {
      setConnected(true);
    };

    const handleDisconnect = () => {
      setConnected(false);
    };

    const handleLeaderboardUpdate = (leaderboard) => {
      setTeams(leaderboard);
    };

    const handleError = (errorData) => {
      setError(errorData.message);
      setTimeout(() => setError(''), 3000);
    };

    const handleUpdateError = (errorData) => {
      // Enhanced error handling for high-concurrency scenarios
      if (errorData.message.includes('CONFLICT')) {
        if (errorData.retryCount >= 5) {
          setError('⚡ High traffic detected! Some updates may take longer...');
        } else {
          setError('⚡ Multiple editors active! Changes syncing...');
        }
      } else if (errorData.serverLoad?.updatesPerSecond > 10) {
        setError('🔥 Server busy! Please wait a moment...');
      } else {
        setError(`Update failed: ${errorData.message}`);
      }
      setTimeout(() => setError(''), 5000); // Longer timeout for high-load messages
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('leaderboardUpdated', handleLeaderboardUpdate);
    socket.on('error', handleError);
    socket.on('updateError', handleUpdateError);

    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchTeams();
        setConnected(socketService.isConnected());
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Track connected clients with enhanced monitoring
    setActiveEditors(serverStats.connections || 1);

    // Cleanup
    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('leaderboardUpdated', handleLeaderboardUpdate);
      socket.off('error', handleError);
      socket.off('updateError', handleUpdateError);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const handleAddTeam = async (e) => {
    e.preventDefault();
    
    if (!newTeamName.trim()) {
      setError('Team name cannot be empty');
      setTimeout(() => setError(''), 3000);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/teams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newTeamName.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add team');
      }

      setNewTeamName('');
      setError('');
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Delete functionality removed for security
  // Teams cannot be deleted to prevent accidental data loss during competitions
  
  /*
  const handleDeleteTeam = async (teamId) => {
    if (!confirm('Are you sure you want to delete this team?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/teams/${teamId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete team');
      }
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(''), 3000);
    }
  };
  */

  return (
    <div className="editor-container">
      <div className="editor-header">
        <div className="header-left">
          <h1 className="editor-title">Score Editor</h1>
          <div className="header-stats">
            <div className={`connection-status ${connected ? 'connected' : 'disconnected'}`}>
              <span className="status-dot"></span>
              {connected ? 'Connected' : 'Disconnected'}
            </div>
            <div className="active-users">
              <span className="user-icon">👥</span>
              {serverStats.connections || activeEditors} editor{activeEditors !== 1 ? 's' : ''} online
            </div>
            {serverStats.updatesPerSecond > 0 && (
              <div className={`server-load ${connectionQuality}`}>
                <span className="load-icon">⚡</span>
                {serverStats.updatesPerSecond} ups
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      <div className="add-team-section">
        <form onSubmit={handleAddTeam} className="add-team-form">
          <input
            type="text"
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            placeholder="Enter team name..."
            className="team-name-input"
            maxLength={50}
            disabled={loading}
          />
          <button type="submit" className="add-team-btn" disabled={loading}>
            {loading ? '...' : '+ Add Team'}
          </button>
        </form>
      </div>

      <div className="editor-content">
        <div className="teams-table-container">
          <table className="teams-table">
            <thead>
              <tr>
                <th className="col-rank">Rank</th>
                <th className="col-team">Team Name</th>
                <th className="col-score">Mad Ludo</th>
                <th className="col-score">Cosmic Jump</th>
                <th className="col-score">Treasure Hunt</th>
                <th className="col-score">Space Roulette</th>
                <th className="col-score">Space Colosseum</th>
                <th className="col-total">Total</th>
                {/* Actions column removed - no delete functionality */}
              </tr>
            </thead>
            <tbody>
              {teams.length === 0 ? (
                <tr>
                  <td colSpan="8" className="no-teams">
                    No teams yet. Add your first team above!
                  </td>
                </tr>
              ) : (
                teams.map((team) => (
                  <ScoreRow
                    key={team._id}
                    team={team}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="editor-footer">
        <div className="footer-info">
          💡 Changes are saved automatically and broadcast to all connected displays
          {serverStats.connections > 10 && (
            <span className="high-load-notice"> • High traffic mode: Updates may take a few seconds</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default Editor;
