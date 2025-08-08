from neo4j import GraphDatabase
import os

NEO4J_URI = os.getenv("NEO4J_URI")            # e.g., bolt://localhost:7687
NEO4J_USER = os.getenv("NEO4J_USER")          # Neo4j username
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")  # Neo4j password

class Neo4jHandler:
    def __init__(self):
        self.driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))

    def close(self):
        self.driver.close()

    def save_booking(self, session_id: str, booking_state: dict):
        with self.driver.session() as session:
            session.run(
                """
                MERGE (p:Person {session_id: $session_id})
                
                MERGE (loc:Location {name: toLower($location)})
                
                MERGE (hotel:Hotel {name: toLower($hotel_name)})
                
                MERGE (manager:Manager {name: toLower($manager_name)})
                
                MERGE (booking:Booking {id: $booking_id})
                SET booking.check_in = $check_in,
                    booking.check_out = $check_out,
                    booking.guests = $guests
                
                MERGE (p)-[:MADE_BOOKING]->(booking)
                MERGE (booking)-[:AT_HOTEL]->(hotel)
                MERGE (hotel)-[:LOCATED_IN]->(loc)
                MERGE (hotel)-[:MANAGED_BY]->(manager)
                """,
                session_id=session_id,
                location=booking_state.get("location", "").strip(),
                hotel_name=booking_state.get("hotel_name", "the grand hotel").strip(),
                manager_name=booking_state.get("manager_name", "alice johnson").strip(),
                booking_id=booking_state.get("booking_id", f"{session_id}_booking"),
                check_in=booking_state.get("check_in"),
                check_out=booking_state.get("check_out"),
                guests=booking_state.get("guests")
            )

    def get_booking_with_details(self, session_id: str) -> dict:
        with self.driver.session() as session:
            result = session.run(
                """
                MATCH (p:Person {session_id: $session_id})-[:MADE_BOOKING]->(b:Booking)-[:AT_HOTEL]->(h:Hotel)
                OPTIONAL MATCH (h)-[:LOCATED_IN]->(loc:Location)
                OPTIONAL MATCH (h)-[:MANAGED_BY]->(m:Manager)
                RETURN b, h.name AS hotel_name, loc.name AS location_name, m.name AS manager_name
                LIMIT 1
                """,
                session_id=session_id,
            )
            rec = result.single()
            if rec:
                booking_node = rec["b"]
                return {
                    "location": rec.get("location_name", ""),
                    "hotel_name": rec.get("hotel_name", ""),
                    "manager_name": rec.get("manager_name", ""),
                    "check_in": booking_node.get("check_in"),
                    "check_out": booking_node.get("check_out"),
                    "guests": booking_node.get("guests"),
                }
            return {}

# Singleton instance
neo4j_handler = Neo4jHandler()
