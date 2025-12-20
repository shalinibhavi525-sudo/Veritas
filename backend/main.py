from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Veritas Truth Protocol API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your extension ID
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PERPLEXITY_API_KEY = os.getenv("PERPLEXITY_API_KEY")
PERPLEXITY_URL = "https://api.perplexity.ai/chat/completions"

class ClaimRequest(BaseModel):
    text: str

class ClaimResponse(BaseModel):
    claim: str
    status: str
    explanation: str
    credibility: float
    sources: list[str] = []

@app.get("/")
async def root():
    return {
        "message": "Veritas Truth Protocol API",
        "version": "2.0",
        "status": "operational"
    }

@app.post("/api/check", response_model=ClaimResponse)
async def check_claim(claim: ClaimRequest):
    """
    Fact-check a claim using Perplexity AI
    """
    if not PERPLEXITY_API_KEY:
        raise HTTPException(status_code=500, detail="API key not configured")
    
    try:
        prompt = f"""You are Veritas, a fact-checking AI. Analyze this claim and provide:
1. A verdict (True/False/Mixed/Unverifiable)
2. A brief explanation (2-3 sentences)
3. A credibility score (0.0 to 1.0)

Claim: "{claim.text}"

Respond in this exact format:
VERDICT: [True/False/Mixed/Unverifiable]
EXPLANATION: [Your explanation]
CREDIBILITY: [0.0-1.0]
"""

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                PERPLEXITY_URL,
                headers={
                    "Authorization": f"Bearer {PERPLEXITY_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "llama-3.1-sonar-small-128k-online",
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are a precise fact-checker. Be concise and accurate."
                        },
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    "temperature": 0.2,
                    "max_tokens": 500
                }
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=500, detail="Fact-checking service error")
            
            data = response.json()
            content = data["choices"][0]["message"]["content"]
            
            # Parse response
            parsed = parse_perplexity_response(content)
            
            # Get citations if available
            citations = data.get("citations", [])
            
            return ClaimResponse(
                claim=claim.text,
                status=parsed["verdict"],
                explanation=parsed["explanation"],
                credibility=parsed["credibility"],
                sources=citations[:3]  # Top 3 sources
            )
            
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Fact-checking request timed out")
    except Exception as e:
        print(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

def parse_perplexity_response(content: str) -> dict:
    """
    Parse Perplexity's response into structured data
    """
    lines = content.strip().split('\n')
    
    verdict = "Unverifiable"
    explanation = "Unable to verify this claim."
    credibility = 0.5
    
    for line in lines:
        line = line.strip()
        if line.startswith("VERDICT:"):
            verdict = line.replace("VERDICT:", "").strip()
        elif line.startswith("EXPLANATION:"):
            explanation = line.replace("EXPLANATION:", "").strip()
        elif line.startswith("CREDIBILITY:"):
            try:
                credibility = float(line.replace("CREDIBILITY:", "").strip())
            except:
                credibility = 0.5
    
    return {
        "verdict": verdict,
        "explanation": explanation,
        "credibility": credibility
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "api": "veritas-2.0"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
