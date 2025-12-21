document.addEventListener('DOMContentLoaded', async () => {
    console.log('🎯 Veritas popup initialized');
    
    // Load saved stats
    const stats = await chrome.storage.local.get(['claimsCount', 'lastScore']);
    document.getElementById('claimsCount').textContent = stats.claimsCount || 0;
    document.getElementById('pageScore').textContent = stats.lastScore || '--';
    
    // Scan button handler
    document.getElementById('scanBtn').addEventListener('click', scanPage);
});

/**
 * Scan the current page for claims
 */
async function scanPage() {
    const loading = document.getElementById('loading');
    const claimsList = document.getElementById('claimsList');
    const scanBtn = document.getElementById('scanBtn');
    
    // Show loading state
    loading.style.display = 'block';
    claimsList.innerHTML = '';
    scanBtn.disabled = true;
    scanBtn.textContent = 'SCANNING...';
    
    try {
        // Get active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab || !tab.id) {
            throw new Error('No active tab found');
        }
        
        // Send scan message to content script
        chrome.tabs.sendMessage(
            tab.id,
            { action: 'runVeritasProtocol' },
            (response) => {
                // Hide loading
                loading.style.display = 'none';
                scanBtn.disabled = false;
                scanBtn.textContent = 'COMMENCE PROTOCOL';
                
                // Check for errors
                if (chrome.runtime.lastError) {
                    console.error('Runtime error:', chrome.runtime.lastError);
                    claimsList.innerHTML = `
                        <p style="text-align:center; padding:20px; color:#D4AF37; font-size:12px;">
                            ⚠️ Please refresh the page to initialize Veritas Protocol
                        </p>
                    `;
                    return;
                }
                
                if (!response) {
                    claimsList.innerHTML = `
                        <p style="text-align:center; padding:20px; color:#D4AF37; font-size:12px;">
                            ⚠️ Content script not responding. Please refresh the page.
                        </p>
                    `;
                    return;
                }
                
                // Update stats
                const count = response.count || 0;
                const score = calculatePageScore(count);
                
                document.getElementById('claimsCount').textContent = count;
                document.getElementById('pageScore').textContent = score;
                
                // Save stats
                chrome.storage.local.set({ 
                    claimsCount: count, 
                    lastScore: score 
                });
                
                // Get and display claims
                chrome.tabs.sendMessage(
                    tab.id,
                    { action: 'getClaims' },
                    (claimsResponse) => {
                        if (claimsResponse && claimsResponse.claims) {
                            displayClaimsList(claimsResponse.claims, tab.id);
                        }
                    }
                );
            }
        );
        
    } catch (error) {
        console.error('Scan error:', error);
        loading.style.display = 'none';
        scanBtn.disabled = false;
        scanBtn.textContent = 'COMMENCE PROTOCOL';
        claimsList.innerHTML = `
            <p style="text-align:center; padding:20px; color:#e57373; font-size:12px;">
                ❌ Error: ${error.message}
            </p>
        `;
    }
}

/**
 * Calculate integrity score based on claim count
 */
function calculatePageScore(count) {
    if (count === 0) return 'A+';
    if (count < 3) return 'A';
    if (count < 8) return 'B';
    if (count < 15) return 'C';
    return 'D';
}

/**
 * Display list of claims in popup
 */
function displayClaimsList(claims, tabId) {
    const list = document.getElementById('claimsList');
    list.innerHTML = '';
    
    if (!claims || claims.length === 0) {
        list.innerHTML = `
            <p style="text-align:center; font-size:12px; opacity:0.7; padding:20px; color:#81c784;">
                ✓ No suspicious claims detected on this page.
            </p>
        `;
        return;
    }
    
    // Display up to 20 claims
    claims.slice(0, 20).forEach((claim, index) => {
        const item = document.createElement('div');
        item.className = 'claim-item';
        
        // Truncate long claims
        const displayText = claim.text.length > 80 
            ? claim.text.substring(0, 80) + '...'
            : claim.text;
        
        item.innerHTML = `<strong>${index + 1}.</strong> ${displayText}`;
        
        // Click to scroll to claim and check it
        item.onclick = () => {
            chrome.tabs.sendMessage(
                tabId,
                { 
                    action: 'scrollToClaim',
                    text: claim.text 
                }
            );
        };
        
        list.appendChild(item);
    });
    
    // Show count if more than 20
    if (claims.length > 20) {
        const moreItem = document.createElement('p');
        moreItem.style.cssText = 'text-align:center; font-size:11px; opacity:0.5; padding:10px;';
        moreItem.textContent = `+ ${claims.length - 20} more claims detected`;
        list.appendChild(moreItem);
    }
    }
