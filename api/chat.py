# from flask import Blueprint, request, jsonify
# from neo4j import GraphDatabase, basic_auth
# from dotenv import load_dotenv
# import requests
# import datetime
# import os

# load_dotenv()

# chat_bp = Blueprint("chat", __name__)

# NEO4J_URI = os.getenv("NEO4J_URI")
# NEO4J_USER = os.getenv("NEO4J_USER")
# NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")
# GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# @chat_bp.route("", methods=["POST"])
# def chat():
#     try:
#         data = request.get_json()
#         messages = data.get("messages", None)
#         file_name = data.get("file_name", None)
#         session_id = data.get("sessionId") or request.headers.get("X-Session-Id")
#         if not session_id:
#             return jsonify({"error": "Missing session ID"}), 400

#         if not messages or not isinstance(messages, list):
#             return jsonify({"error": "Messages array is required"}), 400
#         if not file_name:
#             return jsonify({"error": "file_name is required"}), 400

#         # Compose session specific Neo4j file node key
#         node_file_name = f"{session_id}__{file_name}"

#         driver = GraphDatabase.driver(NEO4J_URI, auth=basic_auth(NEO4J_USER, NEO4J_PASSWORD))
#         with driver.session() as session:
#             exists = session.run("MATCH (f:File {name: $filename, sessionId: $session_id}) RETURN f",
#                                  {"filename": node_file_name, "session_id": session_id})
#             if not exists.peek():
#                 return jsonify({"error": f"File '{file_name}' not found in database for this session."}), 404

#         headers = {
#             "Authorization": f"Bearer {GROQ_API_KEY}",
#             "Content-Type": "application/json"
#         }
#         payload = {
#             "model": "llama3-8b-8192",
#             "messages": messages
#         }
#         response = requests.post(
#             "https://api.groq.com/openai/v1/chat/completions",
#             headers=headers, json=payload
#         )
#         response.raise_for_status()
#         answer = response.json()["choices"][0]["message"]["content"]

#         timestamp = datetime.datetime.utcnow().isoformat()
#         question = next((m["content"] for m in reversed(messages) if m["role"] == "user"), None)
#         if question:
#             q_id = f"{node_file_name}_q_{timestamp}"
#             a_id = f"{node_file_name}_a_{timestamp}"
#             with driver.session() as session:
#                 session.run("""
#                     MERGE (cs:ChatSession {file_name: $filename, sessionId: $session_id})
#                     MERGE (m1:ChatMessage {id: $q_id, sessionId: $session_id})
#                     MERGE (m2:ChatMessage {id: $a_id, sessionId: $session_id})
#                     SET m1.role = 'user', m1.content = $question, m1.timestamp = $time
#                     SET m2.role = 'assistant', m2.content = $answer, m2.timestamp = $time
#                     WITH cs, m1, m2
#                     MERGE (cs)-[:HAS_MESSAGE]->(m1)
#                     MERGE (cs)-[:HAS_MESSAGE]->(m2)
#                 """, {
#                     "filename": node_file_name,
#                     "session_id": session_id,
#                     "q_id": q_id,
#                     "a_id": a_id,
#                     "question": question,
#                     "answer": answer,
#                     "time": timestamp
#                 })

#         driver.close()
#         return jsonify({"answer": answer})

#     except Exception as e:
#         return jsonify({"error": f"❌ Groq API or Neo4j Error: {str(e)}"}), 500

# @chat_bp.route("/history", methods=["GET"])
# def get_chat_history():
#     file_name = request.args.get("file_name")
#     session_id = request.headers.get("X-Session-Id") or request.args.get("sessionId")
#     if not file_name or not session_id:
#         return jsonify({"error": "file_name and sessionId parameters are required"}), 400
#     node_file_name = f"{session_id}__{file_name}"

