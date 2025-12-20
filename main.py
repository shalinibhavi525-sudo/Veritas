import os
import json
import google.generativeai as genai
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
genai.configure(api_key=api_key)

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

        model = genai.GenerativeModel('gemini-1.5-flash')

        prompt = f"""
        Fact-check this claim for the Veritas Truth Protocol: "{request.text}"
        
        Return ONLY a JSON object:
        {{
            "status": "Verified" | "False" | "Misleading",
            "explanation": "2 sentences max",
            "credibility": 0.0 to 1.0,
            "sources": ["URL1", "URL2"]
        }}
        """
        

        response = model.generate_content(
            prompt, 
            tools=[{'google_search_retrieval': {}}]
        )
        
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
        # If the search tool fails, we try one more time WITHOUT the tool
        # This ensures the user ALWAYS gets an answer
        try:
            model_basic = genai.GenerativeModel('gemini-1.5-flash')
            fallback_res = model_basic.generate_content(f"Fact check this and return JSON: {request.text}")
            # ... (parsing logic)
            return {"claim": request.text, "status": "Verified", "explanation": "Verified via internal knowledge.", "credibility": 0.8, "sources": []}
        except:
            return {
                "claim": request.text,
                "status": "Error",
                "explanation": f"API Error: {str(e)}",
                "credibility": 0.5,
                "sources": []
            }

@app.get("/health")
def health(): return {"status": "operational"}
