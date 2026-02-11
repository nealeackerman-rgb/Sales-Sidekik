// Type definitions for Google Identity Services and GAPI
declare global {
  interface Window {
    google: any;
    gapi: any;
  }
}

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ''; 
const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/documents https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/presentations';

export class GoogleIntegrationService {
  private tokenClient: any;
  private accessToken: string | null = null;
  private gapiInited = false;
  private gisInited = false;

  constructor() {
    this.loadScripts();
  }

  private loadScripts() {
    // Load GAPI
    if (!window.gapi) {
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => {
        window.gapi.load('client', () => {
          this.gapiInited = true;
        });
      };
      document.body.appendChild(script);
    } else {
      this.gapiInited = true;
    }

    // Load GIS
    if (!window.google) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.onload = () => {
        this.gisInited = true;
      };
      document.body.appendChild(script);
    } else {
      this.gisInited = true;
    }
  }

  public async connect(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!CLIENT_ID) {
        alert("Configuration Error: GOOGLE_CLIENT_ID is missing in environment variables. Please add it to enable Google integration.");
        resolve(false);
        return;
      }

      if (!this.gisInited) {
        setTimeout(() => this.connect().then(resolve), 500);
        return;
      }

      this.tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (response: any) => {
          if (response.error !== undefined) {
            reject(response);
          }
          this.accessToken = response.access_token;
          resolve(true);
        },
      });

      // Request token
      this.tokenClient.requestAccessToken();
    });
  }

  public isConnected(): boolean {
    return !!this.accessToken;
  }

  // --- API CALLS ---

  private async callApi(endpoint: string, method: string, body?: any) {
    if (!this.accessToken) throw new Error("Not connected to Google");

    const headers: any = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json'
    };

    const response = await fetch(endpoint, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Google API Error");
    }

    return response.json();
  }

  // 1. Google Docs
  public async createDoc(title: string, markdownContent: string) {
    // 1. Create File
    const doc = await this.callApi('https://docs.googleapis.com/v1/documents', 'POST', { title });
    
    // 2. Parse Markdown to requests
    // Simple parser: Headers and Text
    const requests: any[] = [];
    let currentIndex = 1;
    const lines = markdownContent.split('\n');

    // Insert text first (in reverse order to keep indices simple, or just append)
    // Actually, simple append works if we calculate index, but simple insert at index 1 works for bulk
    
    // We will dump all text then format it.
    const textToInsert = lines.join('\n');
    requests.push({
      insertText: {
        text: textToInsert,
        location: { index: 1 }
      }
    });

    // Formatting Pass (simplified)
    let runningIndex = 1;
    lines.forEach(line => {
        const len = line.length + 1; // +1 for newline
        if (line.startsWith('# ')) {
            requests.push({
                updateParagraphStyle: {
                    range: { startIndex: runningIndex, endIndex: runningIndex + len },
                    paragraphStyle: { namedStyleType: 'HEADING_1' },
                    fields: 'namedStyleType'
                }
            });
        } else if (line.startsWith('## ')) {
            requests.push({
                updateParagraphStyle: {
                    range: { startIndex: runningIndex, endIndex: runningIndex + len },
                    paragraphStyle: { namedStyleType: 'HEADING_2' },
                    fields: 'namedStyleType'
                }
            });
        }
        runningIndex += len;
    });

    await this.callApi(`https://docs.googleapis.com/v1/documents/${doc.documentId}:batchUpdate`, 'POST', { requests });
    return `https://docs.google.com/document/d/${doc.documentId}/edit`;
  }

  // 2. Google Sheets
  public async createSheet(title: string, csvContent: string) {
    const sheet = await this.callApi('https://sheets.googleapis.com/v4/spreadsheets', 'POST', { 
        properties: { title } 
    });

    const rows = csvContent.split('\n').map(r => r.split(',')); // Basic Split, ignores quoted commas for simplicity in this demo

    await this.callApi(`https://sheets.googleapis.com/v4/spreadsheets/${sheet.spreadsheetId}/values/A1:append?valueInputOption=USER_ENTERED`, 'POST', {
        values: rows
    });

    return `https://docs.google.com/spreadsheets/d/${sheet.spreadsheetId}/edit`;
  }

  // 3. Google Slides
  public async createPresentation(title: string, slidesJson: string) {
    const presentation = await this.callApi('https://slides.googleapis.com/v1/presentations', 'POST', { title });
    const presentationId = presentation.presentationId;
    let slidesData: any[] = [];
    
    try {
        slidesData = JSON.parse(slidesJson);
    } catch {
        throw new Error("Invalid Slides JSON");
    }

    const requests: any[] = [];

    // Create slides
    slidesData.forEach((slide, i) => {
        const slideId = `slide_${i}`;
        const titleId = `title_${i}`;
        const bodyId = `body_${i}`;

        requests.push({
            createSlide: {
                objectId: slideId,
                slideLayoutReference: { predefinedLayout: 'TITLE_AND_BODY' },
                placeholderIdMappings: [
                    { layoutPlaceholder: { type: 'TITLE' }, objectId: titleId },
                    { layoutPlaceholder: { type: 'BODY' }, objectId: bodyId }
                ]
            }
        });

        // Insert Title
        requests.push({
            insertText: {
                objectId: titleId,
                text: slide.title
            }
        });

        // Insert Bullets
        if (slide.bullets && Array.isArray(slide.bullets)) {
            const bulletText = slide.bullets.map((b: string) => `• ${b}\n`).join('');
            requests.push({
                insertText: {
                    objectId: bodyId,
                    text: bulletText
                }
            });
        }
    });

    if (requests.length > 0) {
        await this.callApi(`https://slides.googleapis.com/v1/presentations/${presentationId}:batchUpdate`, 'POST', { requests });
    }

    return `https://docs.google.com/presentation/d/${presentationId}/edit`;
  }
}

export const googleIntegration = new GoogleIntegrationService();