#     try:
#         driver = GraphDatabase.driver(NEO4J_URI, auth=basic_auth(NEO4J_USER, NEO4J_PASSWORD))
#         with driver.session() as session:
#             result = session.run("""
#                 MATCH (cs:ChatSession {file_name: $filename, sessionId: $session_id})-[:HAS_MESSAGE]->(m:ChatMessage {sessionId: $session_id})
#                 RETURN m.role AS role, m.content AS content, m.timestamp AS timestamp
#                 ORDER BY m.timestamp
#             """, {"filename": node_file_name, "session_id": session_id})
#             history = [{"role": record["role"], "content": record["content"]} for record in result]
#         driver.close()
#         return jsonify({"history": history})
#     except Exception as e:
#         return jsonify({"error": f"Neo4j error fetching history: {str(e)}"}), 500

# @chat_bp.route("/context", methods=["GET"])
# def get_context():
#     file_name = request.args.get("file_name")
#     session_id = request.headers.get("X-Session-Id") or request.args.get("sessionId")
#     if not file_name or not session_id:
#         return jsonify({"error": "file_name and sessionId parameters are required"}), 400
#     node_file_name = f"{session_id}__{file_name}"

#     try:
#         driver = GraphDatabase.driver(NEO4J_URI, auth=basic_auth(NEO4J_USER, NEO4J_PASSWORD))
#         with driver.session() as session:
#             result = session.run("""
#                 MATCH (f:File {name: $filename, sessionId: $session_id})-[:CONTAINS]->(s:Sentence {sessionId: $session_id})
#                 RETURN s.text AS text
#                 ORDER BY s.id
#                 LIMIT 20
#             """, {"filename": node_file_name, "session_id": session_id})
#             sentences = [record["text"] for record in result]
#             context = "\n".join(sentences)
#         driver.close()
#         return jsonify({"context": context})
#     except Exception as e:
#         return jsonify({"error": f"Neo4j error fetching context: {str(e)}"}), 500

# @chat_bp.route("/clear", methods=["POST"])
# def clear_chat_history():
#     data = request.get_json()
#     file_name = data.get("file_name")
#     session_id = data.get("sessionId") or request.headers.get("X-Session-Id")
#     if not file_name or not session_id:
#         return jsonify({"error": "file_name and sessionId are required"}), 400

#     node_file_name = f"{session_id}__{file_name}"

#     driver = GraphDatabase.driver(NEO4J_URI, auth=basic_auth(NEO4J_USER, NEO4J_PASSWORD))
#     try:
#         with driver.session() as session:
#             session.run("""
#                 MATCH (cs:ChatSession {file_name: $filename, sessionId: $session_id})-[:HAS_MESSAGE]->(m:ChatMessage {sessionId: $session_id})
#                 DETACH DELETE m
#             """, {"filename": node_file_name, "session_id": session_id})
#             session.run("""
#                 MATCH (cs:ChatSession {file_name: $filename, sessionId: $session_id})
#                 DETACH DELETE cs
#             """, {"filename": node_file_name, "session_id": session_id})
#         driver.close()
#         return jsonify({"message": f"Cleared chat history for '{file_name}'."})
#     except Exception as e:
#         driver.close()
#         return jsonify({"error": f"Failed to clear chat history: {str(e)}"}), 500




#--------------------------------------------------------------------------------------------





from flask import Blueprint, request, jsonify
from neo4j import GraphDatabase, basic_auth
from dotenv import load_dotenv
import requests
import datetime
import os

load_dotenv()

chat_bp = Blueprint("chat", __name__)

NEO4J_URI = os.getenv("NEO4J_URI")
NEO4J_USER = os.getenv("NEO4J_USER")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

def is_folder_name(name):
    # Simple heuristic: no file extension
    return not ('.' in name and len(name.rsplit('.',1)[-1]) <= 5)

