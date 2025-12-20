console.log('Veritas background service running');

const API_URL = 'https://your-backend-url.railway.app/api/check'; 

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'factCheck') {
        checkClaimWithAPI(request.claim)
            .then(result => sendResponse({ result }))
            .catch(error => sendResponse({ 
                result: {
                    claim: request.claim,
                    status: 'Error',
                    explanation: 'Could not connect to fact-checking service.',
                    credibility: 0.5
                }
            }));
        
        return true;
    }
});

async function checkClaimWithAPI(claimText) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text: claimText })
        });
        
        if (!response.ok) {
            throw new Error('API request failed');
        }
        
        const data = await response.json();
        
        return {
            claim: data.claim,
            status: data.status,
            explanation: data.explanation,
            credibility: data.credibility,
            sources: data.sources || []
        };
        
    } catch (error) {
        console.error('Fact-check error:', error);
        
        // Fallback to local heuristics
        return await simulateFactCheck(claimText);
    }
}

// Fallback function if API fails
async function simulateFactCheck(claim) {
    const lowCredibilityKeywords = ['always', 'never', 'everyone', 'nobody', '100%'];
    const hasLowCredibility = lowCredibilityKeywords.some(keyword => 
        claim.toLowerCase().includes(keyword)
    );
    
    if (hasLowCredibility) {
        return {
            claim: claim,
            status: 'Likely False or Misleading',
            explanation: 'Absolute statements like this are often oversimplifications. Reality is usually more nuanced.',
            credibility: 0.3
        };
    }
    
    return {
        claim: claim,
        status: 'Needs Verification',
        explanation: 'This claim should be verified with authoritative sources.',
        credibility: 0.5
    };
}
