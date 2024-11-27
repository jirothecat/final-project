import React, { useState, useEffect } from 'react';

function StatsPage() {
    const [userStats, setUserStats] = useState(null);
    const [achievements, setAchievements] = useState([]);
  
    useEffect(() => {
      // Fetch user stats and achievements when component mounts
      const fetchStats = async () => {
        try {
          const response = await fetch('/api/user/stats');
          const data = await response.json();
          setUserStats(data);
        } catch (error) {
          console.error('Error fetching stats:', error);
        }
      };
  
      const fetchAchievements = async () => {
        try {
          const response = await fetch('/api/user/achievements');
          const data = await response.json();
          setAchievements(data);
        } catch (error) {
          console.error('Error fetching achievements:', error);
        }
      };
  
      fetchStats();
      fetchAchievements();
    }, []);
  
    if (!userStats) return <div>Loading...</div>;
  
    return (
      <div className="stats-page">
        <h1>Player Statistics</h1>
        
        <div className="stats-container">
          <div className="stats-card">
            <h2>Battle Record</h2>
            <div className="stats-grid">
              <div className="stat-item">
                <h3>Wins</h3>
                <p className="stat-value">{userStats.wins}</p>
              </div>
              <div className="stat-item">
                <h3>Losses</h3>
                <p className="stat-value">{userStats.losses}</p>
              </div>
              <div className="stat-item">
                <h3>Win Rate</h3>
                <p className="stat-value">
                  {userStats.games_played > 0 
                    ? `${((userStats.wins / userStats.games_played) * 100).toFixed(1)}%`
                    : '0%'}
                </p>
              </div>
              <div className="stat-item">
                <h3>Games Played</h3>
                <p className="stat-value">{userStats.games_played}</p>
              </div>
            </div>
          </div>
  
          <div className="achievements-card">
            <h2>Achievements</h2>
            <div className="achievements-grid">
              {achievements.map((achievement) => (
                <div 
                  key={achievement.id} 
                  className={`achievement-item ${achievement.earned ? 'earned' : 'locked'}`}
                >
                  <div className="achievement-icon">
                    {achievement.earned ? '🏆' : '🔒'}
                  </div>
                  <div className="achievement-info">
                    <h3>{achievement.name}</h3>
                    <p>{achievement.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  export default StatsPage;