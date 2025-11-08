console.log('Veritas background service running');

const FACTCHECK_APIS = {
    google: 'https://factchecktools.googleapis.com/v1alpha1/claims:search',
};

// **CRITICAL FIX: REMOVED runVeritasProtocol HANDLER**
// The message is sent directly from popup.js to content.js.
// Only the 'factCheck' message should be handled here.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    
    if (request.action === 'factCheck') {
        // Send the fact-check request to your simulation/API
        checkClaimWithAPIs(request.claim)
            .then(result => sendResponse({ result }))
            .catch(error => sendResponse({ error: error.message }));
        
        // CRUCIAL: Must return true to indicate you will call sendResponse asynchronously
        return true;    
    }
});

async function checkClaimWithAPIs(claimText) {
    try {
        const result = await simulateFactCheck(claimText);
        return result;
        
    } catch (error) {
        console.error('Fact-check error:', error);
        // Provide a default error object
        return {
            claim: claimText,
            status: 'Unable to verify',
            explanation: 'Could not connect to fact-checking services.',
            credibility: 0.5
        };
    }
}

async function simulateFactCheck(claim) {
    // Adds a visual delay to prove the 'Checking...' spinner works
    await new Promise(resolve => setTimeout(resolve, 1000));
    
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
        explanation: 'This claim should be verified with authoritative sources. No definitive fact-check found.',
        credibility: 0.5
    };
}

// Function placeholder for future API integration
async function checkWithGoogleAPI(claim) {
    // Future API logic goes here
}
