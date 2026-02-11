
/**
 * Sales Sidekik - The "Eyes" of the Extension
 * Monitors Gmail for email context and Google Meet for privacy compliance.
 */

const LOG_PREFIX = '[Sales Sidekik]';

// State trackers to prevent message spam
let lastScrapedEmailId = null;
let lastRecordingStatus = null;

/**
 * GMAIL SCRAPER LOGIC
 * Domain: mail.google.com
 */
function handleGmail() {
  console.log(`${LOG_PREFIX} Monitoring Gmail for context...`);

  const observer = new MutationObserver(() => {
    try {
      // Standard Gmail Selectors (Note: These classes are stable but handled with safety checks)
      const bodyNode = document.querySelector('.a3s.aiL'); // The specific container for email body text
      const subjectNode = document.querySelector('h2.hP'); // The thread subject line
      const senderNode = document.querySelector('span.gD'); // The sender display span

      if (bodyNode && subjectNode) {
        const subject = subjectNode.innerText.trim();
        const sender = senderNode ? (senderNode.getAttribute('email') || senderNode.innerText || 'Unknown Sender') : 'Unknown Sender';
        const body = bodyNode.innerText.trim();

        // Create a simple fingerprint to detect if we've actually moved to a NEW email
        // Combining subject and the first 100 characters of the body
        const emailFingerprint = btoa(unescape(encodeURIComponent(subject + body.substring(0, 100))));

        if (emailFingerprint !== lastScrapedEmailId) {
          lastScrapedEmailId = emailFingerprint;
          console.log(`${LOG_PREFIX} New Email Detected:`, subject);

          chrome.runtime.sendMessage({
            type: 'CONTEXT_DETECTED',
            payload: {
              source: 'gmail',
              subject: subject,
              sender: sender,
              body: body,
              timestamp: new Date().toISOString()
            }
          }).catch(() => {
            // Error usually means the sidebar isn't open, which is expected behavior
            console.debug(`${LOG_PREFIX} Context gathered but Sidebar is inactive.`);
          });
        }
      }
    } catch (err) {
      console.error(`${LOG_PREFIX} Scraper Error:`, err);
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

/**
 * GOOGLE MEET WATCHDOG
 * Domain: meet.google.com
 */
function handleMeet() {
  console.log(`${LOG_PREFIX} Monitoring Meet for recording status...`);

  const observer = new MutationObserver(() => {
    try {
      // 1. Check for the aria-label used by the recording indicator
      const recordingIndicator = document.querySelector('[aria-label*="Recording"], [data-is-recording="true"]');
      
      // 2. Check for the red "REC" badge text that appears in the UI
      const recBadge = Array.from(document.querySelectorAll('div, span')).find(el => 
        el.textContent === 'REC' || (el.innerText && el.innerText.includes('Recording'))
      );

      const isRecording = !!(recordingIndicator || recBadge);

      if (isRecording !== lastRecordingStatus) {
        lastRecordingStatus = isRecording;
        console.log(`${LOG_PREFIX} Privacy Status Update - Recording:`, isRecording);

        chrome.runtime.sendMessage({
          type: 'RECORDING_STATUS',
          payload: {
            source: 'meet',
            isRecording: isRecording,
            timestamp: new Date().toISOString()
          }
        }).catch(() => {
          console.debug(`${LOG_PREFIX} Meet status changed but Sidebar is inactive.`);
        });
      }
    } catch (err) {
      console.error(`${LOG_PREFIX} Meet Monitor Error:`, err);
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

/**
 * INITIALIZATION
 * Domain-specific routing
 */
function init() {
  const hostname = window.location.hostname;

  if (hostname.includes('mail.google.com')) {
    handleGmail();
  } else if (hostname.includes('meet.google.com')) {
    handleMeet();
  }
}

// Start monitoring when the page is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
