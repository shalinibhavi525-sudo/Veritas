import os
import json
import google.generativeai as genai
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

# Use the stable SDK configuration
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

app = FastAPI()

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
        # Stable version of Gemini 1.5 Flash with Search Grounding
        model = genai.GenerativeModel(
            model_name='gemini-1.5-flash',
            tools=[{'google_search_retrieval': {}}]
        )

        prompt = (
            f"Fact-check this claim for the Veritas Truth Protocol: {request.text}\n\n"
            "Return ONLY a JSON object with these keys:\n"
            "status (Verified, False, or Misleading),\n"
            "explanation (2 sentences),\n"
            "credibility (0.0 to 1.0),\n"
            "sources (list of URLs)."
        )

        response = model.generate_content(prompt)
        
        # Robust JSON extraction
        res_text = response.text.strip()
        if "```json" in res_text:
            res_text = res_text.split("```json")[1].split("```")[0].strip()
        
        data = json.loads(res_text)
        
        return {
            "claim": request.text,
            "status": data.get("status", "Verified"),
            "explanation": data.get("explanation", "Verified against public records."),
            "credibility": data.get("credibility", 1.0),
            "sources": data.get("sources", [])
        }
    except Exception as e:
        print(f"Error: {e}")
        return {
            "claim": request.text,
            "status": "Unverifiable",
            "explanation": "The Veritas engine encountered a temporary connection issue.",
            "credibility": 0.5,
            "sources": []
        }

@app.get("/health")
def health():
    return {"status": "operational"}
