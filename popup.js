document.addEventListener('DOMContentLoaded', async () => {
    loadStats();
    
    document.getElementById('scanBtn').addEventListener('click', scanPage);
});

async function loadStats() {
    try {
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
    
    loading.style.display = 'block';
    claimsList.innerHTML = '';
    scanBtn.disabled = true;
    
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
       chrome.tabs.sendMessage(tab.id, { action: 'runVeritasProtocol' }, () => {
             chrome.tabs.sendMessage(tab.id, { action: 'getClaims' }, (response) => {
                 loading.style.display = 'none';
                 scanBtn.disabled = false;
                 
                 if (response && response.claims) {
                     displayClaims(response.claims);
                     
                     chrome.storage.local.set({
                         claimsCount: response.claims.length,
                         pageUrl: tab.url
                     });
                     
                     document.getElementById('claimsCount').textContent = response.claims.length;
                     const score = calculatePageScore(response.claims.length);
                     document.getElementById('pageScore').textContent = score;
                 } else {
                    claimsList.innerHTML = '<p style="color: white; padding: 10px;">Error: Content script did not respond. Check permissions/console.</p>';
                 }
             });
        });
    } catch (error) {
        console.error('Scan error:', error);
        loading.style.display = 'none';
        scanBtn.disabled = false;
        claimsList.innerHTML = '<p style="color: white; padding: 10px;">Error scanning page. Please refresh and try again.</p>';
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
            alert('Fact-checking: ' + claim.text + '\n\nFull fact-check feature coming soon!');
        });
        claimsList.appendChild(claimItem);
    });
}
