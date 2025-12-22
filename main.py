import os
import json
import google.generativeai as genai
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from slowapi import Limiter, _rate_limit_exceeded_handler 
from slowapi.util import get_remote_address  
from slowapi.errors import RateLimitExceeded

load_dotenv()

# API Key setup (Render uses the Dashboard Environment Variables, not .env)
api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")

if api_key:
    genai.configure(api_key=api_key)
else:
    print("⚠️ WARNING: No API Key found. AI features will be disabled.")

app = FastAPI(title="Veritas Intelligence Protocol", version="2.0.0")

# CORS - Essential for the Chrome Extension to talk to the server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ClaimRequest(BaseModel):
    text: str

class ClaimResponse(BaseModel):
    claim: str
    status: str
    explanation: str
    credibility: float
    sources: list[str]

@app.post("/api/check", response_model=ClaimResponse)
async def check_claim(request: ClaimRequest):
    claim_text = request.text.strip()
    
    if not claim_text or len(claim_text) < 5:
        raise HTTPException(status_code=400, detail="Claim too short")
    
    try:
        # Initialize Gemini 1.5 Flash
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        # PROMPT: Explicitly define the JSON keys we need
        prompt = f"""Analyze the following claim as a high-level fact-checker: "{claim_text}"
        
        Return a JSON object with:
        1. "status": (One of: "Verified", "False", "Misleading", or "Unverifiable")
        2. "explanation": (2-3 sentences of evidence)
        3. "credibility": (A float between 0.0 and 1.0)
        4. "sources": (A list of 2 real URLs)"""

        # MAGIC: Use response_mime_type to force perfect JSON
        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                temperature=0.1 # Lower temp = more factual accuracy
            )
        )
        
        # Parse result (Native JSON mode ensures this doesn't fail)
        data = json.loads(response.text)
        
        return ClaimResponse(
            claim=claim_text,
            status=data.get("status", "Unverifiable"),
            explanation=data.get("explanation", "Analysis complete."),
            credibility=float(data.get("credibility", 0.5)),
            sources=data.get("sources", [])
        )
        
    except Exception as e:
        print(f"❌ Gemini Error: {str(e)}")
        # If AI fails, we use the fallback logic
        return intelligent_fallback(claim_text)

def intelligent_fallback(claim_text: str) -> ClaimResponse:
    """Smart fallback for common topics if the API is down"""
    claim_lower = claim_text.lower()
    
    # Hardcoded debunks (Add as many as you want)
    if "flat earth" in claim_lower or "earth is flat" in claim_lower:
        return ClaimResponse(
            claim=claim_text, status="False", credibility=0.0,
            explanation="Scientific consensus and satellite imagery confirm Earth is an oblate spheroid.",
            sources=["https://www.nasa.gov/", "https://en.wikipedia.org/wiki/Spherical_Earth"]
        )
    
    # Generic "I don't know" fallback
    return ClaimResponse(
        claim=claim_text,
        status="Unverifiable",
        explanation="Connection to Veritas Cloud was interrupted. Please check your API key and try again.",
        credibility=0.5,
        sources=["https://www.snopes.com/"]
    )

@app.get("/health")
def health():
    return {"status": "operational", "api_key_set": bool(api_key)}

if __name__ == "__main__":
    import uvicorn
    # Render provides a dynamic PORT, we must listen to it
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
