import os
import json
import google.generativeai as genai
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

# Setup Gemini with Search Grounding
API_KEY = os.getenv("GEMINI_API_KEY")
if not API_KEY:
    print("WARNING: GEMINI_API_KEY not found in environment variables!")

genai.configure(api_key=API_KEY)

app = FastAPI(title="Veritas Protocol API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

class ClaimRequest(BaseModel):
    text: str

@app.post("/api/check")
async def check_claim(request: ClaimRequest):
    try:
        # Using 1.5 Flash for speed (Hacker News loves speed)
        model = genai.GenerativeModel(
            model_name="gemini-1.5-flash",
            tools=[{"google_search_retrieval": {}}]
        )
        
        prompt = f"""
        Analyze this claim for the Veritas Truth Protocol: "{request.text}"
        
        Provide a rigorous fact-check. Return ONLY a JSON object with:
        "status": "Verified", "False", "Misleading", or "Unverifiable"
        "explanation": A high-society, sophisticated 2-sentence summary.
        "credibility": A float between 0.0 and 1.0.
        "sources": A list of 2-3 high-authority URLs used for verification.
        """
        
        response = model.generate_content(prompt)
        
        # Clean the response to ensure it's valid JSON
        raw_text = response.text.strip()
        if "```json" in raw_text:
            raw_text = raw_text.split("```json")[1].split("```")[0].strip()
        
        data = json.loads(raw_text)
        
        return {
            "claim": request.text,
            "status": data.get("status", "Unknown"),
            "explanation": data.get("explanation", "The archives were inconclusive."),
            "credibility": data.get("credibility", 0.5),
            "sources": data.get("sources", [])
        }
    except Exception as e:
        print(f"Server Error: {e}")
        raise HTTPException(status_code=500, detail="The Veritas engine encountered an elite error.")

@app.get("/health")
def health(): return {"status": "luxury"}
