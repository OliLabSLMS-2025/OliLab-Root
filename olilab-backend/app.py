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
from sqlalchemy.exc import IntegrityError

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
    lrn = db.Column(db.String(12), unique=True, nullable=True)
    grade_level = db.Column(db.String(50), nullable=True)
    section = db.Column(db.String(50), nullable=True)
    role = db.Column(db.Enum(UserRoleEnum), nullable=False, default=UserRoleEnum.Member)
    is_admin = db.Column(db.Boolean, nullable=False, default=False)
    status = db.Column(db.Enum(UserStatusEnum), nullable=False, default=UserStatusEnum.PENDING)
    created_at = db.Column(db.DateTime(timezone=True), server_default=db.func.now())

    def to_dict(self, exclude_password=True):
        d = {c.name: getattr(self, c.name) for c in self.__table__.columns}
        if exclude_password:
            d.pop('password_hash', None)
        for key, value in d.items():
            if isinstance(value, enum.Enum): d[key] = value.value
            if isinstance(value, uuid.UUID): d[key] = str(value)
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
        if isinstance(d['id'], uuid.UUID): d['id'] = str(d['id'])
        return {
            'id': d['id'], 'name': d['name'], 'category': d['category'],
            'totalQuantity': d['total_quantity'], 'availableQuantity': d['available_quantity']
        }

