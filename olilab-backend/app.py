import os
import uuid
import enum
import json
from flask import Flask, jsonify, request, abort
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from dotenv import load_dotenv
import google.generativeai as genai
import click
from flask.cli import with_appcontext

# --- App Initialization & Configuration ---

# Load environment variables from .env file for local development
load_dotenv()

# Initialize extensions
db = SQLAlchemy()
bcrypt = Bcrypt()

# --- ENUM Type Definitions for SQLAlchemy Models ---
# These ensure data integrity by restricting values to predefined sets.

class UserStatusEnum(enum.Enum):
    PENDING = 'PENDING'
    APPROVED = 'APPROVED'
    DENIED = 'DENIED'

class UserRoleEnum(enum.Enum):
    Member = 'Member'
    Admin = 'Admin'

class LogActionEnum(enum.Enum):
    BORROW = 'BORROW'
    RETURN = 'RETURN'

class LogStatusEnum(enum.Enum):
    PENDING = 'PENDING'
    APPROVED = 'APPROVED'
    DENIED = 'DENIED'
    RETURNED = 'RETURNED'

class SuggestionTypeEnum(enum.Enum):
    ITEM = 'ITEM'
    FEATURE = 'FEATURE'

class SuggestionStatusEnum(enum.Enum):
    PENDING = 'PENDING'
    APPROVED = 'APPROVED'
    DENIED = 'DENIED'

# --- SQLAlchemy Database Models ---
# These classes define the structure of the database tables.

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = db.Column(db.String(80), unique=True, nullable=False)
    full_name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.Text, nullable=False)
    lrn = db.Column(db.String(12), unique=True)
    grade_level = db.Column(db.String(50))
    section = db.Column(db.String(50))
    role = db.Column(db.Enum(UserRoleEnum), nullable=False, default=UserRoleEnum.Member)
    is_admin = db.Column(db.Boolean, nullable=False, default=False)
    status = db.Column(db.Enum(UserStatusEnum), nullable=False, default=UserStatusEnum.PENDING)
    created_at = db.Column(db.DateTime(timezone=True), server_default=db.func.now())

    def to_dict(self, exclude_password=True):
        d = {c.name: getattr(self, c.name) for c in self.__table__.columns}
        if exclude_password:
            d.pop('password_hash', None)
        # Convert enums and UUIDs to strings for JSON serialization
        for key, value in d.items():
            if isinstance(value, enum.Enum):
                d[key] = value.value
            if isinstance(value, uuid.UUID):
                d[key] = str(value)
        # Convert to camelCase for frontend
        return {
            'id': d['id'], 'username': d['username'], 'fullName': d['full_name'], 'email': d['email'],
            'lrn': d['lrn'], 'gradeLevel': d['grade_level'], 'section': d['section'], 'role': d['role'],
            'isAdmin': d['is_admin'], 'status': d['status']
        }

class Item(db.Model):
    __tablename__ = 'items'
    id = db.Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = db.Column(db.String(255), nullable=False)
    category = db.Column(db.String(100), nullable=False)
    total_quantity = db.Column(db.Integer, nullable=False)
    available_quantity = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), server_default=db.func.now())
    updated_at = db.Column(db.DateTime(timezone=True), server_default=db.func.now(), onupdate=db.func.now())
    
    def to_dict(self):
        d = {c.name: getattr(self, c.name) for c in self.__table__.columns}
        if isinstance(d['id'], uuid.UUID):
            d['id'] = str(d['id'])
        return {
            'id': d['id'], 'name': d['name'], 'category': d['category'],
            'totalQuantity': d['total_quantity'], 'availableQuantity': d['available_quantity']
        }

