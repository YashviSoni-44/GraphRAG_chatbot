# from flask import Blueprint, request, jsonify
# import os
# import pdfplumber
# import pandas as pd
# import docx
# from neo4j import GraphDatabase, basic_auth
# from dotenv import load_dotenv
# import nltk
# from nltk.tokenize import sent_tokenize
# from werkzeug.utils import secure_filename

# nltk.download("punkt")
# load_dotenv()

# upload_bp = Blueprint("upload", __name__)

# UPLOAD_FOLDER = os.path.join(os.getcwd(), "uploads")
# os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# # Neo4j credentials
# NEO4J_URI = os.getenv("NEO4J_URI")
# NEO4J_USER = os.getenv("NEO4J_USER")
# NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")

# ALLOWED_EXTENSIONS = {"pdf", "docx", "txt", "csv", "xlsx"}

# def allowed_file(filename):
#     return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# def extract_text(file_path, filename):
#     ext = filename.split(".")[-1].lower()
#     try:
#         if ext == "pdf":
#             with pdfplumber.open(file_path) as pdf:
#                 texts = [page.extract_text() for page in pdf.pages if page.extract_text()]
#                 return "\n".join(texts)
#         elif ext == "docx":
#             doc = docx.Document(file_path)
#             return "\n".join([para.text for para in doc.paragraphs if para.text.strip()])
#         elif ext == "txt":
#             with open(file_path, "r", encoding="utf-8") as f:
#                 return f.read()
#         elif ext == "csv":
#             df = pd.read_csv(file_path)
#             return df.to_string(index=False)
#         elif ext == "xlsx":
#             df = pd.read_excel(file_path)
#             return df.to_string(index=False)
#     except Exception as e:
#         print(f"Error extracting text: {e}")
#     return ""

# def create_graph_for_file(session, filename, text):
#     sentences = sent_tokenize(text)
#     # Create (or merge) the File node
#     session.run("MERGE (f:File {name: $filename})", {"filename": filename})

#     for idx, sentence in enumerate(sentences):
#         sentence_id = f"{filename}_{idx}"
#         # Merge each Sentence node by unique id
#         session.run(
#             """
#             MERGE (s:Sentence {id: $id})
#             SET s.text = $text
#             """,
#             {"id": sentence_id, "text": sentence}
#         )
#         # Create relationship File -[:CONTAINS]-> Sentence
#         session.run(
#             """
#             MATCH (f:File {name: $filename}), (s:Sentence {id: $id})
#             MERGE (f)-[:CONTAINS]->(s)
#             """,
#             {"filename": filename, "id": sentence_id}
#         )
#         # Link sentences in sequence for this file
#         if idx > 0:
#             prev_id = f"{filename}_{idx - 1}"
#             session.run(
#                 """
#                 MATCH (a:Sentence {id: $prev_id}), (b:Sentence {id: $curr_id})
#                 MERGE (a)-[:NEXT]->(b)
#                 """,
#                 {"prev_id": prev_id, "curr_id": sentence_id}
#             )

# @upload_bp.route("", methods=["POST"])
# def upload_file():
#     files = request.files.getlist('file[]')
#     if not files or files == [None]:
#         # Fallback for single file upload key
#         if "file" in request.files:
#             files = [request.files["file"]]
#         else:
#             return jsonify({"error": "No files uploaded"}), 400

#     uploaded_files = []
#     errors = []

#     driver = GraphDatabase.driver(NEO4J_URI, auth=basic_auth(NEO4J_USER, NEO4J_PASSWORD))
#     with driver.session() as session:
#         for file in files:
#             filename = secure_filename(file.filename)
#             if not allowed_file(filename):
#                 errors.append(f"{filename}: invalid file type")
#                 continue
#             file_path = os.path.join(UPLOAD_FOLDER, filename)
#             file.save(file_path)
#             text = extract_text(file_path, filename)
#             if not text.strip():
#                 errors.append(f"{filename}: empty or unreadable")
#                 continue
#             try:
#                 create_graph_for_file(session, filename, text)
#                 uploaded_files.append(filename)
#             except Exception as e:
#                 errors.append(f"{filename}: graph creation error: {str(e)}")

#     driver.close()

#     if not uploaded_files:
#         return jsonify({"error": "No valid files were uploaded."}), 400

#     msg = f"Files uploaded ({', '.join(uploaded_files)}) and graph updated."
#     response = {"message": msg}

#     if errors:
#         response["errors"] = errors

#     return jsonify(response), 200


#-------------------------------------------------------------------------------------------------
# from flask import Blueprint, request, jsonify
# import os
# import pdfplumber
# import pandas as pd
# import docx
# from neo4j import GraphDatabase, basic_auth
# from dotenv import load_dotenv
# import nltk
# from nltk.tokenize import sent_tokenize
# from werkzeug.utils import secure_filename