class Log(db.Model):
    __tablename__ = 'logs'
    id = db.Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = db.Column(PG_UUID(as_uuid=True), db.ForeignKey('users.id'), nullable=False)
    item_id = db.Column(PG_UUID(as_uuid=True), db.ForeignKey('items.id'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    timestamp = db.Column(db.DateTime(timezone=True), server_default=db.func.now())
    action = db.Column(db.Enum(LogActionEnum), nullable=False)
    status = db.Column(db.Enum(LogStatusEnum), nullable=True)
    admin_notes = db.Column(db.Text, nullable=True)
    related_log_id = db.Column(PG_UUID(as_uuid=True), nullable=True)
    return_requested = db.Column(db.Boolean, default=False)
    
    def to_dict(self):
        d = {c.name: getattr(self, c.name) for c in self.__table__.columns}
        for key, value in d.items():
            if isinstance(value, enum.Enum): d[key] = value.value
            if isinstance(value, uuid.UUID): d[key] = str(value)
        # Ensure timestamp is always serialized correctly
        if 'timestamp' in d and hasattr(d['timestamp'], 'isoformat'):
            d['timestamp'] = d['timestamp'].isoformat()
        return {
            'id': d['id'], 'userId': d['user_id'], 'itemId': d['item_id'], 'quantity': d['quantity'],
            'timestamp': d['timestamp'], 'action': d['action'], 'status': d['status'],
            'adminNotes': d['admin_notes'], 'relatedLogId': d['related_log_id'], 'returnRequested': d['return_requested']
        }

class Suggestion(db.Model):
    __tablename__ = 'suggestions'
    id = db.Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = db.Column(PG_UUID(as_uuid=True), db.ForeignKey('users.id'), nullable=False)
    type = db.Column(db.Enum(SuggestionTypeEnum), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(100), nullable=True)
    status = db.Column(db.Enum(SuggestionStatusEnum), nullable=False, default=SuggestionStatusEnum.PENDING)
    timestamp = db.Column(db.DateTime(timezone=True), server_default=db.func.now())

    def to_dict(self):
        d = {c.name: getattr(self, c.name) for c in self.__table__.columns}
        for key, value in d.items():
            if isinstance(value, enum.Enum): d[key] = value.value
            if isinstance(value, uuid.UUID): d[key] = str(value)
        if hasattr(d['timestamp'], 'isoformat'):
            d['timestamp'] = d['timestamp'].isoformat()
        return {
            'id': d['id'], 'userId': d['user_id'], 'type': d['type'], 'title': d['title'],
            'description': d['description'], 'category': d['category'], 'status': d['status'],
            'timestamp': d['timestamp']
        }

class Comment(db.Model):
    __tablename__ = 'comments'
    id = db.Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = db.Column(PG_UUID(as_uuid=True), db.ForeignKey('users.id'), nullable=False)
    suggestion_id = db.Column(PG_UUID(as_uuid=True), db.ForeignKey('suggestions.id'), nullable=False)
    text = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime(timezone=True), server_default=db.func.now())
    
    def to_dict(self):
        d = {c.name: getattr(self, c.name) for c in self.__table__.columns}
        for key, value in d.items():
            if isinstance(value, uuid.UUID): d[key] = str(value)
        if hasattr(d['timestamp'], 'isoformat'):
            d['timestamp'] = d['timestamp'].isoformat()
        return {
            'id': d['id'], 'userId': d['user_id'], 'suggestionId': d['suggestion_id'],
            'text': d['text'], 'timestamp': d['timestamp']
        }
        
def create_mock_notification(message, type, related_id=None):
    """Helper to create a notification-like dictionary for the frontend."""
    return {
        "id": str(uuid.uuid4()),
        "message": message,
        "type": type,
        "read": False,
        "timestamp": db.func.now().isoformat(),
        "relatedLogId": related_id
    }

# --- Application Factory ---
def create_app():
    app = Flask(__name__)
    CORS(app, resources={r"/api/*": {"origins": "*"}}) # Allow all origins for simplicity

    # Configure database
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    db.init_app(app)
    bcrypt.init_app(app)
    
    # Configure Gemini API
    try:
        api_key = os.getenv("API_KEY")
        if not api_key:
            print("Warning: API_KEY environment variable not found. AI features will be disabled.")
        else:
            genai.configure(api_key=api_key)
    except Exception as e:
        print(f"Error configuring Gemini API: {e}")

    with app.app_context():
        # --- Error Handlers ---
        @app.errorhandler(400)
        def bad_request(error): return jsonify({"message": error.description or "Bad request"}), 400
        @app.errorhandler(401)
        def unauthorized(error): return jsonify({"message": error.description or "Unauthorized"}), 401
        @app.errorhandler(403)
        def forbidden(error): return jsonify({"message": error.description or "Forbidden"}), 403
        @app.errorhandler(404)
        def not_found(error): return jsonify({"message": "Resource not found"}), 404
        @app.errorhandler(409)
        def conflict(error): return jsonify({"message": error.description or "Conflict"}), 409
        @app.errorhandler(500)
        def internal_server_error(error):
            db.session.rollback()
            return jsonify({"message": "An unexpected server error occurred."}), 500

        # --- API Routes ---
        
        @app.route('/api/auth/login', methods=['POST'])
        def login():
            data = request.get_json()
            if not data: abort(400, "Missing request body.")
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
                abort(403, "Your account has not been approved by an administrator.")
                
            return jsonify(user.to_dict())

        @app.route('/api/data', methods=['GET'])
        def get_initial_data():
            """Fetch all initial data for the application state."""
            state = {
                "items": [i.to_dict() for i in Item.query.order_by(Item.name).all()],
                "users": [u.to_dict() for u in User.query.order_by(User.full_name).all()],
                "logs": [l.to_dict() for l in Log.query.order_by(Log.timestamp.desc()).all()],
                "suggestions": [s.to_dict() for s in Suggestion.query.order_by(Suggestion.timestamp.desc()).all()],
                "comments": [c.to_dict() for c in Comment.query.order_by(Comment.timestamp.asc()).all()],
                "notifications": [] # Notifications are transient and generated on-the-fly
            }
            return jsonify(state)
            
        # --- Items Routes ---
        @app.route('/api/items', methods=['POST'])
        def add_item():
            data = request.get_json()
            new_item = Item(
                name=data['name'], 
                category=data['category'],
                total_quantity=int(data['totalQuantity']),
                available_quantity=int(data['totalQuantity'])
            )
            db.session.add(new_item)
            db.session.commit()
            return jsonify(new_item.to_dict()), 201
            
        @app.route('/api/items/<uuid:item_id>', methods=['PUT'])
        def edit_item(item_id):
            item = db.session.get(Item, item_id)
            if not item: abort(404)
            data = request.get_json()
            
            borrowed_count = item.total_quantity - item.available_quantity
            if data['totalQuantity'] < borrowed_count:
                abort(400, f"Total quantity cannot be less than the amount currently borrowed ({borrowed_count}).")

            item.name = data['name']
            item.category = data['category']
            item.total_quantity = data['totalQuantity']
            item.available_quantity = data['totalQuantity'] - borrowed_count
            db.session.commit()
            return jsonify(item.to_dict())

        @app.route('/api/items/<uuid:item_id>', methods=['DELETE'])
        def delete_item(item_id):
            item = db.session.get(Item, item_id)
            if not item: abort(404)
            # Prevent deletion if items are currently on loan
            if item.available_quantity < item.total_quantity:
                abort(409, "Cannot delete item with outstanding loans.")
            db.session.delete(item)
            db.session.commit()
            return jsonify({"id": str(item_id)})
            
        @app.route('/api/items/import', methods=['POST'])
        def import_items():
            items_data = request.get_json()
            new_items = []
            for item_data in items_data:
                new_item = Item(
                    name=item_data['name'],
                    category=item_data['category'],
                    total_quantity=item_data['totalQuantity'],
                    available_quantity=item_data['totalQuantity']
                )
                new_items.append(new_item)
            db.session.add_all(new_items)
            db.session.commit()
            return jsonify([item.to_dict() for item in new_items]), 201

        # --- Users Routes ---
        @app.route('/api/users', methods=['POST'])
        def create_user():
            data = request.get_json()
            # Check for uniqueness constraints
            if User.query.filter(db.func.lower(User.username) == data['username'].lower()).first():
                abort(409, "Username is already taken.")
            if User.query.filter(db.func.lower(User.email) == data['email'].lower()).first():
                abort(409, "Email is already registered.")
            if data.get('lrn') and User.query.filter_by(lrn=data['lrn']).first():
                abort(409, "LRN is already registered.")
            
            new_user = User(
                username=data['username'],
                full_name=data['fullName'],
                email=data['email'],
                password_hash=bcrypt.generate_password_hash(data['password']).decode('utf-8'),
                lrn=data.get('lrn') or None,
                grade_level=data.get('gradeLevel') or None,
                section=data.get('section') or None,
                is_admin=False, # Ensure new signups are not admins
                role=UserRoleEnum.Member
            )
            db.session.add(new_user)
            db.session.commit()
            
            notification = create_mock_notification(f"New user '{new_user.full_name}' requires approval.", 'new_user')
            return jsonify({"newUser": new_user.to_dict(), "newNotification": notification}), 201
            
        @app.route('/api/users/<uuid:user_id>', methods=['PUT'])
        def edit_user(user_id):
            user = db.session.get(User, user_id)
            if not user: abort(404)
            data = request.get_json()
            
            user.full_name = data['fullName']
            user.username = data['username']
            # Only admin can change role/admin status
            if data.get('isAdmin'):
                 user.is_admin = data['isAdmin']
                 user.role = UserRoleEnum.Admin if data['isAdmin'] else UserRoleEnum.Member
            user.lrn = data.get('lrn') or None
            user.grade_level = data.get('gradeLevel') or None
            user.section = data.get('section') or None
            
            db.session.commit()
            return jsonify(user.to_dict())

        @app.route('/api/users/<uuid:user_id>', methods=['DELETE'])
        def delete_user(user_id):
            user = db.session.get(User, user_id)
            if not user: abort(404)
            # Add checks to prevent deletion if user has loans or is last admin
            has_loans = Log.query.filter_by(user_id=user_id, status=LogStatusEnum.APPROVED).first()
            if has_loans:
                abort(409, "Cannot delete user with outstanding loans.")
            if user.is_admin:
                admin_count = User.query.filter_by(is_admin=True).count()
                if admin_count <= 1:
                    abort(409, "Cannot delete the last admin account.")
            
            db.session.delete(user)
            db.session.commit()
            return jsonify({"id": str(user_id)})

        @app.route('/api/users/<uuid:user_id>/approve', methods=['POST'])
        def approve_user(user_id):
            user = db.session.get(User, user_id)
            if not user: abort(404)
            user.status = UserStatusEnum.APPROVED
            db.session.commit()
            return jsonify(user.to_dict())

        @app.route('/api/users/<uuid:user_id>/deny', methods=['POST'])
        def deny_user(user_id):
            user = db.session.get(User, user_id)
            if not user: abort(404)
            user.status = UserStatusEnum.DENIED
            db.session.commit()
            return jsonify(user.to_dict())
            
        # --- Logs Routes ---
        @app.route('/api/logs/borrow', methods=['POST'])
        def request_borrow():
            data = request.get_json()
            item = db.session.get(Item, uuid.UUID(data['itemId']))
            if not item: abort(404)
            if item.available_quantity < data['quantity']:
                abort(400, "Not enough items available to borrow.")
                
            new_log = Log(
                user_id=uuid.UUID(data['userId']),
                item_id=item.id,
                quantity=data['quantity'],
                action=LogActionEnum.BORROW,
                status=LogStatusEnum.PENDING
            )
            db.session.add(new_log)
            db.session.commit()
            
            user = db.session.get(User, new_log.user_id)
            notification = create_mock_notification(f"{user.full_name} requested to borrow {item.name}.", 'new_borrow_request', str(new_log.id))
            return jsonify({"newLog": new_log.to_dict(), "newNotification": notification}), 201
            
        @app.route('/api/logs/<uuid:log_id>/approve', methods=['POST'])
        def approve_borrow(log_id):
            log = db.session.get(Log, log_id)
            if not log or log.status != LogStatusEnum.PENDING: abort(404)
            
            item = db.session.get(Item, log.item_id)
            if item.available_quantity < log.quantity:
                abort(400, "Not enough stock to approve this request.")
                
            item.available_quantity -= log.quantity
            log.status = LogStatusEnum.APPROVED
            db.session.commit()
            return jsonify({"updatedLog": log.to_dict(), "updatedItem": item.to_dict()})

        @app.route('/api/logs/<uuid:log_id>/deny', methods=['POST'])
        def deny_borrow(log_id):
            log = db.session.get(Log, log_id)
            if not log: abort(404)
            data = request.get_json()
            log.status = LogStatusEnum.DENIED
            log.admin_notes = data.get('reason')
            db.session.commit()
            return jsonify(log.to_dict())
            
        @app.route('/api/logs/<uuid:log_id>/request-return', methods=['POST'])
        def request_return(log_id):
            log = db.session.get(Log, log_id)
            if not log: abort(404)
            log.return_requested = True
            db.session.commit()
            
            user = db.session.get(User, log.user_id)
            item = db.session.get(Item, log.item_id)
            notification = create_mock_notification(f"{user.full_name} requested to return {item.name}.", 'return_request', str(log.id))
            return jsonify({"updatedLog": log.to_dict(), "newNotification": notification})

        @app.route('/api/logs/return', methods=['POST'])
        def return_item():
            data = request.get_json()
            borrow_log_id = uuid.UUID(data['borrowLog']['id'])
            borrow_log = db.session.get(Log, borrow_log_id)
            if not borrow_log: abort(404)
            
            item = db.session.get(Item, borrow_log.item_id)
            item.available_quantity += borrow_log.quantity
            
            borrow_log.status = LogStatusEnum.RETURNED
            
            return_log = Log(
                user_id=borrow_log.user_id,
                item_id=borrow_log.item_id,
                quantity=borrow_log.quantity,
                action=LogActionEnum.RETURN,
                status=LogStatusEnum.RETURNED,
                admin_notes=data.get('adminNotes'),
                related_log_id=borrow_log.id
            )
            db.session.add(return_log)
            db.session.commit()
            return jsonify({
                "returnLog": return_log.to_dict(),
                "updatedBorrowLog": borrow_log.to_dict(),
                "updatedItem": item.to_dict()
            })
            
        # --- Suggestions & Comments ---
        @app.route('/api/suggestions', methods=['POST'])
        def add_suggestion():
            data = request.get_json()
            new_suggestion = Suggestion(
                user_id=uuid.UUID(data['userId']),
                type=SuggestionTypeEnum[data['type']],
                title=data['title'],
                description=data['description']
            )
            db.session.add(new_suggestion)
            db.session.commit()
            return jsonify(new_suggestion.to_dict()), 201

        @app.route('/api/suggestions/<uuid:suggestion_id>/approve-item', methods=['POST'])
        def approve_item_suggestion(suggestion_id):
            suggestion = db.session.get(Suggestion, suggestion_id)
            if not suggestion: abort(404)
            data = request.get_json()
            
            suggestion.status = SuggestionStatusEnum.APPROVED
            suggestion.category = data['category']
            
            new_item = Item(
                name=suggestion.title,
                category=data['category'],
                total_quantity=data['totalQuantity'],
                available_quantity=data['totalQuantity']
            )
            db.session.add(new_item)
            db.session.commit()
            return jsonify({"updatedSuggestion": suggestion.to_dict(), "newItem": new_item.to_dict()})

        @app.route('/api/suggestions/<uuid:suggestion_id>/approve-feature', methods=['POST'])
        def approve_feature_suggestion(suggestion_id):
            suggestion = db.session.get(Suggestion, suggestion_id)
            if not suggestion: abort(404)
            suggestion.status = SuggestionStatusEnum.APPROVED
            db.session.commit()
            return jsonify(suggestion.to_dict())

        @app.route('/api/suggestions/<uuid:suggestion_id>/deny', methods=['POST'])
        def deny_suggestion(suggestion_id):
            suggestion = db.session.get(Suggestion, suggestion_id)
            if not suggestion: abort(404)
            data = request.get_json()
            
            suggestion.status = SuggestionStatusEnum.DENIED
            
            new_comment = Comment(
                user_id=uuid.UUID(data['adminId']),
                suggestion_id=suggestion_id,
                text=f"Admin Note: {data['reason']}"
            )
            db.session.add(new_comment)
            db.session.commit()
            return jsonify({"updatedSuggestion": suggestion.to_dict(), "newComment": new_comment.to_dict()})

        @app.route('/api/comments', methods=['POST'])
        def add_comment():
            data = request.get_json()
            new_comment = Comment(
                user_id=uuid.UUID(data['userId']),
                suggestion_id=uuid.UUID(data['suggestionId']),
                text=data['text']
            )
            db.session.add(new_comment)
            db.session.commit()
            return jsonify(new_comment.to_dict()), 201
            
        # --- AI Reports Route ---
        @app.route('/api/reports/generate', methods=['POST'])
        def generate_report():
            if not os.getenv("API_KEY"):
                abort(500, "The Gemini API key is not configured on the server.")
            
            data = request.get_json()
            
            prompt = f"""
            Analyze the provided JSON data for a science laboratory inventory system and generate a status briefing.

            **Instructions:**
            1.  Provide a concise one-paragraph `overview` of the lab's general status.
            2.  Identify `lowStockItems`: items where available quantity is less than 20% of total quantity.
            3.  Summarize the 5 most `recentActivity` logs, including the item name, user's full name, action ('Borrowed' or 'Returned'), and quantity.
            4.  Identify the top 3 `mostActiveItems` based on the number of 'BORROW' actions.
            5.  Write a brief, actionable `conclusion`.

            **Input Data:**
            - Items: {json.dumps(data.get('items'))}
            - Logs: {json.dumps(data.get('logs'))}
            - Users: {json.dumps(data.get('users'))}

            **Output Format:**
            Return ONLY a valid JSON object matching this exact schema:
            {{
              "overview": "string",
              "lowStockItems": [{{ "name": "string", "available": "number", "total": "number" }}],
              "recentActivity": [{{ "itemName": "string", "userName": "string", "action": "string", "quantity": "number" }}],
              "mostActiveItems": [{{ "name": "string", "borrowCount": "number" }}],
              "conclusion": "string"
            }}
            """
            
            try:
                model = genai.GenerativeModel('gemini-2.5-flash')
                response = model.generate_content(
                    prompt, 
                    generation_config={"response_mime_type": "application/json"}
                )
                # The response.text should already be a valid JSON string
                return jsonify(json.loads(response.text))
            except Exception as e:
                print(f"Gemini API Error: {e}")
                abort(500, "Failed to generate report from AI service.")

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