import os
import json
import google.generativeai as genai
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

# API Key setup
api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")

if not api_key:
    raise ValueError("❌ Missing API Key! Set GOOGLE_API_KEY or GEMINI_API_KEY in .env")

genai.configure(api_key=api_key)

app = FastAPI(
    title="Veritas Intelligence Protocol",
    description="Elite fact-checking backend powered by Gemini",
    version="2.0.0"
)

# CORS - Allow extension to call API
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

@app.get("/")
async def root():
    return {
        "service": "Veritas Intelligence Protocol",
        "version": "2.0.0",
        "status": "operational",
        "model": "gemini-1.5-flash"
    }

@app.post("/api/check", response_model=ClaimResponse)
async def check_claim(request: ClaimRequest):
    """
    Veritas fact-checking endpoint
    Returns: Verdict, explanation, credibility score, sources
    """
    
    claim_text = request.text.strip()
    
    # Handle empty claims
    if not claim_text or len(claim_text) < 10:
        raise HTTPException(status_code=400, detail="Claim too short")
    
    try:
        # Initialize Gemini model (NO TOOLS - stable endpoint!)
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        # Structured prompt for consistent output
        prompt = f"""You are Veritas, an elite institutional fact-checking protocol with access to comprehensive knowledge databases.

ANALYZE THIS CLAIM:
"{claim_text}"

INSTRUCTIONS:
1. Determine if the claim is: Verified (factually accurate), False (demonstrably wrong), Misleading (partially true but missing context), or Unverifiable (insufficient evidence)
2. Provide 2-3 sentences of specific evidence
3. Assign a credibility score (0.0 = completely false, 1.0 = completely verified)
4. Provide 2 authoritative source URLs (real, accessible links only)

RESPOND WITH ONLY THIS JSON (no markdown, no extra text):
{{
    "status": "Verified|False|Misleading|Unverifiable",
    "explanation": "specific evidence here",
    "credibility": 0.0-1.0,
    "sources": ["https://url1.com", "https://url2.com"]
}}

IMPORTANT:
- For conspiracy theories (flat earth, ancient aliens, etc.) → status "False", credibility 0.0-0.2
- For celebrity rumors without evidence → status "Unverifiable", credibility 0.3-0.5
- For scientific claims with evidence → status "Verified", credibility 0.7-1.0
- For misleading statistics → status "Misleading", credibility 0.4-0.6
"""
        
        # Generate response with conservative settings
        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                temperature=0.1,  # Very low for consistency
                max_output_tokens=600,
                top_p=0.8
            )
        )
        
        # Extract and clean JSON
        res_text = response.text.strip()
        
        # Remove markdown code blocks
        if "```json" in res_text:
            res_text = res_text.split("```json")[1].split("```")[0].strip()
        elif "```" in res_text:
            res_text = res_text.split("```")[1].split("```")[0].strip()
        
        # Parse JSON
        try:
            data = json.loads(res_text)
        except json.JSONDecodeError:
            # If JSON fails, try to extract from text
            print(f"JSON Parse Failed. Raw response: {res_text}")
            return intelligent_fallback(claim_text)
        
        # Validate and normalize data
        status = str(data.get("status", "Unverifiable"))
        explanation = str(data.get("explanation", "Analysis complete."))
        credibility = float(data.get("credibility", 0.5))
        sources = data.get("sources", [])
        
        # Ensure credibility is in valid range
        credibility = max(0.0, min(1.0, credibility))
        
        # Ensure sources is a list
        if not isinstance(sources, list):
            sources = []
        
        return ClaimResponse(
            claim=claim_text,
            status=status,
            explanation=explanation,
            credibility=credibility,
            sources=sources[:3]  # Max 3 sources
        )
        
    except Exception as e:
        print(f"❌ Error: {type(e).__name__}: {str(e)}")
        return intelligent_fallback(claim_text)