# nltk.download("punkt")
# load_dotenv()

# upload_bp = Blueprint("upload", __name__)

# UPLOAD_FOLDER = os.path.join(os.getcwd(), "uploads")
# os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# NEO4J_URI = os.getenv("NEO4J_URI")
# NEO4J_USER = os.getenv("NEO4J_USER")
# NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")

# ALLOWED_EXTENSIONS = {"pdf", "docx", "txt", "csv", "xlsx"}

# def allowed_file(filename):
#     return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# def extract_text(file_path, filename):
#     ext = filename.split(".")[-1].lower()
#     try:
#         if ext == "pdf":
#             with pdfplumber.open(file_path) as pdf:
#                 texts = [page.extract_text() for page in pdf.pages if page.extract_text()]
#                 return "\n".join(texts)
#         elif ext == "docx":
#             doc = docx.Document(file_path)
#             return "\n".join([para.text for para in doc.paragraphs if para.text.strip()])
#         elif ext == "txt":
#             with open(file_path, "r", encoding="utf-8") as f:
#                 return f.read()
#         elif ext == "csv":
#             df = pd.read_csv(file_path)
#             return df.to_string(index=False)
#         elif ext == "xlsx":
#             df = pd.read_excel(file_path)
#             return df.to_string(index=False)
#     except Exception as e:
#         print(f"Error extracting text from {filename}: {e}")
#     return ""

# def create_graph_for_file(session, filename, text):
#     sentences = sent_tokenize(text)
#     # Create or merge File node
#     session.run("MERGE (f:File {name: $filename})", {"filename": filename})
#     # Create or merge ChatSession node for the file
#     session.run("""
#         MERGE (cs:ChatSession {file_name: $filename})
#         WITH cs
#         MATCH (f:File {name: $filename})
#         MERGE (f)-[:HAS_CHAT_SESSION]->(cs)
#     """, {"filename": filename})

#     for idx, sentence in enumerate(sentences):
#         sentence_id = f"{filename}_{idx}"
#         session.run("""
#             MERGE (s:Sentence {id: $id})
#             SET s.text = $text
#         """, {"id": sentence_id, "text": sentence})
#         session.run("""
#             MATCH (f:File {name: $filename}), (s:Sentence {id: $id})
#             MERGE (f)-[:CONTAINS]->(s)
#         """, {"filename": filename, "id": sentence_id})
#         if idx > 0:
#             prev_id = f"{filename}_{idx - 1}"
#             session.run("""
#                 MATCH (a:Sentence {id: $prev_id}), (b:Sentence {id: $curr_id})
#                 MERGE (a)-[:NEXT]->(b)
#             """, {"prev_id": prev_id, "curr_id": sentence_id})

# @upload_bp.route("", methods=["POST"])
# def upload_file():
#     files = request.files.getlist('file[]')
#     if not files or files == [None]:
#         if "file" in request.files:
#             files = [request.files["file"]]
#         else:
#             return jsonify({"error": "No files uploaded"}), 400

#     uploaded_files = []
#     errors = []

#     driver = GraphDatabase.driver(NEO4J_URI, auth=basic_auth(NEO4J_USER, NEO4J_PASSWORD))
#     with driver.session() as session:
#         for file in files:
#             filename = secure_filename(file.filename)
#             if not allowed_file(filename):
#                 errors.append(f"{filename}: invalid file type")
#                 continue
#             file_path = os.path.join(UPLOAD_FOLDER, filename)
#             file.save(file_path)
#             text = extract_text(file_path, filename)
#             if not text.strip():
#                 errors.append(f"{filename}: empty or unreadable")
#                 continue
#             try:
#                 create_graph_for_file(session, filename, text)
#                 uploaded_files.append(filename)
#             except Exception as e:
#                 errors.append(f"{filename}: graph creation error: {str(e)}")

#     driver.close()

#     if not uploaded_files:
#         return jsonify({"error": "No valid files were uploaded."}), 400

#     response = {"message": f"Files uploaded ({', '.join(uploaded_files)}) and graph updated."}
#     if errors:
#         response["errors"] = errors
#     return jsonify(response), 200


# -------------------------------------------------------------------------------------------------


from flask import Blueprint, request, jsonify
import os
import pdfplumber
import pandas as pd
import docx
from neo4j import GraphDatabase, basic_auth
from dotenv import load_dotenv
import nltk
from nltk.tokenize import sent_tokenize

nltk.download("punkt")
load_dotenv()

upload_bp = Blueprint("upload", __name__)

BASE_UPLOAD_FOLDER = os.path.join(os.getcwd(), "uploads")
os.makedirs(BASE_UPLOAD_FOLDER, exist_ok=True)

NEO4J_URI = os.getenv("NEO4J_URI")
NEO4J_USER = os.getenv("NEO4J_USER")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")

