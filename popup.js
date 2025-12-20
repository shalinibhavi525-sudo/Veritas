document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('scanBtn').addEventListener('click', scanPage);
});

async function scanPage() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const scanBtn = document.getElementById('scanBtn');
    
    scanBtn.disabled = true;
    scanBtn.textContent = "Scanning...";

    chrome.tabs.sendMessage(tab.id, { action: 'runVeritasProtocol' }, (response) => {
        if (chrome.runtime.lastError) {
            alert("Please refresh the page and try again.");
            scanBtn.disabled = false;
            return;
        }
        
        document.getElementById('claimsCount').textContent = response.count || 0;
        scanBtn.textContent = "Scan Complete";
        setTimeout(() => { scanBtn.disabled = false; scanBtn.textContent = "Scan This Page"; }, 2000);
    });
}
