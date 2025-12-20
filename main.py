import os
import json
import google.generativeai as genai
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

# Try to get the key from multiple possible variable names
api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")

if api_key:
    genai.configure(api_key=api_key)
else:
    print("CRITICAL ERROR: No API Key found in Environment Variables!")

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
        # Grounded Search Protocol
        model = genai.GenerativeModel(
            model_name='gemini-1.5-flash',
            tools=[{'google_search_retrieval': {}}]
        )

        prompt = f"Fact-check this: {request.text}. Return ONLY JSON with status, explanation, credibility (0.0-1.0), and sources (list)."
        
        response = model.generate_content(prompt)
        
        # Robust JSON cleaning
        res_text = response.text.strip()
        if "```json" in res_text:
            res_text = res_text.split("```json")[1].split("```")[0].strip()
        
        data = json.loads(res_text)
        
        return {
            "claim": request.text,
            "status": data.get("status", "Verified"),
            "explanation": data.get("explanation", "Analysis complete."),
            "credibility": data.get("credibility", 1.0),
            "sources": data.get("sources", [])
        }
    except Exception as e:
        print(f"Server Error: {str(e)}")
        return {
            "claim": request.text,
            "status": "Error",
            "explanation": f"The Veritas engine encountered an error: {str(e)}",
            "credibility": 0.5,
            "sources": []
        }

@app.get("/health")
def health(): return {"status": "operational"}
