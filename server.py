# from flask import Flask
# from flask_cors import CORS
# from api.upload import upload_bp
# from api.chat import chat_bp

# app = Flask(__name__)
# CORS(app)

# app.register_blueprint(upload_bp, url_prefix="/api/upload")
# app.register_blueprint(chat_bp, url_prefix="/api/chat")

# if __name__ == "__main__":
#     app.run(debug=True, port=5000)


#------------------------------------------------------------------------------------------------
# from flask import Flask
# from flask_cors import CORS
# from api.upload import upload_bp
# from api.chat import chat_bp

# app = Flask(__name__)
# # CORS(app)  # Ensure cross-origin requests are allowed
# CORS(app, resources={r"/*": {"origins": "*"}})


# app.register_blueprint(upload_bp, url_prefix="/api/upload")
# app.register_blueprint(chat_bp, url_prefix="/api/chat")

# @app.route('/')
# def home():
#     return app.send_static_file('index.html')

# app.static_folder = 'public'

# if __name__ == "__main__":
#     app.run(debug=True, port=5000)


#------------------------------------------------------------------------------------------------


# server.py

from flask import Flask, send_from_directory
from flask_cors import CORS
from api.upload import upload_bp
from api.chat import chat_bp
import os

# Set static folder FIRST
STATIC_DIR = os.path.join(os.path.dirname(__file__), 'public')
app = Flask(__name__, static_folder=STATIC_DIR)

# CORS: allow everything for local development
CORS(app, resources={r"/*": {"origins": "*"}})

app.register_blueprint(upload_bp, url_prefix="/api/upload")
app.register_blueprint(chat_bp, url_prefix="/api/chat")

@app.route('/')
def home():
    return app.send_static_file('index.html')

# (Optional) Fallback for SPA to index.html for any 404 not matched to API or files
@app.route('/<path:path>')
def static_proxy(path):
    file_path = os.path.join(app.static_folder, path)
    if os.path.exists(file_path):
        return send_from_directory(app.static_folder, path)
    else:
        return app.send_static_file('index.html')

if __name__ == "__main__":
    app.run(debug=True, port=5000)
