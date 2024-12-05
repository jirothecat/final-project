import React, { useEffect, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';

function GamePage() {
    const { currentUser, setCurrentUser } = useOutletContext();
    const playerBoardRef = useRef(null);
    const aiBoardRef = useRef(null);
    const [gameLog, setGameLog] = useState(['Welcome Commander! Press Start Game to begin.']);
    const [currentGame, setCurrentGame] = useState(null);
    const [gameOver, setGameOver] = useState(false);
    const [gameResult, setGameResult] = useState(null);
    const boardContexts = useRef({ player: null, ai: null });

    const GRID_SIZE = 10;
    const CELL_SIZE = 40;
    const PADDING = 20;

    const isShipSunk = (ship) => {
        return ship.hits_taken >= getShipLength(ship.ship_type);
    };

    // const checkGameOver = (ships, isPlayerShips) => {
    //     const allShipsSunk = ships.every(ship => {
    //         const shipLength = getShipLength(ship.ship_type);
    //         return ship.hits_taken >= shipLength;
    //     });

    //     if (allShipsSunk) {
    //         setGameOver(true);
    //         setGameResult(isPlayerShips ? 'loss' : 'win');
    //         addToGameLog(isPlayerShips ? 
    //             'Your fleet has been destroyed. Better luck next time, Commander!' :
    //             'Congratulations Commander! All hostiles eliminated!'
    //         );
    //     }
    // };

    const checkGameOver = async (ships, isPlayerShips) => {
        const allShipsSunk = ships.every(ship => {
            const shipLength = getShipLength(ship.ship_type);
            return ship.hits_taken >= shipLength;
        });
    
        if (allShipsSunk) {
            setGameOver(true);
            const result = isPlayerShips ? 'loss' : 'win';
            setGameResult(result);
            
            try {
                const response = await fetch(`http://localhost:5555/api/games/${currentGame.id}/complete`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        result: result
                    })
                });
    
                if (response.ok) {
                    const data = await response.json();
                    setCurrentUser(data.user);
                }
            } catch (error) {
                console.error('Error updating game stats:', error);
            }
    
            addToGameLog(isPlayerShips ? 
                'Your fleet has been destroyed. Better luck next time, Commander!' :
                'Congratulations Commander! All hostiles eliminated!'
            );
        }
    };

    const getShipLength = (shipType) => {
        const shipLengths = {
            'carrier': 5,
            'battleship': 4,
            'cruiser': 3,
            'submarine': 3,
            'destroyer': 2
        };
        return shipLengths[shipType] || 3;
    };

    const drawShip = (x, y, length, isVertical, ctx) => {
        ctx.fillStyle = '#666';
        if (isVertical) {
            ctx.fillRect(
                PADDING + x * CELL_SIZE + 5,
                PADDING + y * CELL_SIZE + 5,
                CELL_SIZE - 10,
                CELL_SIZE * length - 10
            );
        } else {
            ctx.fillRect(
                PADDING + x * CELL_SIZE + 5,
                PADDING + y * CELL_SIZE + 5,
                CELL_SIZE * length - 10,
                CELL_SIZE - 10
            );
        }
    };

    const addToGameLog = (messages) => {
        if (Array.isArray(messages)) {
            setGameLog(prevLog => [messages[0], ...prevLog.slice(0, 11)])
            setTimeout(() => {
                setGameLog(prevLog => ["Your turn!", "Select your target on the enemy board.", ...prevLog.slice(0, 19)]);
            }, 1250);
        } else {
            setGameLog(prevLog => [messages, ...prevLog.slice(0, 11)])
        }
    };

    const drawHit = (x, y, targetCtx) => {
        targetCtx.fillStyle = '#ff4444';
        targetCtx.beginPath();
        targetCtx.arc(
            PADDING + x * CELL_SIZE + CELL_SIZE/2,
            PADDING + y * CELL_SIZE + CELL_SIZE/2,
            CELL_SIZE/4,
            0,
            Math.PI * 2
        );
        targetCtx.fill();
    };

    const drawMiss = (x, y, targetCtx) => {
        targetCtx.fillStyle = '#4444ff';
        targetCtx.beginPath();
        targetCtx.arc(
            PADDING + x * CELL_SIZE + CELL_SIZE/2,
            PADDING + y * CELL_SIZE + CELL_SIZE/2,
            CELL_SIZE/4,
            0,
            Math.PI * 2
        );
        targetCtx.fill();
    };

    const startNewGame = async () => {
        if (!currentUser) {
            addToGameLog("Please log in to start a game.");
            return;
        }

        try {
            const gameResponse = await fetch('http://localhost:5555/api/games', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: currentUser.id,
                    ai_difficulty: 'medium'
                })
            });

            if (!gameResponse.ok) throw new Error('Failed to create game');
            const game = await gameResponse.json();
            setCurrentGame(game);
            setGameOver(false);
            setGameResult(null);

            const shipsResponse = await fetch(`http://localhost:5555/api/games/${game.id}/initialize-ships`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!shipsResponse.ok) throw new Error('Failed to initialize ships');
            const shipsData = await shipsResponse.json();
            
            const ctx = boardContexts.current.player;
            shipsData.player_ships.forEach(ship => {
                drawShip(
                    ship.x,
                    ship.y,
                    getShipLength(ship.type),
                    ship.orientation === 'vertical',
                    ctx
                );
            });

            addToGameLog("New game started! Choose your target on the enemy board.");
        } catch (error) {
            console.error('Error starting game:', error);
            addToGameLog("Failed to start game. Please try again.");
        }
    };

    const handleCanvasClick = async (event, canvas, isPlayerBoard) => {
        if (!currentUser || !currentGame || gameOver) {
            addToGameLog(gameOver ? "Game is over! Start a new game to play again." : "Please start a new game first!");
            return;
        }

        if (!isPlayerBoard) {
            const rect = canvas.getBoundingClientRect();
            const x = Math.floor((event.clientX - rect.left - PADDING) / CELL_SIZE);
            const y = Math.floor((event.clientY - rect.top - PADDING) / CELL_SIZE);
            
            if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
                const coordinate = `${String.fromCharCode(65 + x)}${y + 1}`;
                
                try {
                    const moveResponse = await fetch('http://localhost:5555/api/moves', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            game_id: currentGame.id,
                            target_x: x,
                            target_y: y,
                            is_player_move: true
                        })
                    });

                    const moveResult = await moveResponse.json();

                    if (moveResult.is_hit) {
                        drawHit(x, y, boardContexts.current.ai);
                        
                        const shipsResponse = await fetch(`http://localhost:5555/api/games/${currentGame.id}/ships?is_player_ship=false`);
                        const ships = await shipsResponse.json();
                        
                        const sunkShip = ships.find(ship => isShipSunk(ship));
                        
                        if (sunkShip) {
                            addToGameLog(`Direct hit! You've sunk the enemy's ${sunkShip.ship_type}!`);
                            setTimeout(() => {
                                addToGameLog("Enemy fleet commander in disarray!");
                            }, 1000);
                        } else {
                            addToGameLog(`Direct hit at ${coordinate}! Well done, Commander!`);
                        }
                        
                        checkGameOver(ships, false);
                    } else {
                        drawMiss(x, y, boardContexts.current.ai);
                        addToGameLog(`Shot at ${coordinate} missed. Keep trying, Commander!`);
                    }

                    if (!gameOver) {
                        setTimeout(() => {
                            addToGameLog("Enemy taking aim...");
                        }, 1000);
                    
                        setTimeout(async () => {
                            const aiResponse = await fetch('http://localhost:5555/api/moves/ai', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                    game_id: currentGame.id
                                })
                            });

                            const aiMove = await aiResponse.json();
                            const aiCoord = `${String.fromCharCode(65 + aiMove.target_x)}${aiMove.target_y + 1}`;
                            
                            if (aiMove.is_hit) {
                                drawHit(aiMove.target_x, aiMove.target_y, boardContexts.current.player);
                                
                                const playerShipsResponse = await fetch(`http://localhost:5555/api/games/${currentGame.id}/ships?is_player_ship=true`);
                                const playerShips = await playerShipsResponse.json();
                                const sunkShip = playerShips.find(ship => isShipSunk(ship));
                                
                                if (sunkShip) {
                                    addToGameLog([
                                        `Enemy has sunk your ${sunkShip.ship_type}!`,
                                        "Damage control teams responding..."
                                    ]);
                                } else {
                                    addToGameLog([
                                        `Enemy fired at ${aiCoord} and hit your ship!`,
                                        "Your turn!"
                                    ]);
                                }
                                
                                checkGameOver(playerShips, true);
                            } else {
                                drawMiss(aiMove.target_x, aiMove.target_y, boardContexts.current.player);
                                addToGameLog([
                                    `Enemy fired at ${aiCoord} and missed.`,
                                    "Your turn!"
                                ]);
                            }
                        }, 1250);
                    }
                } catch (error) {
                    console.error('Error during game play:', error);
                    addToGameLog('Error occurred during play. Please try again.');
                }
            }
        }
    };

    useEffect(() => {
        if (!currentUser) return;

        const initializeBoard = (canvasRef, isPlayerBoard) => {
            const canvas = canvasRef.current;
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            
            if (isPlayerBoard) {
                boardContexts.current.player = ctx;
            } else {
                boardContexts.current.ai = ctx;
            }

            canvas.width = GRID_SIZE * CELL_SIZE + (PADDING * 2);
            canvas.height = GRID_SIZE * CELL_SIZE + (PADDING * 2);

            function drawGrid() {
                ctx.beginPath();
                ctx.strokeStyle = '#ddd';

                for (let i = 0; i <= GRID_SIZE; i++) {
                    ctx.moveTo(PADDING + i * CELL_SIZE, PADDING);
                    ctx.lineTo(PADDING + i * CELL_SIZE, PADDING + GRID_SIZE * CELL_SIZE);
                    ctx.moveTo(PADDING, PADDING + i * CELL_SIZE);
                    ctx.lineTo(PADDING + GRID_SIZE * CELL_SIZE, PADDING + i * CELL_SIZE);
                }

                ctx.stroke();
            }

            drawGrid();

            canvas.addEventListener('click', (e) => handleCanvasClick(e, canvas, isPlayerBoard));
            return () => canvas.removeEventListener('click', (e) => handleCanvasClick(e, canvas, isPlayerBoard));
        };

        initializeBoard(playerBoardRef, true);
        initializeBoard(aiBoardRef, false);

    }, [currentUser, currentGame]);

    const GameOverOverlay = ({ result }) => (
        <div className="game-over-overlay">
            <div className="game-over-content">
                <h2>{result === 'win' ? 'Victory!' : 'Defeat!'}</h2>
                <p>{result === 'win' ? 
                    'Congratulations Commander! All enemy ships have been destroyed!' : 
                    'Your fleet has been destroyed. Better luck next time, Commander!'
                }</p>
                <button onClick={startNewGame} className="new-game-button">
                    Play Again
                </button>
            </div>
        </div>
    );

    return (
        <div className="game-page">
            <div className="game-header">
                <h2>Battleship Game</h2>
                {!currentGame && (
                    <button 
                        onClick={startNewGame}
                        className="start-game-button"
                    >
                        Start Game
                    </button>
                )}
            </div>
            
            {currentGame ? (
                <>
                    <div className="game-boards">
                        <div className="board-container">
                            <h3>Your Fleet</h3>
                            <canvas ref={playerBoardRef} className="battleship-canvas" />
                        </div>
                        <div className="board-container">
                            <h3>Enemy Waters</h3>
                            <canvas ref={aiBoardRef} className="battleship-canvas" />
                        </div>
                    </div>
                    
                    <div className="game-log-container">
    <h3>Battle Log</h3>
    <div className="game-log">
        {gameLog.map((message, index) => (
            <div 
                key={index} 
                className={`log-message ${message === "Your turn!" ? 'your-turn' : ''} 
                           ${index === 0 ? 'latest-message' : ''}`}
            >
                {message}
            </div>
        ))}
    </div>
</div>
                </>
            ) : (
                <div className="game-placeholder">
                    <p>Begin your naval battle by clicking 'Start Game'!</p>
                </div>
            )}

            {gameOver && <GameOverOverlay result={gameResult} />}
        </div>
    );
}

export default GamePage;