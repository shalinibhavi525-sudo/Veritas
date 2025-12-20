document.addEventListener('DOMContentLoaded', async () => {
    // Load stored stats on open
    const result = await chrome.storage.local.get(['claimsCount', 'lastScore']);
    document.getElementById('claimsCount').textContent = result.claimsCount || 0;
    document.getElementById('pageScore').textContent = result.lastScore || '--';
    
    document.getElementById('scanBtn').addEventListener('click', scanPage);
});

async function scanPage() {
    const loading = document.getElementById('loading');
    const claimsList = document.getElementById('claimsList');
    const scanBtn = document.getElementById('scanBtn');
    
    loading.style.display = 'block';
    claimsList.innerHTML = '';
    scanBtn.disabled = true;
    scanBtn.textContent = "COMMENCING SCAN...";
    
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        chrome.tabs.sendMessage(tab.id, { action: 'runVeritasProtocol' }, (response) => {
            loading.style.display = 'none';
            scanBtn.disabled = false;
            scanBtn.textContent = "SCAN THIS PAGE";

            if (chrome.runtime.lastError || !response) {
                claimsList.innerHTML = '<p style="text-align:center; padding:10px;">Please refresh the page to initialize Veritas.</p>';
                return;
            }

            const count = response.count || 0;
            const score = calculatePageScore(count);
            
            document.getElementById('claimsCount').textContent = count;
            document.getElementById('pageScore').textContent = score;

            chrome.storage.local.set({ claimsCount: count, lastScore: score });
            
            // Fetch the text list of claims to show in popup
            chrome.tabs.sendMessage(tab.id, { action: 'getClaims' }, (res) => {
                if (res && res.claims) displayClaimsList(res.claims);
            });
        });
    } catch (error) {
        loading.style.display = 'none';
        scanBtn.disabled = false;
    }
}

function calculatePageScore(count) {
    if (count === 0) return 'A+';
    if (count < 3) return 'A';
    if (count < 6) return 'B';
    return 'C';
}

function displayClaimsList(claims) {
    const list = document.getElementById('claimsList');
    list.innerHTML = ''; 
    
    if (claims.length === 0) {
        list.innerHTML = '<p style="text-align:center; font-size:12px; opacity:0.7;">No suspicious claims detected.</p>';
        return;
    }
    
    claims.forEach((claim, i) => {
        const item = document.createElement('div');
        item.className = 'claim-item';
        item.innerHTML = `<strong>${i+1}.</strong> ${claim.text.substring(0, 60)}...`;
        
        // This makes the claim in the list clickable!
        item.onclick = () => {
            chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                chrome.tabs.sendMessage(tabs[0].id, { 
                    action: 'scrollToClaim', 
                    text: claim.text 
                });
            });
        };
        list.appendChild(item);
    });
}
    
    claims.forEach((claim, i) => {
        const item = document.createElement('div');
        item.className = 'claim-item';
        item.innerHTML = `<strong>${i+1}.</strong> ${claim.text.substring(0, 60)}...`;
        item.onclick = () => {
            // Send message to content script to check this specific one
            chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                chrome.tabs.sendMessage(tabs[0].id, { action: 'factCheck', claim: claim.text });
            });
        };
        list.appendChild(item);
    });
}
