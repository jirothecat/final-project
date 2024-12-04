from sqlalchemy_serializer import SerializerMixin
from sqlalchemy.orm import validates, relationship
from sqlalchemy.ext.associationproxy import association_proxy

from config import db

# Models go here!


class User(db.Model, SerializerMixin):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String, nullable=False, unique=True)
    password = db.Column(db.String, nullable=False)
    wins = db.Column(db.Integer)
    losses = db.Column(db.Integer)
    games_played = db.Column(db.Integer)

    games = db.relationship('Game', backref='user')
    user_achievements = db.relationship('UserAchievement', back_populates='user')

    serialize_rules = ('-games.user', '-achievements.users',)

    @validates('username')
    def validate_username(self, key, username):
        if not username:
            raise ValueError("Username must be provided")
        if len(username) < 3:
            raise ValueError("Username must be at least 3 characters")
        return username

    @property
    def achievements(self):
        return [ua.achievement for ua in self.user_achievements]

    serialize_rules = ('-games.user', '-user_achievements.user',)
    
class Game(db.Model, SerializerMixin):
    __tablename__ = 'games'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    ai_difficulty = db.Column(db.String)
    status = db.Column(db.String, default='in_progress')

    moves = db.relationship('Move', backref='game')
    ships = db.relationship('Ship', backref='game')

    serialize_rules = ('-user.games', '-moves.game', '-ships.game',)

class Ship(db.Model, SerializerMixin):
    __tablename__ = 'ships'

    id = db.Column(db.Integer, primary_key=True)
    game_id = db.Column(db.Integer, db.ForeignKey('games.id'))
    position_x = db.Column(db.Integer, nullable=False)
    position_y = db.Column(db.Integer, nullable=False)
    orientation = db.Column(db.String)  
    hits_taken = db.Column(db.Integer, default=0)
    ship_type = db.Column(db.String, nullable=False)  
    is_player_ship = db.Column(db.Boolean, default=True)

    serialize_rules = ('-game.ships',)

    @validates('position_x', 'position_y')
    def validate_position(self, key, value):
        if not 0 <= value <= 9:  
            raise ValueError(f"Position must be between 0 and 9")
        return value

class Move(db.Model, SerializerMixin):
    __tablename__ = 'moves'

    id = db.Column(db.Integer, primary_key=True)
    game_id = db.Column(db.Integer, db.ForeignKey('games.id'))
    targeting_x = db.Column(db.Integer, nullable=False)
    targeting_y = db.Column(db.Integer, nullable=False)
    hit_status = db.Column(db.Boolean)
    move_number = db.Column(db.Integer)
    is_player_move = db.Column(db.Boolean, default=True)

    serialize_rules = ('-game.moves',)

    @validates('targeting_x', 'targeting_y')
    def validate_target(self, key, value):
        if not 0 <= value <= 9:
            raise ValueError(f"Target position must be between 0 and 9")
        return value

class Achievement(db.Model, SerializerMixin):
    __tablename__ = 'achievements'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String, nullable=False)
    description = db.Column(db.String)
    criteria = db.Column(db.String)  
    icon = db.Column(db.String)  

    user_achievements = db.relationship('UserAchievement', back_populates='achievement')
    
    @property
    def users(self):
        return [ua.user for ua in self.user_achievements]

    serialize_rules = ('-user_achievements.achievement',)
   

class UserAchievement(db.Model, SerializerMixin):
    __tablename__ = 'user_achievements'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    achievement_id = db.Column(db.Integer, db.ForeignKey('achievements.id'))
    earned_at = db.Column(db.DateTime, server_default=db.func.now())

    
    user = db.relationship('User', back_populates='user_achievements')
    achievement = db.relationship('Achievement', back_populates='user_achievements')

    serialize_rules = ('-user.user_achievements', '-achievement.user_achievements',)
