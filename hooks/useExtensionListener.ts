import { useState, useEffect } from 'react';

// Declare chrome global to handle extension environments safely
declare const chrome: any;

export interface ExtensionContext {
  source: 'gmail';
  sender: string;
  body: string;
  subject: string;
  timestamp: string;
}

export interface MeetingStatus {
  source: 'meet';
  isRecording: boolean;
  timestamp: string;
}

export function useExtensionListener() {
  const [incomingContext, setIncomingContext] = useState<ExtensionContext | null>(null);
  const [meetingStatus, setMeetingStatus] = useState<MeetingStatus | null>(null);

  useEffect(() => {
    // Verify chrome runtime exists to avoid runtime errors in non-extension environments (standard web app)
    if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.onMessage) {
      return;
    }

    const messageListener = (message: any, sender: any, sendResponse: any) => {
      console.debug('[Sales Sidekik] Received extension message:', message.type);
      
      switch (message.type) {
        case 'CONTEXT_DETECTED':
          if (message.payload?.source === 'gmail') {
            setIncomingContext(message.payload);
          }
          break;
        case 'RECORDING_STATUS':
          if (message.payload?.source === 'meet') {
            setMeetingStatus(message.payload);
          }
          break;
      }
      
      // Mandatory for async messaging in extensions
      return true;
    };

    chrome.runtime.onMessage.addListener(messageListener);

    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, []);

  const clearIncomingContext = () => setIncomingContext(null);

  return { 
    incomingContext, 
    meetingStatus, 
    clearIncomingContext 
  };
}
