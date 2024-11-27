import { useOutletContext } from "react-router-dom";

function LeaderboardPage() {
    const { users } = useOutletContext();
  
    return (
      <div>
        <h2>Leaderboard</h2>
        <table>
          <thead>
            <tr>
              <th>Username</th>
              <th>Wins</th>
              <th>Games Played</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>{user.username}</td>
                <td>{user.wins}</td>
                <td>{user.games_played}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

export default LeaderboardPage;