console.log('🔍 Veritas Intelligence Protocol: Service Worker Active');

// ⚠️ REPLACE THIS WITH YOUR ACTUAL RENDER URL!
const API_URL = 'https://your-backend.onrender.com/api/check';

// Context menu setup
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "veritas-check",
        title: "Verify with Veritas Protocol",
        contexts: ["selection"]
    });
    console.log('✅ Veritas context menu created');
});

// Context menu click handler
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "veritas-check" && info.selectionText) {
        chrome.tabs.sendMessage(tab.id, {
            action: 'manualCheck',
            text: info.selectionText
        });
    }
});

// Main message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'factCheck') {
        console.log('📡 Fact-check request received:', request.claim.substring(0, 50) + '...');
        
        checkClaimWithAPI(request.claim)
            .then(result => {
                console.log('✅ Fact-check successful:', result.status);
                sendResponse({ result });
            })
            .catch(error => {
                console.error('❌ Fact-check failed:', error);
                const fallback = createFallbackResponse(request.claim, error);
                sendResponse({ result: fallback });
            });
        
        return true; // Keep channel open for async response
    }
});

/**
 * Check claim with backend API
 */
async function checkClaimWithAPI(claimText) {
    try {
        console.log('🌐 Calling API:', API_URL);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
        
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text: claimText }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`API returned ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Validate response structure
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid API response structure');
        }
        
        return {
            claim: data.claim || claimText,
            status: data.status || 'Unverifiable',
            explanation: data.explanation || 'Analysis complete.',
            credibility: typeof data.credibility === 'number' ? data.credibility : 0.5,
            sources: Array.isArray(data.sources) ? data.sources : []
        };
        
    } catch (error) {
        console.error('API Error:', error.message);
        throw error;
    }
}

/**
 * Fallback response when API fails
 */
function createFallbackResponse(claim, error) {
    const claim_lower = claim.toLowerCase();
    
    // Check if it's a network/timeout error
    if (error.name === 'AbortError') {
        return {
            claim: claim,
            status: 'Connection Timeout',
            explanation: 'Veritas backend is waking up (free tier cold start). Please try again in 30 seconds.',
            credibility: 0.5,
            sources: []
        };
    }
    
    // Smart fallback based on claim content
    if (claim_lower.includes('flat earth') || claim_lower.includes('earth is flat')) {
        return {
            claim: claim,
            status: 'False',
            explanation: 'Scientific consensus confirms Earth is an oblate spheroid. Flat Earth theories contradict verified evidence from multiple independent sources.',
            credibility: 0.0,
            sources: ['https://www.nasa.gov/', 'https://en.wikipedia.org/wiki/Spherical_Earth']
        };
    }
    
    if (claim_lower.includes('vaccine') && (claim_lower.includes('autism') || claim_lower.includes('dangerous'))) {
        return {
            claim: claim,
            status: 'False',
            explanation: 'Multiple peer-reviewed studies involving millions of children found no link between vaccines and autism. The original fraudulent study was retracted.',
            credibility: 0.0,
            sources: ['https://www.cdc.gov/vaccinesafety/', 'https://www.who.int/']
        };
    }
    
    // Detect absolute statements
    const absoluteWords = ['always', 'never', 'everyone', 'nobody', '100%', 'all people'];
    if (absoluteWords.some(word => claim_lower.includes(word))) {
        return {
            claim: claim,
            status: 'Misleading',
            explanation: 'Absolute statements are often oversimplifications. Reality includes exceptions, context, and nuance that such claims ignore.',
            credibility: 0.3,
            sources: []
        };
    }
    
    // Generic fallback
    return {
        claim: claim,
        status: 'Connection Error',
        explanation: 'Could not connect to Veritas backend. This claim requires verification with authoritative sources.',
        credibility: 0.5,
        sources: []
    };
            }