@chat_bp.route("", methods=["POST"])
def chat():
    try:
        data = request.get_json()
        messages = data.get("messages", None)
        file_name = data.get("file_name", None)
        session_id = data.get("sessionId") or request.headers.get("X-Session-Id")
        if not session_id:
            return jsonify({"error": "Missing session ID"}), 400

        if not messages or not isinstance(messages, list):
            return jsonify({"error": "Messages array is required"}), 400
        if not file_name:
            return jsonify({"error": "file_name is required"}), 400

        driver = GraphDatabase.driver(NEO4J_URI, auth=basic_auth(NEO4J_USER, NEO4J_PASSWORD))
        with driver.session() as session:

            if is_folder_name(file_name):
                # Folder chat, ensure folder exists (any file under folder?)
                # Existence check: any File node whose name starts with sessionId__folder_path/
                prefix = f"{session_id}__{file_name}/"
                exists = session.run("""
                    MATCH (f:File)
                    WHERE f.sessionId = $session_id AND f.name STARTS WITH $prefix
                    RETURN f LIMIT 1
                """, {"session_id": session_id, "prefix": prefix})
                if not exists.peek():
                    return jsonify({"error": f"Folder '{file_name}' not found in database for this session."}), 404

                # Prepare chat session node name for folder chat
                session_key = f"{session_id}__folder__{file_name}"

            else:
                # Single file chat
                node_file_name = f"{session_id}__{file_name}"
                exists = session.run("MATCH (f:File {name: $filename, sessionId: $session_id}) RETURN f",
                                     {"filename": node_file_name, "session_id": session_id})
                if not exists.peek():
                    return jsonify({"error": f"File '{file_name}' not found in database for this session."}), 404
                session_key = node_file_name

        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "llama3-8b-8192",
            "messages": messages
        }
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers=headers, json=payload
        )
        response.raise_for_status()
        answer = response.json()["choices"][0]["message"]["content"]

        timestamp = datetime.datetime.utcnow().isoformat()
        question = next((m["content"] for m in reversed(messages) if m["role"] == "user"), None)
        if question:
            q_id = f"{session_key}_q_{timestamp}"
            a_id = f"{session_key}_a_{timestamp}"
            with driver.session() as session:
                session.run("""
                    MERGE (cs:ChatSession {file_name: $filename, sessionId: $session_id})
                    MERGE (m1:ChatMessage {id: $q_id, sessionId: $session_id})
                    MERGE (m2:ChatMessage {id: $a_id, sessionId: $session_id})
                    SET m1.role = 'user', m1.content = $question, m1.timestamp = $time
                    SET m2.role = 'assistant', m2.content = $answer, m2.timestamp = $time
                    WITH cs, m1, m2
                    MERGE (cs)-[:HAS_MESSAGE]->(m1)
                    MERGE (cs)-[:HAS_MESSAGE]->(m2)
                """, {
                    "filename": session_key,
                    "session_id": session_id,
                    "q_id": q_id,
                    "a_id": a_id,
                    "question": question,
                    "answer": answer,
                    "time": timestamp
                })

        driver.close()
        return jsonify({"answer": answer})

    except Exception as e:
        return jsonify({"error": f"❌ Groq API or Neo4j Error: {str(e)}"}), 500

@chat_bp.route("/history", methods=["GET"])
def get_chat_history():
    file_name = request.args.get("file_name")
    session_id = request.headers.get("X-Session-Id") or request.args.get("sessionId")
    if not file_name or not session_id:
        return jsonify({"error": "file_name and sessionId parameters are required"}), 400

    driver = GraphDatabase.driver(NEO4J_URI, auth=basic_auth(NEO4J_USER, NEO4J_PASSWORD))
    try:
        with driver.session() as session:
            if is_folder_name(file_name):
                session_key = f"{session_id}__folder__{file_name}"
                result = session.run("""
                    MATCH (cs:ChatSession {file_name: $filename, sessionId: $session_id})-[:HAS_MESSAGE]->(m:ChatMessage {sessionId: $session_id})
                    RETURN m.role AS role, m.content AS content, m.timestamp AS timestamp
                    ORDER BY m.timestamp
                """, {"filename": session_key, "session_id": session_id})
            else:
                node_file_name = f"{session_id}__{file_name}"
                result = session.run("""
                    MATCH (cs:ChatSession {file_name: $filename, sessionId: $session_id})-[:HAS_MESSAGE]->(m:ChatMessage {sessionId: $session_id})
                    RETURN m.role AS role, m.content AS content, m.timestamp AS timestamp
                    ORDER BY m.timestamp
                """, {"filename": node_file_name, "session_id": session_id})

            history = [{"role": record["role"], "content": record["content"]} for record in result]
        driver.close()
        return jsonify({"history": history})
    except Exception as e:
        return jsonify({"error": f"Neo4j error fetching history: {str(e)}"}), 500

