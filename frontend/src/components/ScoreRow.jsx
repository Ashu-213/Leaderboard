import { useState, useEffect, useRef } from 'react';
import socketService from '../services/socket';

function ScoreRow({ team }) {
  const [scores, setScores] = useState({
    madLudo: team.madLudo,
    cosmicJump: team.cosmicJump,
    treasureHunt: team.treasureHunt,
    spaceRoulette: team.spaceRoulette,
    spaceColosseum: team.spaceColosseum,
  });
  
  const [editingField, setEditingField] = useState(null);
  const [updateStatus, setUpdateStatus] = useState({});
  const inputRefs = useRef({});
  const updateTimeouts = useRef({});

  // Update local state when team prop changes
  useEffect(() => {
    setScores({
      madLudo: team.madLudo,
      cosmicJump: team.cosmicJump,
      treasureHunt: team.treasureHunt,
      spaceRoulette: team.spaceRoulette,
      spaceColosseum: team.spaceColosseum,
    });
    
    // Clear any pending status for this team
    setUpdateStatus({});
  }, [team]);

  // Socket event listeners for update feedback
  useEffect(() => {
    const handleUpdateSuccess = (data) => {
      if (data.teamId === team._id) {
        const attempts = data.attempts > 1 ? ` (${data.attempts} attempts)` : '';
        setUpdateStatus(prev => ({
          ...prev,
          [data.field]: { 
            type: 'success', 
            message: `Updated!${attempts}` 
          }
        }));
        
        // Clear status after 2 seconds (or longer if multiple attempts)
        const clearDelay = data.attempts > 3 ? 3000 : 2000;
        if (updateTimeouts.current[data.field]) {
          clearTimeout(updateTimeouts.current[data.field]);
        }
        updateTimeouts.current[data.field] = setTimeout(() => {
          setUpdateStatus(prev => {
            const newStatus = { ...prev };
            delete newStatus[data.field];
            return newStatus;
          });
        }, clearDelay);
      }
    };

    const handleUpdateError = (data) => {
      if (data.teamId === team._id) {
        const isConflict = data.message.includes('CONFLICT');
        const isHighLoad = data.serverLoad?.updatesPerSecond > 10;
        
        let message = 'Update failed';
        if (isConflict) {
          message = data.retryCount >= 5 ? 'High traffic! Refreshing...' : 'Conflict! Retrying...';
        } else if (isHighLoad) {
          message = 'Server busy, retrying...';
        }
        
        setUpdateStatus(prev => ({
          ...prev,
          [data.field]: { type: 'error', message }
        }));
        
        // For conflicts, revert the input to server value and clear status
        if (isConflict && data.retryCount >= 5) {
          setTimeout(() => {
            setScores(prev => ({
              ...prev,
              [data.field]: team[data.field]
            }));
            setUpdateStatus(prev => {
              const newStatus = { ...prev };
              delete newStatus[data.field];
              return newStatus;
            });
          }, 2000);
        } else {
          // Clear error status after 4 seconds for high-load scenarios
          if (updateTimeouts.current[data.field]) {
            clearTimeout(updateTimeouts.current[data.field]);
          }
          updateTimeouts.current[data.field] = setTimeout(() => {
            setUpdateStatus(prev => {
              const newStatus = { ...prev };
              delete newStatus[data.field];
              return newStatus;
            });
          }, 4000);
        }
      }
    };

    socketService.on('updateSuccess', handleUpdateSuccess);
    socketService.on('updateError', handleUpdateError);

    return () => {
      socketService.off('updateSuccess', handleUpdateSuccess);
      socketService.off('updateError', handleUpdateError);
      
      // Clear all timeouts
      Object.values(updateTimeouts.current).forEach(timeout => clearTimeout(timeout));
    };
  }, [team._id, team]);

  const handleScoreChange = (field, value) => {
    const numValue = parseInt(value) || 0;
    setScores((prev) => ({
      ...prev,
      [field]: numValue,
    }));
  };

  const handleBlur = (field) => {
    setEditingField(null);
    
    // Only emit if value changed
    if (scores[field] !== team[field]) {
      setUpdateStatus(prev => ({
        ...prev,
        [field]: { type: 'pending', message: 'Saving...' }
      }));
      
      socketService.emit('updateScore', {
        teamId: team._id,
        field,
        value: scores[field],
      });
    }
  };

  const handleKeyDown = (e, field) => {
    if (e.key === 'Enter') {
      e.target.blur();
    } else if (e.key === 'Escape') {
      // Revert to original value
      setScores((prev) => ({
        ...prev,
        [field]: team[field],
      }));
      e.target.blur();
    }
  };

  const handleFocus = (field) => {
    setEditingField(field);
    // Auto-select content if value is 0 to allow immediate overwriting
    const input = inputRefs.current[field];
    if (input && scores[field] === 0) {
      setTimeout(() => {
        input.select();
      }, 0);
    }
  };

  const getRankClass = (rank) => {
    if (rank === 1) return 'rank-1';
    if (rank === 2) return 'rank-2';
    if (rank === 3) return 'rank-3';
    return '';
  };

  const getInputClass = (field) => {
    let classes = 'score-input';
    if (editingField === field) classes += ' editing';
    
    const status = updateStatus[field];
    if (status) {
      classes += ` ${status.type}`;
    }
    
    return classes;
  };

  return (
    <tr className={`score-row ${getRankClass(team.rank)}`}>
      <td className="col-rank">
        <span className="rank-badge">#{team.rank}</span>
      </td>
      <td className="col-team">
        <div className="team-name-cell">{team.name}</div>
      </td>
      {['madLudo', 'cosmicJump', 'treasureHunt', 'spaceRoulette', 'spaceColosseum'].map((field) => (
        <td key={field} className="col-score">
          <div className="score-input-container">
            <input
              ref={(el) => (inputRefs.current[field] = el)}
              type="number"
              min="0"
              value={scores[field]}
              onChange={(e) => handleScoreChange(field, e.target.value)}
              onBlur={() => handleBlur(field)}
              onFocus={() => handleFocus(field)}
              onKeyDown={(e) => handleKeyDown(e, field)}
              className={getInputClass(field)}
            />
            {updateStatus[field] && (
              <div className={`update-status ${updateStatus[field].type}`}>
                {updateStatus[field].type === 'pending' && '⏳'}
                {updateStatus[field].type === 'success' && '✅'}
                {updateStatus[field].type === 'error' && '❌'}
              </div>
            )}
          </div>
        </td>
      ))}
      <td className="col-total">
        <div className="total-badge">{team.total}</div>
      </td>
    </tr>
  );
}

export default ScoreRow;
