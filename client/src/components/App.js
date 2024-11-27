import React, { useState, useEffect } from "react";
import { Routes, Route, Outlet } from "react-router-dom";

import Header from './Header';
import NavBar from './Navbar';
import HomePage from './HomePage';
import LoginPage from './LoginPage';
import GamePage from './GamePage';
import StatsPage from './StatsPage';
import LeaderboardPage from './LeaderboardPage';
import SettingsPage from './SettingsPage';

function App() {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [games, setGames] = useState([]);
  const [darkMode, setDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('darkMode');
    return savedMode ? JSON.parse(savedMode) : false;
});


  useEffect(() => {
    fetch('/users')
      .then(r => {
        if (!r.ok) throw new Error('Failed to fetch users');
        return r.json();
      })
      .then(data => setUsers(data))
      .catch(error => console.error('Error fetching users:', error));
  }, []);

  const handleAddUser = async (newUser) => {
    try {
      const response = await fetch('/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUser),
      });
      
      if (!response.ok) throw new Error('Failed to add user');
      const data = await response.json();
      setUsers([...users, data]);
      return data;
    } catch (error) {
      console.error('Error adding user:', error);
      throw error;
    }
  };

  const handleUpdateUser = async (id, updates) => {
    try {
      const response = await fetch(`/users/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) throw new Error('Failed to update user');
      const updatedUser = await response.json();
      setUsers(users.map(user => 
        user.id === updatedUser.id ? updatedUser : user
      ));
      return updatedUser;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  };

  const handleStartGame = async (gameData) => {
    try {
      const response = await fetch('/games', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(gameData),
      });
      
      if (!response.ok) throw new Error('Failed to start game');
      const newGame = await response.json();
      setGames([...games, newGame]);
      return newGame;
    } catch (error) {
      console.error('Error starting game:', error);
      throw error;
    }
  };

  const contextValue = {
    users,
    currentUser,
    setCurrentUser,
    games,
    handleAddUser,
    handleUpdateUser,
    handleStartGame,
    darkMode,
    setDarkMode
};

  return (
    <div className="App">
      <Header />
      <NavBar />
      <Routes>
        <Route element={<Layout context={contextValue} />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/game" element={<GamePage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </div>
  );
}

function Layout({ context }) {
  return (
    <div className="layout">
      <Outlet context={context} />
    </div>
  );
}


export default App;