import { useState, useEffect, useRef } from 'react';
import socketService from '../services/socket';
import '../styles/Leaderboard.css';

function Leaderboard() {
  const [teams, setTeams] = useState([]);
  const [connected, setConnected] = useState(false);
  const prevTeamsRef = useRef([]);

  // Function to fetch initial teams data
  const fetchTeams = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/teams`);
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
      prevTeamsRef.current = teams;
      setTeams(leaderboard);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('leaderboardUpdated', handleLeaderboardUpdate);

    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchTeams();
        setConnected(socketService.isConnected());
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup on unmount
    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('leaderboardUpdated', handleLeaderboardUpdate);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const getRowClass = (rank) => {
    if (rank === 1) return 'rank-1';
    if (rank === 2) return 'rank-2';
    if (rank === 3) return 'rank-3';
    return '';
  };

  const getMedalIcon = (rank) => {
    if (rank === 1) return '👑';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return '';
  };

  return (
    <div className="leaderboard-container">
      <div className="leaderboard-header">
        <div className="header-content">
          <h1 className="title">Pandora's Leaderboard</h1>
          {/* <div className="subtitle">Live Championship Leaderboard</div> */}
          <div className={`status-indicator ${connected ? 'connected' : 'disconnected'}`}>
            <span className="status-dot"></span>
            {connected ? 'LIVE' : 'CONNECTING...'}
          </div>
        </div>
      </div>

      <div className="leaderboard-content">
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th className="col-rank">RANK</th>
              <th className="col-team">TEAM</th>
              <th className="col-game">MAD LUDO</th>
              <th className="col-game">COSMIC JUMP</th>
              <th className="col-game">TREASURE HUNT</th>
              <th className="col-game">SPACE ROULETTE</th>
              <th className="col-game">SPACE COLOSSEUM</th>
              <th className="col-total">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {teams.length === 0 ? (
              <tr>
                <td colSpan="8" className="no-data">
                  Waiting for teams...
                </td>
              </tr>
            ) : (
              teams.map((team, index) => (
                <tr
                  key={team._id}
                  className={`team-row ${getRowClass(team.rank)}`}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <td className="col-rank">
                    <div className="rank-content">
                      <span className="medal">{getMedalIcon(team.rank)}</span>
                      <span className="rank-number">{team.rank}</span>
                    </div>
                  </td>
                  <td className="col-team">
                    <div className="team-name">{team.name}</div>
                  </td>
                  <td className="col-game">
                    <div className="score">{team.madLudo}</div>
                  </td>
                  <td className="col-game">
                    <div className="score">{team.cosmicJump}</div>
                  </td>
                  <td className="col-game">
                    <div className="score">{team.treasureHunt}</div>
                  </td>
                  <td className="col-game">
                    <div className="score">{team.spaceRoulette}</div>
                  </td>
                  <td className="col-game">
                    <div className="score">{team.spaceColosseum}</div>
                  </td>
                  <td className="col-total">
                    <div className="total-score">{team.total}</div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="leaderboard-footer">
        <div className="footer-text">
          Updated in real-time • {teams.length} teams competing
        </div>
      </div>
    </div>
  );
}

export default Leaderboard;