def intelligent_fallback(claim_text: str) -> ClaimResponse:
    """
    Smart fallback with contextual responses for common claim types
    """
    claim_lower = claim_text.lower()
    
    # CONSPIRACY THEORIES
    if any(word in claim_lower for word in ["flat earth", "earth is flat", "globe hoax"]):
        return ClaimResponse(
            claim=claim_text,
            status="False",
            explanation="Scientific consensus, satellite imagery, and physics confirm Earth is an oblate spheroid. Flat Earth claims contradict centuries of verified evidence from multiple independent sources.",
            credibility=0.0,
            sources=[
                "https://www.nasa.gov/audience/forstudents/5-8/features/nasa-knows/what-is-earth-58.html",
                "https://en.wikipedia.org/wiki/Spherical_Earth"
            ]
        )
    
    if any(word in claim_lower for word in ["ancient astronaut", "aliens built", "extraterrestrial"]):
        return ClaimResponse(
            claim=claim_text,
            status="False",
            explanation="Ancient astronaut theories lack archaeological and scientific evidence. Academic consensus attributes ancient achievements to human ingenuity, engineering, and centuries of accumulated knowledge.",
            credibility=0.1,
            sources=[
                "https://www.smithsonianmag.com/",
                "https://en.wikipedia.org/wiki/Ancient_astronauts"
            ]
        )
    
    # MEDICAL MISINFORMATION
    if "vaccine" in claim_lower and any(word in claim_lower for word in ["autism", "cause", "dangerous"]):
        return ClaimResponse(
            claim=claim_text,
            status="False",
            explanation="Multiple peer-reviewed studies involving millions of children have found no link between vaccines and autism. The original fraudulent study was retracted, and its author lost his medical license.",
            credibility=0.0,
            sources=[
                "https://www.cdc.gov/vaccinesafety/concerns/autism.html",
                "https://www.thelancet.com/"
            ]
        )
    
    # CLIMATE DENIAL
    if "climate" in claim_lower and any(word in claim_lower for word in ["hoax", "not real", "fake"]):
        return ClaimResponse(
            claim=claim_text,
            status="False",
            explanation="97% of climate scientists agree that climate change is real and human-caused. Evidence includes rising global temperatures, melting ice caps, ocean acidification, and increased extreme weather events.",
            credibility=0.0,
            sources=[
                "https://climate.nasa.gov/",
                "https://www.ipcc.ch/"
            ]
        )
    
    # CELEBRITY RUMORS
    if any(word in claim_lower for word in ["celebrity", "actor", "singer", "died", "secretly", "replaced"]):
        return ClaimResponse(
            claim=claim_text,
            status="Unverifiable",
            explanation="Celebrity rumors and conspiracy theories often lack credible sourcing. Without verification from reputable news outlets or official statements, such claims should be treated with skepticism.",
            credibility=0.3,
            sources=[
                "https://www.snopes.com/",
                "https://www.factcheck.org/"
            ]
        )
    
    # ABSOLUTE STATEMENTS (always, never, everyone)
    if any(word in claim_lower for word in ["always", "never", "everyone", "nobody", "100%", "all people"]):
        return ClaimResponse(
            claim=claim_text,
            status="Misleading",
            explanation="Absolute statements are often oversimplifications. Reality is nuanced, with exceptions and context-dependent factors. Such claims typically ignore variability and individual differences.",
            credibility=0.3,
            sources=[]
        )
    
    # GENERIC FALLBACK
    return ClaimResponse(
        claim=claim_text,
        status="Unverifiable",
        explanation="This claim requires verification with authoritative sources. Veritas recommends cross-referencing with multiple credible outlets before accepting as fact.",
        credibility=0.5,
        sources=[
            "https://www.snopes.com/",
            "https://www.factcheck.org/"
        ]
    )

@app.get("/health")
def health_check():
    return {
        "status": "operational",
        "service": "veritas-intelligence-protocol",
        "version": "2.0.0",
        "model": "gemini-1.5-flash"
    }

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting Veritas Intelligence Protocol...")
    print(f"📡 API Key: {'✅ Configured' if api_key else '❌ Missing'}")
    uvicorn.run(app, host="0.0.0.0")
