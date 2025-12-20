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
        checkClaim(span.textContent); 
    });
}

function getHighlightColor(credibility) {
    if (credibility > 0.7) return 'rgba(76, 175, 80, 0.12)'; // Green
    if (credibility > 0.4) return 'rgba(255, 193, 7, 0.12)'; // Amber
    return 'rgba(244, 67, 54, 0.12)'; // Red
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
    const existingPopup = document.querySelector('.veritas-popup');
    if (existingPopup) {
        existingPopup.remove();
    }

    let sourcesHTML = '';
    if (result.sources && result.sources.length > 0) {
        sourcesHTML = `
            <div class="veritas-popup-sources">
                <strong>Sources:</strong>
                <ul>
                    ${result.sources.map(src => `<li><a href="${src}" target="_blank">${src}</a></li>`).join('')}
                </ul>
            </div>
        `;
    }

    const popup = document.createElement('div');
    popup.className = 'veritas-popup';
    popup.innerHTML = `
        <div class="veritas-popup-card">
            <div class="veritas-popup-header">
                <span class="veritas-popup-icon">⚖️</span>
                <h3 class="veritas-popup-title">Veritas Analysis</h3>
            </div>
            <div class="veritas-popup-claim">
                <strong>Claim:</strong> ${result.claim}
            </div>
            <div class="veritas-popup-status">
                <strong>Status:</strong> ${result.status}
                <span class="veritas-credibility-badge credibility-${getCredibilityClass(result.credibility)}">
                    ${Math.round(result.credibility * 100)}% Credibility
                </span>
            </div>
            <div class="veritas-popup-explanation">
                ${result.explanation}
            </div>
            ${sourcesHTML}
            <button class="veritas-popup-close">Close</button>
        </div>
    `;
    
    document.body.appendChild(popup);

    popup.querySelector('.veritas-popup-close').addEventListener('click', () => {
        popup.remove();
    });

    popup.addEventListener('click', (e) => {
        if (e.target === popup) {
            popup.remove();
        }
    });
}
    const popup = document.createElement('div');
    popup.className = 'veritas-popup';
    popup.innerHTML = `
        <div class="veritas-popup-card">
            <div class="veritas-popup-header">
                <span class="veritas-popup-icon">⚖️</span>
                <h3 class="veritas-popup-title">Veritas Analysis</h3>
            </div>
            <div class="veritas-popup-claim">
                <strong>Claim:</strong> ${result.claim}
            </div>
            <div class="veritas-popup-status">
                <strong>Status:</strong> ${result.status}
                <span class="veritas-credibility-badge credibility-${getCredibilityClass(result.credibility)}">
                    ${Math.round(result.credibility * 100)}% Credibility
                </span>
            </div>
            <div class="veritas-popup-explanation">
                ${result.explanation}
            </div>
            <button class="veritas-popup-close">Close</button>
        </div>
    `;
    
    document.body.appendChild(popup);

    // Close on button click
    popup.querySelector('.veritas-popup-close').addEventListener('click', () => {
        popup.remove();
    });

    // Close on background click
    popup.addEventListener('click', (e) => {
        if (e.target === popup) {
            popup.remove();
        }
    });
}

function getCredibilityClass(credibility) {
    if (credibility > 0.7) return 'high';
    if (credibility > 0.4) return 'medium';
    return 'low';
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'runVeritasProtocol') {
        detectedClaims = detectClaims();
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
