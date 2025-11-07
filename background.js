console.log('Veritas background service running');

const FACTCHECK_APIS = {
  google: 'https://factchecktools.googleapis.com/v1alpha1/claims:search',
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'runVeritasProtocol') {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            if (tabs.length > 0) {
                chrome.tabs.sendMessage(tabs[0].id, request, function(response) {
                    sendResponse(response);
                });
            } else {
                sendResponse({ status: 'error', message: 'No active tab.' });
            }
        });
        // CRUCIAL: Must return true for the asynchronous response
        return true; 
    }
  if (request.action === 'factCheck') {
    checkClaimWithAPIs(request.claim)
      .then(result => sendResponse({ result }))
      .catch(error => sendResponse({ error: error.message }));
    return true; 
  }
});

async function checkClaimWithAPIs(claimText) {
  try {
    
    const result = await simulateFactCheck(claimText);
    return result;
    
  } catch (error) {
    console.error('Fact-check error:', error);
    return {
      claim: claimText,
      status: 'Unable to verify',
      explanation: 'Could not connect to fact-checking services.',
      credibility: 0.5
    };
  }
}

async function simulateFactCheck(claim) {
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const lowCredibilityKeywords = ['always', 'never', 'everyone', 'nobody', '100%'];
  const hasLowCredibility = lowCredibilityKeywords.some(keyword => 
    claim.toLowerCase().includes(keyword)
  );
  
  if (hasLowCredibility) {
    return {
      claim: claim,
      status: 'Likely False or Misleading',
      explanation: 'Absolute statements like this are often oversimplifications. Reality is usually more nuanced.',
      credibility: 0.3
    };
  }
  
  return {
    claim: claim,
    status: 'Needs Verification',
    explanation: 'This claim should be verified with authoritative sources. No definitive fact-check found.',
    credibility: 0.5
  };
}

async function checkWithGoogleAPI(claim) {
 
}
