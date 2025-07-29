# from flask import Flask, send_from_directory
# from flask_cors import CORS
# from api.upload import upload_bp
# from api.chat import chat_bp
# import os

# # Set static folder FIRST
# STATIC_DIR = os.path.join(os.path.dirname(__file__), 'public')
# app = Flask(__name__, static_folder=STATIC_DIR)

# # CORS: allow everything for local development
# CORS(app, resources={r"/*": {"origins": "*"}})

# app.register_blueprint(upload_bp, url_prefix="/api/upload")
# app.register_blueprint(chat_bp, url_prefix="/api/chat")

# @app.route('/')
# def home():
#     return app.send_static_file('index.html')

# if __name__ == "__main__":
#     app.run(debug=True, port=5000)



#------------------------------------------------------------------------------------------------



from flask import Flask, send_from_directory
from flask_cors import CORS
import os

from api.upload import upload_bp
from api.chat import chat_bp

def create_app():
    # Set static_folder='public' to serve frontend static files
    app = Flask(__name__, static_folder='public', static_url_path='')

    # Enable CORS only during development (optional)
    if os.getenv("FLASK_ENV", "production") != "production":
        CORS(app)

    # Register API Blueprints with '/api/upload' and '/api/chat' prefixes
    app.register_blueprint(upload_bp, url_prefix='/api/upload')
    app.register_blueprint(chat_bp, url_prefix='/api/chat')

    # Serve the frontend index.html on root
    @app.route('/')
    def serve_index():
        return app.send_static_file('index.html')

    # Serve other frontend static files (JS, CSS, images, etc.)
    @app.route('/<path:path>')
    def serve_static(path):
        return send_from_directory(app.static_folder, path)

    return app

app = create_app()

if __name__ == '__main__':
    port = int(os.getenv("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
