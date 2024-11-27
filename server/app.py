#!/usr/bin/env python3

# Standard library imports

# Remote library imports
from flask import request
from flask_restful import Resource

# Local imports
from config import app, db, api, CORS
# Add your model imports
from models import User, Game, Ship, Move, Achievement
from random import randint
# Views go here!

@app.route('/')
def index():
    return '<h1>Project Server</h1>'

class Users(Resource):
    def get(self):
        
        users = [user.to_dict() for user in User.query.all()]
        return users, 200
    
    def post(self):
        
        try:
            data = request.get_json()
            new_user = User(
                username=data['username'],
                password=data['password']
            )
            db.session.add(new_user)
            db.session.commit()
            return new_user.to_dict(), 201
        except ValueError as e:
            return {'error': str(e)}, 422

class UserById(Resource):
    def get(self, id):
        user = User.query.filter_by(id=id).first()
        if not user:
            return {'error': 'User not found'}, 404
        return user.to_dict(), 200

    def patch(self, id):
        user = User.query.filter_by(id=id).first()
        if not user:
            return {'error': 'User not found'}, 404
        
        try:
            data = request.get_json()
            for attr in data:
                setattr(user, attr, data[attr])
            db.session.commit()
            return user.to_dict(), 200
        except ValueError as e:
            return {'error': str(e)}, 422

    def delete(self, id):
        user = User.query.filter_by(id=id).first()
        if not user:
            return {'error': 'User not found'}, 404
        
        db.session.delete(user)
        db.session.commit()
        return {}, 204


class Games(Resource):
    def get(self):
        games = [game.to_dict() for game in Game.query.all()]
        return games, 200
    
    def post(self):
        try:
            data = request.get_json()
            new_game = Game(
                user_id=data['user_id'],
                ai_difficulty=data['ai_difficulty']
            )
            db.session.add(new_game)
            db.session.commit()
            return new_game.to_dict(), 201
        except ValueError as e:
            return {'error': str(e)}, 422

class GameById(Resource):
    def get(self, id):
        game = Game.query.filter_by(id=id).first()
        if not game:
            return {'error': 'Game not found'}, 404
        return game.to_dict(), 200

    def patch(self, id):
        game = Game.query.filter_by(id=id).first()
        if not game:
            return {'error': 'Game not found'}, 404
        
        try:
            data = request.get_json()
            for attr in data:
                setattr(game, attr, data[attr])
            db.session.commit()
            return game.to_dict(), 200
        except ValueError as e:
            return {'error': str(e)}, 422
        

class Login(Resource):
    def post(self):
        try:
            data = request.get_json()
            
            if not data or 'username' not in data or 'password' not in data:
                return {'error': 'Missing username or password'}, 400
            
            user = User.query.filter_by(username=data['username']).first()
            
            if not user:
                return {'error': 'User not found'}, 404
            
            if user.password != data['password']:
                return {'error': 'Invalid password'}, 401
            
            return {
                'user': user.to_dict(),
                'message': 'Login successful'
            }, 200
            
        except Exception as e:
            return {'error': str(e)}, 500


@app.route('/api/games/<int:game_id>/initialize-ships', methods=['POST'])
def initialize_ships(game_id):
    game = Game.query.get_or_404(game_id)
    
    # Ship configurations
    ships = [
        {'type': 'carrier', 'size': 5},
        {'type': 'battleship', 'size': 4},
        {'type': 'cruiser', 'size': 3},
        {'type': 'submarine', 'size': 3},
        {'type': 'destroyer', 'size': 2}
    ]

    def is_valid_placement(ship_size, x, y, is_vertical, placed_ships):
        # Check board boundaries
        if is_vertical:
            if y + ship_size > 10: return False
        else:
            if x + ship_size > 10: return False
            
        # Check collision with other ships
        for i in range(ship_size):
            check_x = x + (0 if is_vertical else i)
            check_y = y + (i if is_vertical else 0)
            
            # Check if space is already occupied
            for placed in placed_ships:
                if placed.position_x == check_x and placed.position_y == check_y:
                    return False
        return True

    # Place ships for both player and AI
    for is_player in [True, False]:
        placed_ships = []
        
        for ship in ships:
            while True:
                is_vertical = randint(0, 1) == 1
                x = randint(0, 9)
                y = randint(0, 9)
                
                if is_valid_placement(ship['size'], x, y, is_vertical, placed_ships):
                    new_ship = Ship(
                        game_id=game_id,
                        ship_type=ship['type'],
                        position_x=x,
                        position_y=y,
                        orientation='vertical' if is_vertical else 'horizontal',
                        is_player_ship=is_player
                    )
                    db.session.add(new_ship)
                    placed_ships.append(new_ship)
                    break

    db.session.commit()
    return {'message': 'Ships initialized successfully'}, 200

