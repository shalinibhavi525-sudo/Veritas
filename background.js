console.log('Veritas background service running');

const API_URL = 'https://your-backend-url.railway.app/api/check'; 

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'factCheck') {
        checkClaimWithAPI(request.claim)
            .then(result => sendResponse({ result }))
            .catch(error => {
                console.warn('API Failed, using local heuristic fallback.');
                // Fallback to local logic so the user doesn't just see an error
                const fallback = simulateFactCheck(request.claim);
                sendResponse({ result: fallback });
            });
        
        return true; 
    }
});

async function checkClaimWithAPI(claimText) {
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
    
    return await response.json();
}

function simulateFactCheck(claim) {
    const lowCredibilityKeywords = ['always', 'never', 'everyone', 'nobody', '100%'];
    const hasLowCredibility = lowCredibilityKeywords.some(keyword => 
        claim.toLowerCase().includes(keyword)
    );
    
    if (hasLowCredibility) {
        return {
            claim: claim,
            status: 'Likely Misleading',
            explanation: 'Absolute statements detected. Reality is usually more nuanced than "always" or "never".',
            credibility: 0.3,
            sources: []
        };
    }
    
    return {
        claim: claim,
        status: 'Needs Verification',
        explanation: 'Could not connect to the Veritas cloud. Please check your connection.',
        credibility: 0.5,
        sources: []
    };
}
