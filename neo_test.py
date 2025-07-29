from neo4j import GraphDatabase, basic_auth
import os
from dotenv import load_dotenv

load_dotenv(dotenv_path=".env")  # use same path as above if needed

uri = os.getenv("NEO4J_URI")
user = os.getenv("NEO4J_USER")
password = os.getenv("NEO4J_PASSWORD")

print("🔐", uri, user, password[:4])

try:
    driver = GraphDatabase.driver(uri, auth=basic_auth(user, password))
    with driver.session() as session:
        result = session.run("RETURN 1 AS test")
        print("✅ Neo4j Connected:", result.single())
except Exception as e:
    print("❌ Neo4j connection failed:", e)
