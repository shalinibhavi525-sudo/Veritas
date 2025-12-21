console.log('🔍 Veritas Content Script Loaded');

// Enhanced claim detection patterns
const CLAIM_PATTERNS = [
    // Scientific claims
    /according to (studies|research|experts|scientists|data|analysis)/i,
    /studies (show|showed|reveal|revealed|indicate|suggest|found|prove)/i,
    /research (suggests|indicates|found|claims|shows|proves)/i,
    /scientists (say|claim|found|argue|propose|discovered|concluded)/i,
    /experts (claim|say|believe|suggest|warn|recommend|agree)/i,
    /scientific (evidence|consensus|data) (shows|suggests|proves)/i,
    
    // Statistics and percentages
    /(\d+)%+ of (people|americans|users|population|adults|children)/i,
    /(\d+) out of (\d+) (people|americans|users)/i,
    
    // Conspiracy/rumor indicators
    /it is (well known|commonly believed|rumored|alleged|widely believed) that/i,
    /rumor (has it|says|claims) that/i,
    /legend (says|has it|tells us) that/i,
    /many (believe|think|claim|say|report) that/i,
    /some (people|sources|experts) (claim|say|suggest|report) that/i,
    /widely (reported|believed|thought|accepted) (to be|that)/i,
    /supposedly|allegedly|purportedly|reportedly|rumored to be/i,
    
    // Absolute statements (red flags!)
    /(always|never|every|all|no|none) [a-z]+ (are|is|do|does|will|can)/i,
    /everyone knows|nobody can deny|clearly|obviously|undeniably/i,
    /the truth is|it's a fact that|fact:|proven fact/i,
    
    // Celebrity/pop culture
    /(celebrity|actor|actress|singer|musician|star|famous|politician) (died|death|replaced|secretly|actually)/i,
    /is actually|was actually|really is|secret identity/i,
    
    // Conspiracy-specific
    /(flat earth|globe|spherical earth|geocentric)/i,
    /(conspiracy|cover-up|hidden truth|they don't want you to know|wake up)/i,
    /(illuminati|freemason|new world order|deep state)/i,
    /mainstream (media|science|narrative) (lies|hides|ignores)/i,
    /(clone|replaced by|body double|crisis actor)/i,
    
    // Health misinformation
    /(cure|treatment|remedy) for (cancer|diabetes|disease)/i,
    /(doctors|pharmaceutical|big pharma) (don't want|hiding|suppressing)/i,
    
    // Proven/confirmed claims
    /(proved|proven|confirmed|established|demonstrated) (that|to be)/i,
    /it is (known|proven|established|confirmed) that/i
];

/**
 * Detect claims on the page
 */
function detectClaims() {
    const claims = [];
    
    // Target specific elements that contain text content
    const selectors = [
        'p',           // Paragraphs
        'li',          // List items
        'dd',          // Definition descriptions
        'blockquote',  // Quotes
        'div.text',    // Common text containers
        'span.comment',// Comments
        'article p'    // Article paragraphs
    ];
    
    const elements = document.querySelectorAll(selectors.join(', '));
    
    elements.forEach(element => {
        // Skip if already highlighted
        if (element.querySelector('.veritas-highlight') || element.classList.contains('veritas-highlight')) {
            return;
        }
        
        const text = element.innerText?.trim() || '';
        
        // Check length constraints
        if (text.length < 25 || text.length > 800) {
            return;
        }
        
        // Check if matches any pattern
        const matchesPattern = CLAIM_PATTERNS.some(pattern => pattern.test(text));
        
        if (matchesPattern) {
            claims.push({
                node: element,
                text: text
            });
        }
    });
    
    console.log(`✅ Detected ${claims.length} potential claims`);
    return claims;
}

/**
 * Highlight a claim element
 */
function highlightClaim(element) {
    // Prevent double-highlighting
    if (element.querySelector('.veritas-highlight') || element.classList.contains('veritas-highlight')) {
        return;
    }
    
    // Wrap content in highlight span
    const wrapper = document.createElement('span');
    wrapper.className = 'veritas-highlight';
    wrapper.setAttribute('data-veritas-claim', 'true');
    
    // Move element's children into wrapper
    while (element.firstChild) {
        wrapper.appendChild(element.firstChild);
    }
    
    element.appendChild(wrapper);
    
    // Add click handler
    wrapper.addEventListener('click', (e) => {
        // Don't interfere with links
        if (e.target.tagName === 'A' || e.target.closest('a')) {
            return;
        }
        
        e.stopPropagation();
        checkClaim(wrapper.innerText);
    });
}

/**
 * Check a claim with the backend
 */
function checkClaim(claimText) {
    console.log('🔍 Checking claim:', claimText.substring(0, 50) + '...');
    
    // Add loading state to highlights
    const highlights = document.querySelectorAll('.veritas-highlight');
    highlights.forEach(h => {
        if (h.innerText.includes(claimText.substring(0, 30))) {
            h.classList.add('veritas-checking');
        }
    });
    
    // Send to background script
    chrome.runtime.sendMessage(
        { action: 'factCheck', claim: claimText },
        response => {
            // Remove loading state
            document.querySelectorAll('.veritas-checking')
                .forEach(h => h.classList.remove('veritas-checking'));
            
            if (response && response.result) {
                showClaimResult(response.result);
            } else {
                console.error('No response from background script');
            }
        }
    );
}

/**
 * Show fact-check result in modal
 */
function showClaimResult(result) {
    // Remove existing popup
    const existing = document.querySelector('.veritas-popup');
    if (existing) {
        existing.remove();
    }
    
    // Build sources HTML
    let sourcesHTML = '';
    if (result.sources && result.sources.length > 0) {
        const sourcesList = result.sources
            .map(url => `<li><a href="${url}" target="_blank" rel="noopener">${url}</a></li>`)
            .join('');
        sourcesHTML = `
            <div class="veritas-popup-sources">
                <strong>SOURCES:</strong>
                <ul>${sourcesList}</ul>
            </div>
        `;
    }
    
    // Determine credibility class
    const credibilityClass = getCredibilityClass(result.credibility);
    const credibilityPercent = Math.round(result.credibility * 100);
    
    // Create popup
    const popup = document.createElement('div');
    popup.className = 'veritas-popup';
    popup.innerHTML = `
        <div class="veritas-popup-card">
            <div class="veritas-popup-header">
                <span class="veritas-popup-icon">⚖️</span>
                <h3 class="veritas-popup-title">Veritas Intelligence Report</h3>
            </div>
            <div class="veritas-popup-claim">
                <strong>SUBJECT:</strong> "${result.claim.substring(0, 250)}${result.claim.length > 250 ? '...' : ''}"
            </div>
            <div class="veritas-popup-status">
                <strong>VERDICT:</strong> ${result.status.toUpperCase()}
                <span class="veritas-credibility-badge credibility-${credibilityClass}">
                    ${credibilityPercent}% CONFIDENCE
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
    
    // Close button handler
    popup.querySelector('.veritas-popup-close').addEventListener('click', () => {
        popup.remove();
    });
    
    // Click outside to close
    popup.addEventListener('click', (e) => {
        if (e.target === popup) {
            popup.remove();
        }
    });
}

/**
 * Get credibility CSS class
 */
function getCredibilityClass(score) {
    if (score >= 0.7) return 'high';
    if (score >= 0.4) return 'medium';
    return 'low';
}

// Message listener for extension actions
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('📨 Message received:', request.action);
    
    if (request.action === 'manualCheck') {
        // Right-click context menu check
        checkClaim(request.text);
        sendResponse({ status: 'checking' });
    }
    else if (request.action === 'runVeritasProtocol') {
        // Popup scan button
        const claims = detectClaims();
        claims.forEach(c => highlightClaim(c.node));
        sendResponse({ 
            status: 'highlighting_started',
            count: claims.length 
        });
    }
    else if (request.action === 'getClaims') {
        // Get current highlighted claims
        const highlighted = Array.from(document.querySelectorAll('.veritas-highlight'))
            .map(h => ({ text: h.innerText }));
        sendResponse({ claims: highlighted });
    }
    else if (request.action === 'scrollToClaim') {
        // Scroll to and check specific claim
        const highlights = document.querySelectorAll('.veritas-highlight');
        for (let h of highlights) {
            if (h.innerText.includes(request.text.substring(0, 30))) {
                h.scrollIntoView({ behavior: 'smooth', block: 'center' });
                h.style.outline = '2px solid #D4AF37';
                setTimeout(() => { h.style.outline = 'none'; }, 2000);
                checkClaim(h.innerText);
                break;
            }
        }
        sendResponse({ status: 'scrolled' });
    }
    
    return true;
});