class Moves(Resource):
    def post(self):
        try:
            data = request.get_json()
            game = Game.query.get_or_404(data['game_id'])
            
            # Create new move
            new_move = Move(
                game_id=data['game_id'],
                targeting_x=data['target_x'],
                targeting_y=data['target_y'],
                is_player_move=data['is_player_move'],
                move_number=Move.query.filter_by(game_id=data['game_id']).count() + 1
            )

            # Check if move hits a ship
            target_ships = Ship.query.filter_by(
                game_id=data['game_id'],
                is_player_ship=not data['is_player_move']
            ).all()

            # Check for hit
            hit_status = False
            for ship in target_ships:
                if ship.orientation == 'vertical':
                    if (ship.position_x == data['target_x'] and 
                        ship.position_y <= data['target_y'] < ship.position_y + get_ship_length(ship.ship_type)):
                        hit_status = True
                        ship.hits_taken += 1
                        break
                else:  # horizontal
                    if (ship.position_y == data['target_y'] and 
                        ship.position_x <= data['target_x'] < ship.position_x + get_ship_length(ship.ship_type)):
                        hit_status = True
                        ship.hits_taken += 1
                        break

            new_move.hit_status = hit_status
            db.session.add(new_move)
            db.session.commit()

            return {
                'is_hit': hit_status,
                'target_x': data['target_x'],
                'target_y': data['target_y']
            }, 201

        except Exception as e:
            return {'error': str(e)}, 400

@app.route('/api/moves/ai', methods=['POST'])
def ai_move():
    try:
        data = request.get_json()
        game = Game.query.get_or_404(data['game_id'])

        # Simple AI: random targeting
        target_x = randint(0, 9)
        target_y = randint(0, 9)

        # Create AI move
        ai_move = Move(
            game_id=game.id,
            targeting_x=target_x,
            targeting_y=target_y,
            is_player_move=False,
            move_number=Move.query.filter_by(game_id=game.id).count() + 1
        )

        # Check if move hits player's ship
        player_ships = Ship.query.filter_by(
            game_id=game.id,
            is_player_ship=True
        ).all()

        # Check for hit
        hit_status = False
        for ship in player_ships:
            if ship.orientation == 'vertical':
                if (ship.position_x == target_x and 
                    ship.position_y <= target_y < ship.position_y + get_ship_length(ship.ship_type)):
                    hit_status = True
                    ship.hits_taken += 1
                    break
            else:  # horizontal
                if (ship.position_y == target_y and 
                    ship.position_x <= target_x < ship.position_x + get_ship_length(ship.ship_type)):
                    hit_status = True
                    ship.hits_taken += 1
                    break

        ai_move.hit_status = hit_status
        db.session.add(ai_move)
        db.session.commit()

        return {
            'is_hit': hit_status,
            'target_x': target_x,
            'target_y': target_y
        }, 201

    except Exception as e:
        return {'error': str(e)}, 400
    
def get_ship_length(ship_type):
    ship_lengths = {
        'carrier': 5,
        'battleship': 4,
        'cruiser': 3,
        'submarine': 3,
        'destroyer': 2
    }
    return ship_lengths.get(ship_type, 3)

@app.route('/api/user/stats', methods=['GET'])
def get_user_stats():
    # Get logged-in user's stats
    user = User.query.first()  # Replace with actual logged-in user logic later
    
    # Calculate stats from games
    games = Game.query.filter_by(user_id=user.id).all()
    total_games = len(games)
    
    achievements = Achievement.query.all()
    user_achievements = user.achievements

    return {
        'user_stats': {
            'username': user.username,
            'wins': user.wins,
            'losses': user.losses,
            'games_played': user.games_played,
            'win_rate': round((user.wins / user.games_played * 100) if user.games_played > 0 else 0, 1)
        },
        'achievements': [{
            'id': achievement.id,
            'name': achievement.name,
            'description': achievement.description,
            'earned': achievement in user_achievements
        } for achievement in achievements]
    }, 200


# class Stats(Resource):
#     def get(self):
#         try:

#             user = User.query.first()
            
#             if not user:
#                 return {'error': 'User not found'}, 404

  
#             total_games = user.games_played
#             win_rate = (user.wins / total_games * 100) if total_games > 0 else 0


#             achievements = Achievement.query.all()
#             user_achievements = user.achievements

#             response_data = {
#                 'user_stats': {
#                     'username': user.username,
#                     'wins': user.wins,
#                     'losses': user.losses,
#                     'games_played': total_games,
#                     'win_rate': round(win_rate, 1)
#                 },
#                 'achievements': [{
#                     'id': achievement.id,
#                     'name': achievement.name,
#                     'description': achievement.description,
#                     'earned': achievement in user_achievements
#                 } for achievement in achievements]
#             }

#             return response_data, 200

#         except Exception as e:
#             return {'error': str(e)}, 500
        
# @app.route('/api/user/stats', methods=['GET'])
# def get_user_stats():
    
#     user = User.query.first()  
    
    
#     games = Game.query.filter_by(user_id=user.id).all()
#     total_games = len(games)
    
#     achievements = Achievement.query.all()
#     user_achievements = user.achievements

#     return {
#         'user_stats': {
#             'username': user.username,
#             'wins': user.wins,
#             'losses': user.losses,
#             'games_played': user.games_played,
#             'win_rate': round((user.wins / user.games_played * 100) if user.games_played > 0 else 0, 1)
#         },
#         'achievements': [{
#             'id': achievement.id,
#             'name': achievement.name,
#             'description': achievement.description,
#             'earned': achievement in user_achievements
#         } for achievement in achievements]
#     }, 200

api.add_resource(Users, '/users')
api.add_resource(UserById, '/users/<int:id>')
api.add_resource(Games, '/games')
api.add_resource(GameById, '/games/<int:id>')
api.add_resource(Login, '/login')
api.add_resource(Moves, '/api/moves')
# api.add_resource(Stats, '/api/stats')

if __name__ == '__main__':
    app.run(port=5555, debug=True)
CORS(app)
