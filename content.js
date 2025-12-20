console.log('🔍 Veritas Protocol Active');

const CLAIM_PATTERNS = [
    /according to (studies|research|experts)/i,
    /studies show/i,
    /research suggests/i,
    /scientists (say|claim|found)/i,
    /(\d+)% of (people|americans|users)/i,
    /fact:/i,
    /it is (known|proven|established) that/i,
    /experts (claim|say|believe)/i
];

function detectClaims() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    const claims = [];
    let node;

    while (node = walker.nextNode()) {
        const text = node.textContent.trim();
        if (text.length > 25 && text.length < 250) {
            if (CLAIM_PATTERNS.some(pattern => pattern.test(text))) {
                claims.push({ text: text, node: node });
            }
        }
    }
    return claims;
}

function highlightClaim(node) {
    if (node.parentElement.classList.contains('veritas-highlight')) return;
    const span = document.createElement('span');
    span.className = 'veritas-highlight';
    span.textContent = node.textContent;
    node.parentNode.replaceChild(span, node);
    span.addEventListener('click', () => checkClaim(span.textContent));
}

function checkClaim(claimText) {
    chrome.runtime.sendMessage({ action: 'factCheck', claim: claimText }, response => {
        if (response?.result) showClaimResult(response.result);
    });
}

function getCredibilityClass(score) {
    if (score > 0.7) return 'high';
    if (score > 0.4) return 'medium';
    return 'low';
}

function showClaimResult(result) {
    const existing = document.querySelector('.veritas-popup');
    if (existing) existing.remove();

    const sourcesHTML = result.sources?.length 
        ? `<div class="veritas-popup-sources"><strong>Sources:</strong><ul>${result.sources.map(s => `<li><a href="${s}" target="_blank">${s}</a></li>`).join('')}</ul></div>` 
        : '';

    const popup = document.createElement('div');
    popup.className = 'veritas-popup';
    popup.innerHTML = `
        <div class="veritas-popup-card">
            <div class="veritas-popup-header">
                <span class="veritas-popup-icon">⚖️</span>
                <h3 class="veritas-popup-title">Veritas Analysis</h3>
            </div>
            <div class="veritas-popup-claim">"${result.claim}"</div>
            <div class="veritas-popup-status">
                <strong>Status:</strong> ${result.status}
                <span class="veritas-credibility-badge credibility-${getCredibilityClass(result.credibility)}">
                    ${Math.round(result.credibility * 100)}% Credibility
                </span>
            </div>
            <div class="veritas-popup-explanation">${result.explanation}</div>
            ${sourcesHTML}
            <button class="veritas-popup-close">DISMISS</button>
        </div>
    `;
    document.body.appendChild(popup);
    popup.querySelector('.veritas-popup-close').addEventListener('click', () => popup.remove());
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'runVeritasProtocol') {
        const claims = detectClaims();
        claims.forEach(c => highlightClaim(c.node));
        sendResponse({ status: "highlighting_started", count: claims.length });
    }
    if (request.action === 'getClaims') {
        const currentClaims = detectClaims().map(c => ({ text: c.text }));
        sendResponse({ claims: currentClaims });
    }
    return true;
});
