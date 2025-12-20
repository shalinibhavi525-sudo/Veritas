import os
import json
import google.generativeai as genai
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.getenv("AIzaSyAlkC4OjcVEDIaBzhLMNaJDdci1LFwPuTw"))

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

class Claim(BaseModel):
    text: str

@app.post("/api/check")
async def check(claim: Claim):
    model = genai.GenerativeModel(
        model_name="gemini-1.5-flash",
        tools=[{"google_search_retrieval": {}}]
    )
    
    prompt = f"""Fact-check: "{claim.text}". 
    Return ONLY JSON: {{"status": "Verified/False/Mixed", "explanation": "...", "credibility": 0.0-1.0, "sources": []}}"""
    
    response = model.generate_content(prompt)
    try:
        # Strip potential markdown code blocks
        clean_json = response.text.replace('```json', '').replace('```', '').strip()
        data = json.loads(clean_json)
        return {**data, "claim": claim.text}
    except:
        return {"claim": claim.text, "status": "Error", "explanation": "Failed to analyze.", "credibility": 0.5, "sources": []}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8000)))
