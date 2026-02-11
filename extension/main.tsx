
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from '../App';

// For now, we reuse the main App, but we can later create a 
// specialized ExtensionApp that hides main navigation.
const rootElement = document.getElementById('sidepanel-root');
if (!rootElement) {
  throw new Error("Could not find sidepanel-root element");
}

try {
  const root = createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <div className="extension-container h-screen overflow-hidden">
        <App />
      </div>
    </React.StrictMode>
  );
} catch (error) {
  console.error("Failed to mount Extension UI:", error);
}
