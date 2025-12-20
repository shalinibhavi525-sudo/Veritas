import os
import json
import google.generativeai as genai
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

# Railway uses GOOGLE_API_KEY
api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
genai.configure(api_key=api_key)

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

class ClaimRequest(BaseModel):
    text: str

@app.post("/api/check")
async def check_claim(request: ClaimRequest):
    try:
        # We use the STABLE model without any extra 'tools' to prevent the 404 error
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        prompt = f"""
        Act as Veritas, the elite truth protocol. Analyze this claim: "{request.text}"
        
        Provide a verdict based on your vast knowledge. 
        Return ONLY a JSON object:
        {{
            "status": "Verified" | "False" | "Misleading",
            "explanation": "2 sentences max of evidence.",
            "credibility": 0.0 to 1.0
        }}
        """
        
        response = model.generate_content(prompt)
        
        # This part ensures the AI doesn't send back extra words that break the code
        res_text = response.text.strip()
        if "```json" in res_text:
            res_text = res_text.split("```json")[1].split("```")[0].strip()
        elif "```" in res_text:
            res_text = res_text.split("```")[1].split("```")[0].strip()
            
        data = json.loads(res_text)
        
        # We grab the REAL score from the AI
        ai_score = float(data.get("credibility", 0.5))
        
        return {
            "claim": request.text,
            "status": data.get("status", "Verified"),
            "explanation": data.get("explanation", "Analysis complete."),
            "credibility": ai_score,
            "sources": []
        }
    except Exception as e:
        # If it STILL fails, we give a different score so you know it's a server error
        return {
            "claim": request.text,
            "status": "Error",
            "explanation": f"Veritas Engine Error: {str(e)}",
            "credibility": 0.01, # Showing 1% if it crashes so you know it's an error
            "sources": []
        }

@app.get("/health")
def health(): return {"status": "operational"}