class Log(db.Model):
    __tablename__ = 'logs'
    id = db.Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = db.Column(PG_UUID(as_uuid=True), db.ForeignKey('users.id'))
    item_id = db.Column(PG_UUID(as_uuid=True), db.ForeignKey('items.id'))
    quantity = db.Column(db.Integer, nullable=False)
    timestamp = db.Column(db.DateTime(timezone=True), server_default=db.func.now())
    action = db.Column(db.Enum(LogActionEnum), nullable=False)
    status = db.Column(db.Enum(LogStatusEnum))
    admin_notes = db.Column(db.Text)
    related_log_id = db.Column(PG_UUID(as_uuid=True))
    return_requested = db.Column(db.Boolean, default=False)
    
    def to_dict(self):
        d = {c.name: getattr(self, c.name) for c in self.__table__.columns}
        for key, value in d.items():
            if isinstance(value, enum.Enum):
                d[key] = value.value
            if isinstance(value, uuid.UUID):
                d[key] = str(value)
        return {
            'id': d['id'], 'userId': d['user_id'], 'itemId': d['item_id'], 'quantity': d['quantity'],
            'timestamp': d['timestamp'].isoformat(), 'action': d['action'], 'status': d['status'],
            'adminNotes': d['admin_notes'], 'relatedLogId': d['related_log_id'], 'returnRequested': d['return_requested']
        }

# --- (Suggestion and Comment Models are similar) ---
class Suggestion(db.Model):
    __tablename__ = 'suggestions'
    id = db.Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = db.Column(PG_UUID(as_uuid=True), db.ForeignKey('users.id'))
    type = db.Column(db.Enum(SuggestionTypeEnum), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(100))
    status = db.Column(db.Enum(SuggestionStatusEnum), nullable=False, default=SuggestionStatusEnum.PENDING)
    timestamp = db.Column(db.DateTime(timezone=True), server_default=db.func.now())

    def to_dict(self):
        d = {c.name: getattr(self, c.name) for c in self.__table__.columns}
        for key, value in d.items():
            if isinstance(value, enum.Enum): d[key] = value.value
            if isinstance(value, uuid.UUID): d[key] = str(value)
        return {
            'id': d['id'], 'userId': d['user_id'], 'type': d['type'], 'title': d['title'],
            'description': d['description'], 'category': d['category'], 'status': d['status'],
            'timestamp': d['timestamp'].isoformat()
        }

class Comment(db.Model):
    __tablename__ = 'comments'
    id = db.Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = db.Column(PG_UUID(as_uuid=True), db.ForeignKey('users.id'))
    suggestion_id = db.Column(PG_UUID(as_uuid=True), db.ForeignKey('suggestions.id'))
    text = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime(timezone=True), server_default=db.func.now())
    
    def to_dict(self):
        d = {c.name: getattr(self, c.name) for c in self.__table__.columns}
        if isinstance(d['id'], uuid.UUID): d['id'] = str(d['id'])
        if isinstance(d['user_id'], uuid.UUID): d['user_id'] = str(d['user_id'])
        if isinstance(d['suggestion_id'], uuid.UUID): d['suggestion_id'] = str(d['suggestion_id'])
        return {
            'id': d['id'], 'userId': d['user_id'], 'suggestionId': d['suggestion_id'],
            'text': d['text'], 'timestamp': d['timestamp'].isoformat()
        }

