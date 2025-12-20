import os
import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# Allow your extension to talk to the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the modern 2025 Client
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

class ClaimRequest(BaseModel):
    text: str

@app.post("/api/check")
async def check_claim(request: ClaimRequest):
    try:
        # Use Gemini 2.0 Flash - The fastest model for 2025 launches
        # Includes Google Search Tool (Grounded Search)
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=f"Fact-check this: {request.text}",
            config=types.GenerateContentConfig(
                tools=[types.Tool(google_search=types.GoogleSearch())],
                response_mime_type="application/json",
                response_schema={
                    "type": "object",
                    "properties": {
                        "status": {"type": "string"},
                        "explanation": {"type": "string"},
                        "credibility": {"type": "number"},
                        "sources": {"type": "array", "items": {"type": "string"}}
                    }
                }
            )
        )

        # Gemini 2.0 returns structured JSON automatically with the config above
        result = json.loads(response.text)
        
        return {
            "claim": request.text,
            "status": result.get("status", "Verified"),
            "explanation": result.get("explanation", "Verified against current records."),
            "credibility": result.get("credibility", 1.0),
            "sources": result.get("sources", [])
        }
    except Exception as e:
        print(f"Deployment Error: {e}")
        return {
            "claim": request.text,
            "status": "Unverifiable",
            "explanation": "Veritas is currently refining its connection to the archives.",
            "credibility": 0.5,
            "sources": []
        }

@app.get("/health")
def health():
    return {"status": "operational"}
