console.log('🔍 Veritas is watching...');

let detectedClaims = []; 

const CLAIM_PATTERNS = [
    /according to (studies|research|experts)/i,
    /studies show/i,
    /research suggests/i,
    /scientists (say|claim|found)/i,
    /(\d+)% of (people|americans|users)/i,
    /(proved|proven) that/i,
    /fact:/i,
    /it is (known|proven|established) that/i,
    /(always|never|every|all|no) [a-z]+ (are|is|do|does)/i,
    /(\d+)% of [a-z]+ (believe|think|say)/i,
    /experts (claim|say|believe)/i,
    /new study (shows|reveals|finds)/i,
    /according to (a|the) (study|report|survey)/i,
    /(proven|confirmed) (to be|that)/i,
    /scientific evidence (shows|suggests)/i,
    /data (shows|reveals|suggests)/i,
    /(always|never|everyone|nobody|all|none) [a-z]+ (are|is|do)/i
];

function detectClaims() {
    const textNodes = getTextNodes(document.body);
    const claims = [];
    
    textNodes.forEach(node => {
        const text = node.textContent.trim();
        
        CLAIM_PATTERNS.forEach(pattern => {
            if (pattern.test(text) && text.length > 20 && text.length < 300) {
                claims.push({
                    text: text,
                    node: node,
                    context: getContext(node)
                });
            }
        });
    });
    
    return claims;
}

function getTextNodes(element) {
    const textNodes = [];
    const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );
    
    let node;
    while (node = walker.nextNode()) {
        if (node.textContent.trim().length > 0) {
            textNodes.push(node);
        }
    }
    
    return textNodes;
}

function getContext(node) {
    const parent = node.parentElement;
    return {
        tag: parent?.tagName,
        url: window.location.href,
        domain: window.location.hostname
    };
}

function highlightClaim(node, credibility) {
    const span = document.createElement('span');
    span.className = 'veritas-highlight';
    span.style.backgroundColor = getHighlightColor(credibility);
    span.style.borderRadius = '3px';
    span.style.padding = '2px 4px';
    span.style.cursor = 'pointer';
    span.textContent = node.textContent;
    span.title = 'Click to fact-check with Veritas';
    
    node.parentNode.replaceChild(span, node);
    
    span.addEventListener('click', () => {
        // Highlighting click handler: show the result pop-up
        checkClaim(span.textContent); 
    });
}

function getHighlightColor(credibility) {
    if (credibility > 0.7) return '#90EE9080'; // Green (likely true)
    if (credibility > 0.4) return '#FFD70080'; // Yellow (mixed)
    return '#FF634780'; // Red (likely false)
}

function checkClaim(claimText) {
    chrome.runtime.sendMessage({
        action: 'factCheck',
        claim: claimText
    }, response => {
        if (response && response.result) {
            showClaimResult(response.result);
        }
    });
}

function showClaimResult(result) {
    const popup = document.createElement('div');
    popup.className = 'veritas-popup';
    popup.innerHTML = `
        <div style="
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border: 2px solid #667eea;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            z-index: 999999;
            max-width: 400px;
        ">
            <h3 style="margin: 0 0 10px 0; color: #667eea;">Veritas Fact-Check</h3>
            <p style="margin: 10px 0;"><strong>Claim:</strong> ${result.claim}</p>
            <p style="margin: 10px 0;"><strong>Status:</strong> ${result.status}</p>
            <p style="margin: 10px 0; font-size: 0.9em;">${result.explanation}</p>
            <button onclick="this.parentElement.parentElement.remove()" style="
                background: #667eea;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 6px;
                cursor: pointer;
                margin-top: 10px;
            ">Close</button>
        </div>
    `;
    
    document.body.appendChild(popup);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    
    if (request.action === 'runVeritasProtocol') {
        
        detectedClaims = detectClaims(); // Runs detection ONCE per scan
        console.log(`Veritas Protocol: Activating on ${detectedClaims.length} claims.`);
        
        detectedClaims.forEach(claim => {
            highlightClaim(claim.node, 0.5); 
        });

        sendResponse({ status: "highlighting_started" });
        return true; 
    }
    
    if (request.action === 'getClaims') {
        
        sendResponse({ claims: detectedClaims }); 
        return true; 
    }
});