ALLOWED_EXTENSIONS = {"pdf", "docx", "txt", "csv", "xlsx"}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def extract_text(file_path, filename):
    ext = filename.split(".")[-1].lower()
    try:
        if ext == "pdf":
            with pdfplumber.open(file_path) as pdf:
                texts = [page.extract_text() for page in pdf.pages if page.extract_text()]
                text = "\n".join(texts)
        elif ext == "docx":
            doc = docx.Document(file_path)
            text = "\n".join([para.text for para in doc.paragraphs if para.text.strip()])
        elif ext == "txt":
            with open(file_path, "r", encoding="utf-8") as f:
                text = f.read()
        elif ext == "csv":
            df = pd.read_csv(file_path)
            text = df.to_string(index=False)
        elif ext == "xlsx":
            df = pd.read_excel(file_path)
            text = df.to_string(index=False)
        else:
            text = ""
    except Exception as e:
        print(f"Error extracting text from {filename}: {e}")
        return "", f"extractor_error: {str(e)}"
    return text, None

def create_graph_for_file(session, filename, text):
    sentences = sent_tokenize(text)
    if not sentences: return 0
    session.run("MERGE (f:File {name: $filename})", {"filename": filename})
    session.run("""
        MERGE (cs:ChatSession {file_name: $filename})
        WITH cs
        MATCH (f:File {name: $filename})
        MERGE (f)-[:HAS_CHAT_SESSION]->(cs)
    """, {"filename": filename})
    for idx, sentence in enumerate(sentences):
        sentence_id = f"{filename}_{idx}"
        session.run("""
            MERGE (s:Sentence {id: $id})
            ON CREATE SET s.text = $text
        """, {"id": sentence_id, "text": sentence})
        session.run("""
            MATCH (f:File {name: $filename}), (s:Sentence {id: $id})
            MERGE (f)-[:CONTAINS]->(s)
        """, {"filename": filename, "id": sentence_id})
        if idx > 0:
            prev_id = f"{filename}_{idx - 1}"
            session.run("""
                MATCH (a:Sentence {id: $prev_id}), (b:Sentence {id: $curr_id})
                MERGE (a)-[:NEXT]->(b)
            """, {"prev_id": prev_id, "curr_id": sentence_id})
    return len(sentences)

@upload_bp.route("", methods=["POST"])
def upload_file():
    # support both folder and file browser uploads
    files = request.files.getlist('file[]')
    if not files or files == [None]:
        if "file" in request.files:
            files = [request.files["file"]]
        else:
            return jsonify({"error": "No files uploaded"}), 400

    uploaded_files = []
    errors = []

    driver = GraphDatabase.driver(NEO4J_URI, auth=basic_auth(NEO4J_USER, NEO4J_PASSWORD))
    with driver.session() as session:
        for file in files:
            # To preserve folder structure from folder upload, use file.filename as path
            rel_path = file.filename.replace("\\", "/")  # Always forward-slash (browser)
            if not allowed_file(rel_path):
                errors.append(f"{rel_path}: invalid file type")
                continue
            save_path = os.path.join(BASE_UPLOAD_FOLDER, rel_path)
            save_dir = os.path.dirname(save_path)
            if not os.path.exists(save_dir):
                os.makedirs(save_dir, exist_ok=True)
            try:
                file.save(save_path)
            except Exception as e:
                errors.append(f"{rel_path}: failed to save ({e})")
                continue
            text, err = extract_text(save_path, rel_path)
            if err:
                errors.append(f"{rel_path}: {err}")
                continue
            if not text.strip():
                errors.append(f"{rel_path}: empty or unreadable")
                continue
            try:
                count = create_graph_for_file(session, rel_path, text)
                if count == 0:
                    errors.append(f"{rel_path}: no sentences could be parsed from extracted text")
                    continue
                uploaded_files.append(rel_path)
            except Exception as e:
                errors.append(f"{rel_path}: graph creation error: {str(e)}")
    driver.close()

    if not uploaded_files:
        return jsonify({"error": "No valid files were uploaded.", "errors": errors}), 400

    response = {"message": f"Files uploaded ({', '.join(uploaded_files)}) and graph updated.", "success": uploaded_files}
    if errors:
        response["errors"] = errors
    return jsonify(response), 200


from flask import current_app

@upload_bp.route("/files", methods=["GET"])
def list_uploaded_files():
    driver = GraphDatabase.driver(NEO4J_URI, auth=basic_auth(NEO4J_USER, NEO4J_PASSWORD))
    files = []
    try:
        with driver.session() as session:
            result = session.run("MATCH (f:File) RETURN f.name AS name ORDER BY name")
            files = [record["name"] for record in result]
    except Exception as e:
        current_app.logger.error(f"Failed to fetch files list: {e}")
        return jsonify({"error": "Failed to fetch files list"}), 500
    finally:
        driver.close()
    return jsonify({"files": files})
