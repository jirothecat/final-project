import React, { useEffect, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';

function GamePage() {
    // Existing state and refs
    const { currentUser } = useOutletContext();
    const playerBoardRef = useRef(null);
    const aiBoardRef = useRef(null);
    const [gameLog, setGameLog] = useState(['Welcome Commander! Press Start Game to begin.']);
    const [currentGame, setCurrentGame] = useState(null);
    const boardContexts = useRef({ player: null, ai: null });

    const GRID_SIZE = 10;
    const CELL_SIZE = 40;
    const PADDING = 20;

    // Add Start Game functionality
    const startNewGame = async () => {
        if (!currentUser) {
            addToGameLog("Please log in to start a game.");
            return;
        }

        try {
            const response = await fetch('http://localhost:5555/games', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: currentUser.id,
                    ai_difficulty: 'medium'
                })
            });

            if (!response.ok) {
                throw new Error('Failed to start game');
            }
            
            const game = await response.json();
            setCurrentGame(game);
            addToGameLog("New game started! Choose your target on the enemy board.");
            
            // Initialize ships for the new game
            await fetch(`http://localhost:5555/games/${game.id}/initialize-ships`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
        } catch (error) {
            console.error('Error starting game:', error);
            addToGameLog("Failed to start game. Please try again.");
        }
    };

    const addToGameLog = (messages) => {
        if (Array.isArray(messages)) {
            setGameLog(messages.slice(0, 2));
        } else {
            setGameLog(prevLog => [messages, prevLog[0]]);
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

    const handleCanvasClick = (event, canvas, isPlayerBoard) => {
        if (!currentUser || !currentGame) {
            addToGameLog("Please start a new game first!");
            return;
        }

        if (!isPlayerBoard) {
            const rect = canvas.getBoundingClientRect();
            const x = Math.floor((event.clientX - rect.left - PADDING) / CELL_SIZE);
            const y = Math.floor((event.clientY - rect.top - PADDING) / CELL_SIZE);
            
            if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
                const coordinate = `${String.fromCharCode(65 + x)}${y + 1}`;
                
                fetch('/api/moves', {
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
                })
                .then(r => r.json())
                .then(moveResult => {
                    if (moveResult.is_hit) {
                        drawHit(x, y, boardContexts.current.ai);
                        addToGameLog(`Direct hit at ${coordinate}! Well done, Commander!`);
                    } else {
                        drawMiss(x, y, boardContexts.current.ai);
                        addToGameLog(`Shot at ${coordinate} missed. Keep trying, Commander!`);
                    }

                    // AI's turn
                    setTimeout(() => {
                        fetch('/api/moves/ai', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                game_id: currentGame.id
                            })
                        })
                        .then(r => r.json())
                        .then(aiMove => {
                            const aiCoord = `${String.fromCharCode(65 + aiMove.target_x)}${aiMove.target_y + 1}`;
                            
                            if (aiMove.is_hit) {
                                drawHit(aiMove.target_x, aiMove.target_y, boardContexts.current.player);
                                addToGameLog([
                                    `Enemy fired at ${aiCoord} and hit your ship!`,
                                    `Enemy taking aim...`
                                ]);
                            } else {
                                drawMiss(aiMove.target_x, aiMove.target_y, boardContexts.current.player);
                                addToGameLog([
                                    `Enemy fired at ${aiCoord} and missed.`,
                                    `Enemy taking aim...`
                                ]);
                            }
                        });
                    }, 1000);
                });
            }
        }
    };

    useEffect(() => {
        if (!currentUser) return;

        const initializeBoard = (canvasRef, isPlayerBoard) => {
            const canvas = canvasRef.current;
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            
            // Store context reference
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

            function drawShip(x, y, length, isVertical) {
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
            }

            // Initialize board
            drawGrid();

            if (isPlayerBoard) {
                drawShip(2, 3, 3, false);
                drawShip(5, 2, 4, true);
            }

            canvas.addEventListener('click', (e) => handleCanvasClick(e, canvas, isPlayerBoard));
            
            return () => canvas.removeEventListener('click', (e) => handleCanvasClick(e, canvas, isPlayerBoard));
        };

        initializeBoard(playerBoardRef, true);
        initializeBoard(aiBoardRef, false);

    }, [currentUser, currentGame]);

    return (
        <div className="game-page">
            <div className="game-header">
                <h2>Battleship Game</h2>
                {!currentGame && (
                    <button 
                        onClick={startNewGame}
                        className="start-game-button"
                    >
                        Game Start
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
                                <div key={index} className="log-message">
                                    {message}
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            ) : (
                <div className="game-placeholder">
                    <p>Start a new game!</p>
                </div>
            )}
        </div>
    );
}



export default GamePage;