@chat_bp.route("/context", methods=["GET"])
def get_context():
    file_name = request.args.get("file_name")
    session_id = request.headers.get("X-Session-Id") or request.args.get("sessionId")
    if not file_name or not session_id:
        return jsonify({"error": "file_name and sessionId parameters are required"}), 400

    driver = GraphDatabase.driver(NEO4J_URI, auth=basic_auth(NEO4J_USER, NEO4J_PASSWORD))
    try:
        with driver.session() as session:
            if is_folder_name(file_name):
                prefix = f"{session_id}__{file_name}/"
                result = session.run("""
                    MATCH (f:File)-[:CONTAINS]->(s:Sentence {sessionId: $session_id})
                    WHERE f.sessionId = $session_id AND f.name STARTS WITH $prefix
                    RETURN s.text AS text
                    ORDER BY s.id
                    LIMIT 100
                """, {"session_id": session_id, "prefix": prefix})
                sentences = [record["text"] for record in result]
                context = "\n".join(sentences)
            else:
                node_file_name = f"{session_id}__{file_name}"
                result = session.run("""
                    MATCH (f:File {name: $filename, sessionId: $session_id})-[:CONTAINS]->(s:Sentence {sessionId: $session_id})
                    RETURN s.text AS text
                    ORDER BY s.id
                    LIMIT 20
                """, {"filename": node_file_name, "session_id": session_id})
                sentences = [record["text"] for record in result]
                context = "\n".join(sentences)
        driver.close()
        return jsonify({"context": context})
    except Exception as e:
        return jsonify({"error": f"Neo4j error fetching context: {str(e)}"}), 500

@chat_bp.route("/clear", methods=["POST"])
def clear_chat_history():
    data = request.get_json()
    file_name = data.get("file_name")
    session_id = data.get("sessionId") or request.headers.get("X-Session-Id")
    if not file_name or not session_id:
        return jsonify({"error": "file_name and sessionId are required"}), 400

    driver = GraphDatabase.driver(NEO4J_URI, auth=basic_auth(NEO4J_USER, NEO4J_PASSWORD))
    try:
        with driver.session() as session:
            if is_folder_name(file_name):
                session_key = f"{session_id}__folder__{file_name}"
                session.run("""
                    MATCH (cs:ChatSession {file_name: $filename, sessionId: $session_id})-[:HAS_MESSAGE]->(m:ChatMessage {sessionId: $session_id})
                    DETACH DELETE m
                """, {"filename": session_key, "session_id": session_id})
                session.run("""
                    MATCH (cs:ChatSession {file_name: $filename, sessionId: $session_id})
                    DETACH DELETE cs
                """, {"filename": session_key, "session_id": session_id})
            else:
                node_file_name = f"{session_id}__{file_name}"
                session.run("""
                    MATCH (cs:ChatSession {file_name: $filename, sessionId: $session_id})-[:HAS_MESSAGE]->(m:ChatMessage {sessionId: $session_id})
                    DETACH DELETE m
                """, {"filename": node_file_name, "session_id": session_id})
                session.run("""
                    MATCH (cs:ChatSession {file_name: $filename, sessionId: $session_id})
                    DETACH DELETE cs
                """, {"filename": node_file_name, "session_id": session_id})
        driver.close()
        return jsonify({"message": f"Cleared chat history for '{file_name}'."})
    except Exception as e:
        driver.close()
        return jsonify({"error": f"Failed to clear chat history: {str(e)}"}), 500
