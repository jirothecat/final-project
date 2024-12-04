import { useNavigate } from 'react-router-dom';

function HomePage() {
    const navigate = useNavigate();
  
    return (
      <div className="home-container">
        <h1>Welcome to Battleship</h1>
        
        <div className="home-content">
          <div className="game-intro">
            <h2>Challenge the AI in an Epic Naval Battle</h2>
            <p>Test your strategic skills against our computer</p>
          </div>
  
          <div className="action-buttons">
            <button onClick={() => navigate('/game')}>
              Start New Game
            </button>
            <button onClick={() => navigate('/leaderboard')}>
              View Leaderboard
            </button>
          </div>
  
          <div className="features-grid">
            <div className="feature">
              <h3>Click on the grid to attack and sink the enemy's fleet</h3>
              <p>Log-in to start and play your game</p>
            </div>
            <div className="feature">
              <h3>View detailed game statistics</h3>
              <p>See your stats and wins/loss numbers</p>
            </div>
            <div className="feature">
              <h3>Earn Achievements</h3>
              <p>Complete challenges to unlock hidden achievements!</p>
            </div>
            <div className="feature">
              <h3>Settings</h3>
              <p>Switch between light and dark mode!</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

export default HomePage