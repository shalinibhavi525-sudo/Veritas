console.log('🔍 Veritas Protocol: Monitoring for Truth...');

let detectedClaims = []; 

const CLAIM_PATTERNS = [
    /according to (studies|research|experts)/i,
    /studies show/i,
    /research suggests/i,
    /scientists (say|claim|found)/i,
    /(\d+)% of (people|americans|users)/i,
    /fact:/i,
    /it is (known|proven|established) that/i,
    /experts (claim|say|believe)/i,
    /new study (shows|reveals|finds)/i,
    /scientific evidence (shows|suggests)/i,
    /data (shows|reveals|suggests)/i
];

function detectClaims() {
    const textNodes = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    
    let node;
    while (node = walker.nextNode()) {
        const text = node.textContent.trim();
        if (text.length > 30 && text.length < 300) {
            if (CLAIM_PATTERNS.some(pattern => pattern.test(text))) {
                textNodes.push({ node: node, text: text });
            }
        }
    }
    return textNodes;
}

function highlightClaim(node, credibility) {
    if (node.parentElement.classList.contains('veritas-highlight')) return;

    const span = document.createElement('span');
    span.className = 'veritas-highlight';
    span.textContent = node.textContent;
    
    node.parentNode.replaceChild(span, node);
    
    span.addEventListener('click', () => {
        checkClaim(span.textContent); 
    });
}

function checkClaim(claimText) {
    // Add a loading class for a subtle animation
    const highlights = document.querySelectorAll('.veritas-highlight');
    highlights.forEach(h => { if(h.textContent === claimText) h.classList.add('veritas-checking'); });

    chrome.runtime.sendMessage({ action: 'factCheck', claim: claimText }, response => {
        highlights.forEach(h => h.classList.remove('veritas-checking'));
        if (response && response.result) {
            showClaimResult(response.result);
        }
    });
}

function showClaimResult(result) {
    const existingPopup = document.querySelector('.veritas-popup');
    if (existingPopup) existingPopup.remove();

    let sourcesHTML = '';
    if (result.sources && result.sources.length > 0) {
        sourcesHTML = `
            <div class="veritas-popup-sources">
                <strong>SOURCES OF RECORD:</strong>
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
                <h3 class="veritas-popup-title">Veritas Intelligence Report</h3>
            </div>
            <div class="veritas-popup-claim">
                <strong>SUBJECT:</strong> "${result.claim}"
            </div>
            <div class="veritas-popup-status">
                <strong>VERDICT:</strong> ${result.status.toUpperCase()}
                <div class="veritas-meter">
                    <div class="veritas-progress credibility-${getCredibilityClass(result.credibility)}" 
                         style="width: ${result.credibility * 100}%"></div>
                </div>
            </div>
            <div class="veritas-popup-explanation">
                ${result.explanation}
            </div>
            ${sourcesHTML}
            <button class="veritas-popup-close">DISMISS PROTOCOL</button>
        </div>
    `;
    
    document.body.appendChild(popup);
    popup.querySelector('.veritas-popup-close').addEventListener('click', () => popup.remove());
}

function getCredibilityClass(score) {
    if (score > 0.7) return 'high';
    if (score > 0.4) return 'medium';
    return 'low';
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'runVeritasProtocol') {
        const claims = detectClaims();
        detectedClaims = claims.map(c => ({ text: c.text }));
        claims.forEach(c => highlightClaim(c.node, 0.5));
        sendResponse({ status: "highlighting_started", count: claims.length });
    }
    
    if (request.action === 'getClaims') {
        sendResponse({ claims: detectedClaims }); 
    }
    return true; 
});
