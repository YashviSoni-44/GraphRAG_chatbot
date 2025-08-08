import os
import json
import requests

from api.neo4j_helper import neo4j_handler  # Adjust import path if needed

REQUIRED_SLOTS = [
    "location",
    "check_in",
    "check_out",
    "guests"
]

DEFAULT_HOTEL_NAME = "The Grand Hotel"
DEFAULT_MANAGER_NAME = "Alice Johnson"

class GroqLLM:
    def __init__(self):
        self.api_key = os.getenv("GROQ_API_KEY")
        self.api_url = "https://api.groq.com/openai/v1/chat/completions"
        self.model = "llama3-8b-8192"

    def __call__(self, messages):
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.7,
            "n": 1,
            "stop": None,
        }
        response = requests.post(self.api_url, headers=headers, json=payload)
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"].strip()

groq_llm = GroqLLM()

# --- Hotel booking crew (your existing implementation) ---
def merge_booking_state(prior, updates):
    result = prior.copy() if prior else {}
    for slot in REQUIRED_SLOTS:
        if updates.get(slot):
            result[slot] = updates[slot]
    return result

def missing_slots(booking_state):
    return [slot for slot in REQUIRED_SLOTS if not booking_state.get(slot)]

def clean_slot_value(slot, val):
    if val is None:
        return None
    if isinstance(val, str):
        return val.strip()
    return val

SLOT_EXTRACTION_SYSTEM_PROMPT = """
You are a hotel booking information extractor.
Given the latest user message, extract any hotel booking info the user provides.
Output a JSON object with NONE or MORE of these keys (no explanations!):
- location
- check_in
- check_out
- guests

If a value isn't mentioned, do not include it.
EXAMPLES:
User: "Book a hotel in Goa for Aug 9-11 for 2 people"
Output: {"location": "Goa", "check_in": "Aug 9", "check_out": "Aug 11", "guests": "2 people"}

User: "4 people"
Output: {"guests": "4 people"}
"""

CLARIFICATION_SYSTEM_PROMPT = (
    "You are a helpful hotel booking assistant. Given the current missing fields for a hotel booking, "
    "generate a FRIENDLY, concise message to ask the user ONLY about the missing info."
)

CONFIRMATION_SYSTEM_PROMPT = (
    "You are a hotel booking assistant. Generate a friendly booking confirmation message that summarizes the user's booking. "
    "Include hotel name, manager name, location, check-in, check-out, and number of guests in your reply."
)

def run_crew(user_input: dict) -> str:
    prior_state = user_input.get("booking_state", {}) or {}
    session_id = user_input.get("session_id") or ""
    messages = user_input.get("messages", [])
    latest_user_message = ""

    for msg in reversed(messages):
        if msg.get("role") == "user":
            latest_user_message = msg.get("content")
            break

    extractor_prompt = [
        {"role": "system", "content": SLOT_EXTRACTION_SYSTEM_PROMPT},
        {"role": "user", "content": latest_user_message}
    ]
    try:
        extraction = groq_llm(extractor_prompt)
        extracted_slots = json.loads(extraction)
    except Exception:
        extracted_slots = {}

    cleaned_updates = {s: clean_slot_value(s, v) for s, v in extracted_slots.items() if s in REQUIRED_SLOTS}
    updated_booking_state = merge_booking_state(prior_state, cleaned_updates)

    updated_booking_state["hotel_name"] = DEFAULT_HOTEL_NAME
    updated_booking_state["manager_name"] = DEFAULT_MANAGER_NAME

    missing = missing_slots(updated_booking_state)

    if missing:
        prompt = (
            f"Missing booking fields: {', '.join(missing)}.\n"
            "Generate a polite question asking user for JUST the missing information."
        )
        clar_prompt = [
            {"role": "system", "content": CLARIFICATION_SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ]
        response_text = groq_llm(clar_prompt)
    else:
        if session_id:
            try:
                if "booking_id" not in updated_booking_state:
                    updated_booking_state["booking_id"] = f"{session_id}_booking"
                neo4j_handler.save_booking(session_id, updated_booking_state)
            except Exception as e:
                print(f"Neo4j save booking error: {e}")

        summary = (
            f"Booking confirmed at {updated_booking_state['hotel_name']}, "
            f"managed by {updated_booking_state['manager_name']}, "
            f"in {updated_booking_state['location']} "
            f"from {updated_booking_state['check_in']} to {updated_booking_state['check_out']} "
            f"for {updated_booking_state['guests']} guests."
        )
        conf_prompt = [
            {"role": "system", "content": CONFIRMATION_SYSTEM_PROMPT},
            {"role": "user", "content": summary}
        ]
        response_text = groq_llm(conf_prompt)

    out = {
        "response": response_text,
        "booking_state": updated_booking_state
    }
    return json.dumps(out)


# --- Generalized RAG style crew for arbitrary file queries ---
def run_crew_general(user_input: dict) -> str:
    """
    Runs a generalized crew agent for answering questions related to uploaded files/folders.

    user_input keys: messages, file_name, session_id, session_key (prefixed file name with session)
    Returns plain string answer.
    """
    messages = user_input.get("messages", [])
    file_name = user_input.get("file_name")
    session_key = user_input.get("session_key")
    session_id = user_input.get("session_id")

    # Simple retrieval: query Neo4j for relevant sentences (limit 100)
    # Compose a prompt for Groq LLM including retrieved context + user messages

    # For demonstration, basic context retrieval from Neo4j:
    try:
        from neo4j import GraphDatabase, basic_auth
        NEO4J_URI = os.getenv("NEO4J_URI")
        NEO4J_USER = os.getenv("NEO4J_USER")
        NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")

        driver = GraphDatabase.driver(NEO4J_URI, auth=basic_auth(NEO4J_USER, NEO4J_PASSWORD))
        with driver.session() as session:
            if file_name and not file_name.lower().startswith("folder"):
                # Single file context
                result = session.run("""
                    MATCH (f:File {name: $filename, sessionId: $session_id})-[:CONTAINS]->(s:Sentence {sessionId: $session_id})
                    RETURN s.text AS text
                    ORDER BY s.id
                    LIMIT 100
                """, {"filename": session_key, "session_id": session_id})
            else:
                # Folder context (prefix)
                prefix = session_key.replace("__folder__", "__") + "/"
                result = session.run("""
                    MATCH (f:File)-[:CONTAINS]->(s:Sentence {sessionId: $session_id})
                    WHERE f.sessionId = $session_id AND f.name STARTS WITH $prefix
                    RETURN s.text AS text
                    ORDER BY s.id
                    LIMIT 100
                """, {"session_id": session_id, "prefix": prefix})

            sentences = [record["text"] for record in result]

    except Exception as e:
        sentences = []
        print(f"Error fetching context from Neo4j: {e}")

    context_text = "\n".join(sentences) if sentences else "No relevant context found."

    # Compose system prompt + user messages to send to Groq LLM
    system_prompt = (
        "You are a helpful assistant answering questions based ONLY on the provided context below. "
        "If unsure, respond politely that you don't know. \n\nContext:\n" + context_text
    )

    # Flatten all previous messages after system prompt except system instructions, 
    # but you may decide to only pass last few for brevity
    user_messages = [{"role": "system", "content": system_prompt}] + messages

    # Finally call Groq LLM
    try:
        answer = groq_llm(user_messages)
    except Exception as e:
        answer = f"Error generating answer: {e}"

    return answer
