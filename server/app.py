#!/usr/bin/env python3

# Standard library imports
from random import randint

# Remote library imports
from flask import request, jsonify
from flask_restful import Resource
from flask_cors import CORS

# Local imports
from config import app, db, api
from models import User, Game, Ship, Move, Achievement

# Configure CORS
CORS(app)

# Helper Functions
def get_ship_length(ship_type):
    ship_lengths = {
        'carrier': 5,
        'battleship': 4,
        'cruiser': 3,
        'submarine': 3,
        'destroyer': 2
    }
    return ship_lengths.get(ship_type, 3)

# Routes
@app.route('/')
def index():
    return '<h1>Project Server</h1>'

# Resources
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

class Moves(Resource):
    def post(self):
        try:
            data = request.get_json()
            game = Game.query.get_or_404(data['game_id'])
            
            new_move = Move(
                game_id=data['game_id'],
                targeting_x=data['target_x'],
                targeting_y=data['target_y'],
                is_player_move=data['is_player_move'],
                move_number=Move.query.filter_by(game_id=data['game_id']).count() + 1
            )

            target_ships = Ship.query.filter_by(
                game_id=data['game_id'],
                is_player_ship=not data['is_player_move']
            ).all()

            hit_status = False
            for ship in target_ships:
                if ship.orientation == 'vertical':
                    if (ship.position_x == data['target_x'] and 
                        ship.position_y <= data['target_y'] < ship.position_y + get_ship_length(ship.ship_type)):
                        hit_status = True
                        ship.hits_taken += 1
                        break
                else:  
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

        target_x = randint(0, 9)
        target_y = randint(0, 9)

        ai_move = Move(
            game_id=game.id,
            targeting_x=target_x,
            targeting_y=target_y,
            is_player_move=False,
            move_number=Move.query.filter_by(game_id=game.id).count() + 1
        )

        player_ships = Ship.query.filter_by(
            game_id=game.id,
            is_player_ship=True
        ).all()

        hit_status = False
        for ship in player_ships:
            if ship.orientation == 'vertical':
                if (ship.position_x == target_x and 
                    ship.position_y <= target_y < ship.position_y + get_ship_length(ship.ship_type)):
                    hit_status = True
                    ship.hits_taken += 1
                    break
            else:  
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

@app.route('/api/games/<int:game_id>/initialize-ships', methods=['POST'])
def initialize_ships(game_id):
    game = Game.query.get_or_404(game_id)
    
    ships = [
        {'type': 'carrier', 'size': 5},
        {'type': 'battleship', 'size': 4},
        {'type': 'cruiser', 'size': 3},
        {'type': 'submarine', 'size': 3},
        {'type': 'destroyer', 'size': 2}
    ]

    def is_valid_placement(ship_size, x, y, is_vertical, existing_ships):
        if is_vertical and y + ship_size > 10:
            return False
        if not is_vertical and x + ship_size > 10:
            return False
            
        for i in range(ship_size):
            check_x = x + (0 if is_vertical else i)
            check_y = y + (i if is_vertical else 0)
            
            for dx in [-1, 0, 1]:
                for dy in [-1, 0, 1]:
                    test_x = check_x + dx
                    test_y = check_y + dy
                    
                    if 0 <= test_x < 10 and 0 <= test_y < 10:
                        for ship in existing_ships:
                            ship_range_x = range(ship.position_x, ship.position_x + (1 if ship.orientation == 'vertical' else get_ship_length(ship.ship_type)))
                            ship_range_y = range(ship.position_y, ship.position_y + (get_ship_length(ship.ship_type) if ship.orientation == 'vertical' else 1))
                            
                            if test_x in ship_range_x and test_y in ship_range_y:
                                return False
        return True

    player_ships = []
    ai_ships = []

    for is_player in [True, False]:
        current_ships = player_ships if is_player else ai_ships
        
        for ship in ships:
            attempts = 0
            while attempts < 100:  
                is_vertical = bool(randint(0, 1))
                x = randint(0, 9)
                y = randint(0, 9)
                
                if is_valid_placement(ship['size'], x, y, is_vertical, current_ships):
                    new_ship = Ship(
                        game_id=game_id,
                        ship_type=ship['type'],
                        position_x=x,
                        position_y=y,
                        orientation='vertical' if is_vertical else 'horizontal',
                        is_player_ship=is_player
                    )
                    db.session.add(new_ship)
                    current_ships.append(new_ship)
                    break
                attempts += 1

    try:
        db.session.commit()
        return {
            'player_ships': [{
                'type': ship.ship_type,
                'x': ship.position_x,
                'y': ship.position_y,
                'orientation': ship.orientation
            } for ship in player_ships]
        }, 200
    except Exception as e:
        db.session.rollback()
        return {'error': str(e)}, 500

@app.route('/api/user/stats', methods=['GET'])
def get_user_stats():
    user = User.query.first() 
    
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

@app.route('/api/games/<int:game_id>/ships', methods=['GET'])
def get_game_ships(game_id):
    is_player_ship = request.args.get('is_player_ship', 'true').lower() == 'true'
    
    ships = Ship.query.filter_by(
        game_id=game_id,
        is_player_ship=is_player_ship
    ).all()
    
    return jsonify([{
        'id': ship.id,
        'ship_type': ship.ship_type,
        'hits_taken': ship.hits_taken
    } for ship in ships]), 200


api.add_resource(Users, '/api/users')
api.add_resource(UserById, '/api/users/<int:id>')
api.add_resource(Games, '/api/games')
api.add_resource(GameById, '/api/games/<int:id>')
api.add_resource(Login, '/api/login')
api.add_resource(Moves, '/api/moves')

if __name__ == '__main__':
    app.run(port=5555, debug=True)