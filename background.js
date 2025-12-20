const API_URL = 'https://veritas-production.up.railway.app/api/check'; 

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'factCheck') {
        checkClaimWithAPI(request.claim)
            .then(result => sendResponse({ result }))
            .catch(error => {
                const fallback = simulateFactCheck(request.claim);
                sendResponse({ result: fallback });
            });
        return true; 
    }
});

async function checkClaimWithAPI(claimText) {
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: claimText })
    });
    if (!response.ok) throw new Error('API failed');
    return await response.json();
}

function simulateFactCheck(claim) {
    const lowCredibilityKeywords = ['always', 'never', 'everyone', 'nobody', '100%'];
    const hasLowCredibility = lowCredibilityKeywords.some(k => claim.toLowerCase().includes(k));
    
    return {
        claim: claim,
        status: hasLowCredibility ? 'Likely Misleading' : 'Needs Verification',
        explanation: hasLowCredibility ? 'Absolute statements detected. Reality is nuanced.' : 'Could not connect to Veritas cloud.',
        credibility: hasLowCredibility ? 0.3 : 0.5,
        sources: []
    };
}
