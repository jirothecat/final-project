import React from 'react';
import { NavLink } from "react-router-dom";

function NavBar() {
  return (
    <nav className="nav-bar">
      <ul>
        <li><NavLink to="/">Home</NavLink></li>
        <li><NavLink to="/login">Login</NavLink></li>
        <li><NavLink to="/game">Start Game</NavLink></li>
        <li><NavLink to="/stats">Stats</NavLink></li>
        <li><NavLink to="/leaderboard">Leaderboard</NavLink></li>
        <li><NavLink to="/settings">Settings</NavLink></li>
      </ul>
    </nav>
  );
}

export default NavBar;