# --- Application Factory ---
def create_app():
    app = Flask(__name__)
    CORS(app)

    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    db.init_app(app)
    bcrypt.init_app(app)
    
    try:
        api_key = os.getenv("API_KEY")
        if not api_key: print("Warning: API_KEY not found. AI features will be disabled.")
        genai.configure(api_key=api_key)
    except Exception as e:
        print(f"Error configuring Gemini API: {e}")

    with app.app_context():
        # --- (Error Handlers) ---
        @app.errorhandler(400)
        def bad_request(error): return jsonify({"message": error.description}), 400
        @app.errorhandler(401)
        def unauthorized(error): return jsonify({"message": error.description}), 401
        # ... (other handlers)
        @app.errorhandler(500)
        def internal_server_error(error): return jsonify({"message": "An unexpected server error occurred."}), 500

        # --- API Routes ---
        
        @app.route('/api/auth/login', methods=['POST'])
        def login():
            data = request.get_json()
            identifier = data.get('identifier', '').lower()
            password = data.get('password', '')
            user = User.query.filter(
                (db.func.lower(User.username) == identifier) |
                (db.func.lower(User.email) == identifier) |
                (User.lrn == identifier)
            ).first()

            if not user or not bcrypt.check_password_hash(user.password_hash, password):
                abort(401, "Invalid credentials.")
            if user.status != UserStatusEnum.APPROVED:
                abort(403, "Your account has not been approved.")
                
            return jsonify(user.to_dict())

        @app.route('/api/data', methods=['GET'])
        def get_initial_data():
            state = {
                "items": [i.to_dict() for i in Item.query.order_by(Item.name).all()],
                "users": [u.to_dict() for u in User.query.order_by(User.full_name).all()],
                "logs": [l.to_dict() for l in Log.query.order_by(Log.timestamp.desc()).all()],
                "suggestions": [s.to_dict() for s in Suggestion.query.order_by(Suggestion.timestamp.desc()).all()],
                "comments": [c.to_dict() for c in Comment.query.order_by(Comment.timestamp.asc()).all()],
                "notifications": []
            }
            return jsonify(state)

        @app.route('/api/items', methods=['POST'])
        def add_item():
            data = request.get_json()
            new_item = Item(
                name=data['name'], category=data['category'],
                total_quantity=int(data['totalQuantity']),
                available_quantity=int(data['totalQuantity'])
            )
            db.session.add(new_item)
            db.session.commit()
            return jsonify(new_item.to_dict()), 201

        @app.route('/api/users', methods=['POST'])
        def create_user():
            data = request.get_json()
            if User.query.filter(db.func.lower(User.username) == data['username'].lower()).first():
                abort(409, "Username is already taken.")
            
            new_user = User(
                username=data['username'],
                full_name=data['fullName'],
                email=data['email'],
                password_hash=bcrypt.generate_password_hash(data['password']).decode('utf-8'),
                lrn=data.get('lrn') or None,
                grade_level=data.get('gradeLevel') or None,
                section=data.get('section') or None
            )
            db.session.add(new_user)
            db.session.commit()
            return jsonify({"newUser": new_user.to_dict(), "newNotification": {}}), 201
        
        # --- (All other routes for PUT, DELETE, etc. would follow this pattern) ---

        @app.route('/api/reports/generate', methods=['POST'])
        def generate_report():
            if not os.getenv("API_KEY"):
                abort(500, "The Gemini API key is not configured on the server.")
            
            data = request.get_json()
            # The full prompt and Gemini API call logic from previous versions goes here
            prompt = f"Analyze the following data... Inventory: {json.dumps(data.get('items'))} ..."
            try:
                model = genai.GenerativeModel('gemini-2.5-flash')
                response = model.generate_content(prompt, generation_config={"response_mime_type": "application/json"})
                return jsonify(json.loads(response.text))
            except Exception as e:
                print(f"Gemini API Error: {e}")
                abort(500, "Failed to generate report from AI service.")
        
        # --- (This is a truncated example. A full implementation would have all ~20 routes) ---
        # Add routes for editItem, deleteItem, approveUser, denyUser, borrow, return, etc.
        # Each one will use db.session.get(), db.session.add(), db.session.delete(), and db.session.commit()
        # and return jsonify(model_instance.to_dict())

    # --- CLI Commands ---
    @app.cli.command("init-db")
    def init_db_command():
        """Creates the database tables and a default admin user."""
        db.create_all()
        if not User.query.filter_by(username='admin').first():
            admin_user = User(
                username='admin',
                full_name='Admin User',
                email='admin@olilab.app',
                password_hash=bcrypt.generate_password_hash('password').decode('utf-8'),
                role=UserRoleEnum.Admin,
                is_admin=True,
                status=UserStatusEnum.APPROVED
            )
            db.session.add(admin_user)
            db.session.commit()
            print('Initialized the database and created the default admin user.')
        else:
            print('Admin user already exists.')

    return app

# --- Main Execution ---
if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, host='0.0.0.0')