import { useState, useEffect, useRef } from 'react';
import socketService from '../services/socket';

function ScoreRow({ team }) {
  const [scores, setScores] = useState({
    madLudo: team.madLudo,
    treasureHunt: team.treasureHunt,
    spaceRoulette: team.spaceRoulette,
    cosmicJump: team.cosmicJump,
    spaceColosseum: team.spaceColosseum,
  });
  
  const [editingField, setEditingField] = useState(null);
  const inputRefs = useRef({});

  // Update local state when team prop changes
  useEffect(() => {
    setScores({
      madLudo: team.madLudo,
      treasureHunt: team.treasureHunt,
      spaceRoulette: team.spaceRoulette,
      cosmicJump: team.cosmicJump,
      spaceColosseum: team.spaceColosseum,
    });
  }, [team]);

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

  return (
    <tr className={`score-row ${getRankClass(team.rank)}`}>
      <td className="col-rank">
        <span className="rank-badge">#{team.rank}</span>
      </td>
      <td className="col-team">
        <div className="team-name-cell">{team.name}</div>
      </td>
      {['madLudo', 'treasureHunt', 'spaceRoulette', 'cosmicJump', 'spaceColosseum'].map((field) => (
        <td key={field} className="col-score">
          <input
            ref={(el) => (inputRefs.current[field] = el)}
            type="number"
            min="0"
            value={scores[field]}
            onChange={(e) => handleScoreChange(field, e.target.value)}
            onBlur={() => handleBlur(field)}
            onFocus={() => handleFocus(field)}
            onKeyDown={(e) => handleKeyDown(e, field)}
            className={`score-input ${editingField === field ? 'editing' : ''}`}
          />
        </td>
      ))}
      <td className="col-total">
        <div className="total-badge">{team.total}</div>
      </td>
      {/* Delete button removed for security - prevents accidental team deletions */}
      {/*
      <td className="col-actions">
        <button
          onClick={() => onDelete(team._id)}
          className="delete-btn"
          title="Delete team"
        >
          🗑️
        </button>
      </td>
      */}
    </tr>
  );
}

export default ScoreRow;
