const CLAIM_PATTERNS = [
    // 1. Standard Authority (Science/Academic)
    /according to (studies|research|experts|proponents|critics|sources|officials)/i,
    /studies (show|revealed|indicate|suggest)/i,
    /research (suggests|indicates|found|claims)/i,
    /scientists (say|claim|found|argue|propose)/i,
    /experts (claim|say|believe|suggest|warn)/i,
    
    // 2. Rumor & Legend Indicators (NEW: Catching Paul McCartney type claims)
    /it is (well known|commonly believed|rumored|alleged|purported|argued) that/i,
    /rumor (has it|says|claims) that/i,
    /legend (says|has it) that/i,
    /many (believe|think|claim|say) that/i,
    /some (people|sources) (claim|say|suggest) that/i,
    /widely (reported|believed|thought) to/i,
    /supposedly|allegedly|purportedly|reportedly/i,
    
    // 3. Absolute & Suspicious Statements
    /(\d+)% of (people|americans|users|population)/i,
    /fact:|the truth is|it's a fact that/i,
    /no one can deny|clearly|obviously|everyone knows/i,
    
    // 4. Fringe/Conspiracy Specifics
    /flat|globe|spherical earth/i,
    /conspiracy|hoax|hidden|secret (truth|data|evidence|replacement|clone)/i,
    /mainstream (science|media|narrative)/i,
    /alternative (theory|explanation|history)/i,
    /replaced by|lookalike|clone|secretly/i
];
function detectClaims() {
    const claims = [];
    const elements = document.querySelectorAll('p, li, dd, div.flex-1');
    elements.forEach(el => {
        const text = el.innerText.trim();
        if (text.length > 25 && text.length < 800) {
            if (CLAIM_PATTERNS.some(p => p.test(text))) {
                if (!el.querySelector('.veritas-highlight')) claims.push({ node: el, text: text });
            }
        }
    });
    return claims;
}

function highlightClaim(element) {
    if (element.querySelector('.veritas-highlight')) return;
    const wrapper = document.createElement('span');
    wrapper.className = 'veritas-highlight';
    while (element.firstChild) wrapper.appendChild(element.firstChild);
    element.appendChild(wrapper);
    wrapper.addEventListener('click', (e) => {
        if (e.target.tagName === 'A' || e.target.closest('a')) return;
        checkClaim(wrapper.innerText);
    });
}

function checkClaim(claimText) {
    const highlights = document.querySelectorAll('.veritas-highlight');
    highlights.forEach(h => {
        if (h.innerText.includes(claimText.substring(0, 20))) h.classList.add('veritas-checking');
    });
    chrome.runtime.sendMessage({ action: 'factCheck', claim: claimText }, response => {
        document.querySelectorAll('.veritas-checking').forEach(h => h.classList.remove('veritas-checking'));
        if (response && response.result) showClaimResult(response.result);
    });
}

function showClaimResult(result) {
    const existing = document.querySelector('.veritas-popup');
    if (existing) existing.remove();
    const popup = document.createElement('div');
    popup.className = 'veritas-popup';
    popup.innerHTML = `
        <div class="veritas-popup-card">
            <div class="veritas-popup-header"><span class="veritas-popup-icon">⚖️</span><h3 class="veritas-popup-title">Veritas Intelligence Report</h3></div>
            <div class="veritas-popup-claim"><strong>SUBJECT:</strong> "${result.claim.substring(0, 200)}..."</div>
            <div class="veritas-popup-status"><strong>VERDICT:</strong> ${result.status.toUpperCase()} <span class="veritas-credibility-badge credibility-${getCredibilityClass(result.credibility)}">${Math.round(result.credibility * 100)}% Confidence</span></div>
            <div class="veritas-popup-explanation">${result.explanation}</div>
            <div class="veritas-popup-sources"><strong>SOURCES:</strong><ul>${(result.sources || []).map(s => `<li><a href="${s}" target="_blank">${s}</a></li>`).join('')}</ul></div>
            <button class="veritas-popup-close">DISMISS PROTOCOL</button>
        </div>`;
    document.body.appendChild(popup);
    popup.querySelector('.veritas-popup-close').addEventListener('click', () => popup.remove());
}

function getCredibilityClass(score) {
    if (score > 0.7) return 'high';
    if (score > 0.4) return 'medium';
    return 'low';
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
       if (request.action === 'manualCheck') {
        checkClaim(request.text);
    } else if (request.action === 'runVeritasProtocol') {
        const claims = detectClaims();
        claims.forEach(c => highlightClaim(c.node));
        sendResponse({ status: "highlighting_started", count: claims.length });
    } else if (request.action === 'getClaims') {
        const current = Array.from(document.querySelectorAll('.veritas-highlight')).map(h => ({ text: h.innerText }));
        sendResponse({ claims: current });
    } else if (request.action === 'scrollToClaim') {
        const highlights = document.querySelectorAll('.veritas-highlight');
        for (let h of highlights) {
            if (h.innerText.includes(request.text.substring(0, 20))) {
                h.scrollIntoView({ behavior: 'smooth', block: 'center' });
                h.style.outline = "2px solid #D4AF37";
                setTimeout(() => { h.style.outline = "none"; }, 2000);
                checkClaim(h.innerText);
                break;
            }
        }
    }
    return true; 
});
