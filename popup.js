document.addEventListener('DOMContentLoaded', async () => {
    loadStats();
    
    document.getElementById('scanBtn').addEventListener('click', scanPage);
});

async function loadStats() {
    try {
        // Retrieve cached stats from chrome.storage
        const result = await chrome.storage.local.get(['claimsCount', 'pageUrl']);
        document.getElementById('claimsCount').textContent = result.claimsCount || 0;
        
        if (result.claimsCount > 0) {
            const score = calculatePageScore(result.claimsCount);
            document.getElementById('pageScore').textContent = score;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

function calculatePageScore(claimsCount) {
    if (claimsCount === 0) return 'A+';
    if (claimsCount < 3) return 'A';
    if (claimsCount < 5) return 'B';
    if (claimsCount < 10) return 'C';
    return 'D';
}

async function scanPage() {
    const loading = document.getElementById('loading');
    const claimsList = document.getElementById('claimsList');
    const scanBtn = document.getElementById('scanBtn');
    
    // UI state: Scanning started
    loading.style.display = 'block';
    claimsList.innerHTML = '';
    scanBtn.disabled = true;
    
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        // Step 1: Tell content.js to run the detection and highlight claims
        // Uses a Promise to correctly handle the asynchronous sendMessage and check for errors
        const highlightStarted = await new Promise((resolve, reject) => {
            chrome.tabs.sendMessage(tab.id, { action: 'runVeritasProtocol' }, (response) => {
                if (chrome.runtime.lastError) {
                    // Check for general connection error (e.g., content script not loaded on page)
                    reject(new Error(chrome.runtime.lastError.message));
                    return;
                }
                if (response?.status === 'highlighting_started') {
                    resolve(true);
                } else {
                    // This happens if content.js sends an unexpected response
                    reject(new Error("Content script failed to return 'highlighting_started' status."));
                }
            });
        });

        if (highlightStarted) {
            // Step 2: Get the list of detected claims from content.js 
            chrome.tabs.sendMessage(tab.id, { action: 'getClaims' }, (response) => {
                
                // UI state: Scanning complete
                loading.style.display = 'none';
                scanBtn.disabled = false;
                
                if (chrome.runtime.lastError) {
                    console.error("Get Claims Failed:", chrome.runtime.lastError.message);
                    claimsList.innerHTML = '<p style="color: white; padding: 10px;">Error: Failed to fetch claims.</p>';
                    return;
                }
                
                if (response && response.claims) {
                    displayClaims(response.claims);
                    
                    // Update Chrome Storage and UI
                    chrome.storage.local.set({
                        claimsCount: response.claims.length,
                        pageUrl: tab.url
                    });
                    
                    document.getElementById('claimsCount').textContent = response.claims.length;
                    const score = calculatePageScore(response.claims.length);
                    document.getElementById('pageScore').textContent = score;
                } else {
                    claimsList.innerHTML = '<p style="color: white; padding: 10px;">No claims data received.</p>';
                }
            });
        }

    } catch (error) {
        console.error('Fatal Scan error:', error);
        loading.style.display = 'none';
        scanBtn.disabled = false;
        claimsList.innerHTML = `<p style="color: white; padding: 10px;">Scan Failed. Error: ${error.message} 😥</p>`;
    }
}

function displayClaims(claims) {
    const claimsList = document.getElementById('claimsList');
    
    if (claims.length === 0) {
        claimsList.innerHTML = '<p style="color: white; padding: 10px; text-align: center;">No claims detected on this page! ✅</p>';
        return;
    }
    
    claims.slice(0, 10).forEach((claim, index) => {
        const claimItem = document.createElement('div');
        claimItem.className = 'claim-item';
        claimItem.innerHTML = `
            <strong>${index + 1}.</strong> ${claim.text.substring(0, 100)}${claim.text.length > 100 ? '...' : ''}
        `;
        
        claimItem.addEventListener('click', () => {
            const checkStatusSpan = document.createElement('span');
            checkStatusSpan.style.fontSize = '10px';
            checkStatusSpan.textContent = ' (Checking...)';
            claimItem.appendChild(checkStatusSpan);

            // Send fact-check request to background.js
            chrome.runtime.sendMessage({
                action: 'factCheck',
                claim: claim.text    
            }, (response) => {
                checkStatusSpan.remove();

                if (response && response.result) {
                    const result = response.result;
                    
                    claimItem.innerHTML = `
                        <strong>${index + 1}.</strong> ${claim.text.substring(0, 100)}${claim.text.length > 100 ? '...' : ''}
                        <br><span style="color:#a8dadc; font-weight:bold; font-size:11px;">Status: ${result.status}</span>
                        <span style="color:yellow; font-weight:bold; font-size:11px;"> | Credibility: ${result.credibility}</span>
                    `;
                } else {
                    claimItem.innerHTML += ' <span style="color:red; font-size:11px;">(Error: Failed to check)</span>';
                }
            });
        });
        
        claimsList.appendChild(claimItem);

    });
}

