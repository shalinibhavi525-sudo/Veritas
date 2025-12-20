console.log('⚖️ Veritas Sentinel Protocol: Online');

const CLAIM_PATTERNS = [
    /according to (studies|research|experts|proponents|critics|sources)/i,
    /studies (show|revealed|indicate|suggest)/i,
    /research (suggests|indicates|found|claims)/i,
    /scientists (say|claim|found|argue|propose)/i,
    /experts (claim|say|believe|suggest|warn)/i,
    
    /(proponents|advocates|adherents|members) (argue|claim|state|hold|maintain)/i,
    /it is (claimed|rumored|alleged|purported|argued) that/i,
    /the (idea|theory|hypothesis|belief) that/i,
    /supposedly|allegedly|purportedly|reportedly/i,
    /often (described|referred to) as/i,
    /commonly (believed|thought) to/i,
    
    /(\d+)% of (people|americans|users|scientists|population)/i,
    /fact:|the truth is|it's a fact that/i,
    /everyone knows|no one can deny|clearly|obviously/i,
    
    /(flat|globe|spherical) earth/i,
    /conspiracy|hoax|hidden|secret (truth|data|evidence)/i,
    /mainstream (science|media|narrative)/i,
    /alternative (theory|explanation|history)/i
];

function detectClaims() {
    const claims = [];
    const elements = document.querySelectorAll('p, li, dd, div.flex-1');

    elements.forEach(el => {
        const text = el.innerText.trim();
        
        if (text.length > 25 && text.length < 800) {
            if (CLAIM_PATTERNS.some(pattern => pattern.test(text))) {
                // Logic to prevent double-highlighting
                if (!el.closest('.veritas-highlight')) {
                    claims.push({ node: el, text: text });
                }
            }
        }
    });
    return claims;
}

function highlightClaim(element) {
    if (element.querySelector('.veritas-highlight')) return;

    const wrapper = document.createElement('span');
    wrapper.className = 'veritas-highlight';
    
    while (element.firstChild) {
        wrapper.appendChild(element.firstChild);
    }
    
    element.appendChild(wrapper);

    wrapper.addEventListener('click', (e) => {
        if (e.target.tagName === 'A' || e.target.closest('a')) return;
        
        checkClaim(wrapper.innerText);
    });
}

function checkClaim(claimText) {
    const highlights = document.querySelectorAll('.veritas-highlight');
    highlights.forEach(h => {
        if (h.innerText.includes(claimText.substring(0, 20))) {
            h.classList.add('veritas-checking');
        }
    });

    chrome.runtime.sendMessage({ action: 'factCheck', claim: claimText }, response => {
        document.querySelectorAll('.veritas-checking').forEach(h => h.classList.remove('veritas-checking'));
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
                <strong>SUBJECT:</strong> "${result.claim.substring(0, 200)}${result.claim.length > 200 ? '...' : ''}"
            </div>
            <div class="veritas-popup-status">
                <strong>VERDICT:</strong> ${result.status.toUpperCase()}
                <span class="veritas-credibility-badge credibility-${getCredibilityClass(result.credibility)}">
                    ${Math.round(result.credibility * 100)}% Confidence
                </span>
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
        claims.forEach(c => highlightClaim(c.node));
        sendResponse({ status: "highlighting_started", count: claims.length });
    }
    
    if (request.action === 'getClaims') {
        const currentHighlights = Array.from(document.querySelectorAll('.veritas-highlight')).map(h => ({ text: h.innerText }));
        sendResponse({ claims: currentHighlights }); 
    }
    return true; 
});
