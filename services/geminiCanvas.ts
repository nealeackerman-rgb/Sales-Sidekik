
import { GoogleGenAI } from "@google/genai";
import { Account, SellerInfo, CanvasMode, BridgeOutput, AuditType, AuditResult, Frameworks, FrameworkCategory, GeneratedContent, DeckStrategy } from "../types";
import { getLogContext, getFamilyContext } from './geminiService';

export class GeminiCanvasService {
  // Always create a new GoogleGenAI instance right before making an API call to ensure it always uses the most up-to-date API key.
  private get ai() {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  private async retryOperation<T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
    try {
      return await fn();
    } catch (error: any) {
      const msg = error?.message || JSON.stringify(error);
      const isRateLimit = msg.includes('429') || msg.includes('503') || msg.includes('quota');
      
      if (isRateLimit && retries > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.retryOperation(fn, retries - 1, delay * 2);
      }
      throw error;
    }
  }

  async generateDeckPrescription(
    account: Account,
    sellerInfo: SellerInfo,
    frameworks: Frameworks,
    fileData: string,
    mimeType: string,
    allAccounts: Account[],
    userContext: string
  ): Promise<DeckStrategy> {
    return this.retryOperation(async () => {
      const logContext = getLogContext(account);
      const familyContext = getFamilyContext(account, allAccounts);
      const presentationFramework = frameworks[FrameworkCategory.SOLUTION_PRESENTATION] || "Standard Professional Presentation";

      const prompt = `
        Role: Strategic Presentation Architect. 
        Task: Audit the uploaded Account Plan slides. Tell the user EXACTLY what text to copy/paste to win this deal.

        **CRITICAL CONSTRAINT (THE METHODOLOGY):**
        You must align your slide selection and copy advice to this Sales Framework:
        "${presentationFramework}"
        (e.g. If MEDDIC, ensure Metrics and Decision Criteria are highlighted. If Challenger, lead with Commercial Insight).
        
        **USER CONTEXT FOR THIS DECK:**
        "${userContext}"

        **INPUT CONTEXT:**
        Account: ${account.name}
        CORPORATE FAMILY CONTEXT: ${familyContext} (CRITICAL: Use this to answer questions about cross-selling or case studies).
        CRM Evidence: ${logContext}
        
        **OUTPUT REQUIREMENTS:**
        Return a JSON object matching the DeckStrategy interface.
        For 'Plan of Attack' slides, explicitly reference the Family Context if valid (e.g., 'Leverage [Sibling] success').

        **SCHEMA:**
        {
          "strategySummary": "Overall theme for the deck",
          "slides": [
            {
              "slideNumber": 1,
              "title": "...",
              "action": "Keep" | "Modify" | "Discard" | "New",
              "reasoning": "Why this change matters based on deal evidence",
              "contentInstructions": [
                { "targetSection": "Header", "suggestedText": "..." }
              ],
              "talkTrack": "What to say to the customer"
            }
          ]
        }
      `;

      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          {
            parts: [
              { inlineData: { mimeType, data: fileData } },
              { text: prompt }
            ]
          }
        ],
        config: { responseMimeType: 'application/json' }
      });

      try {
        const text = response.text || '{}';
        // Clean up markdown markers if flash outputs them
        const jsonStr = text.replace(/^```json/, '').replace(/^```/, '').replace(/```$/, '').trim();
        return JSON.parse(jsonStr) as DeckStrategy;
      } catch (e) {
        console.error("Prescription JSON Parse Error", e);
        throw new Error("Prescription failed.");
      }
    });
  }

  async generateContentForFile(
    account: Account, 
    sellerInfo: SellerInfo, 
    frameworks: Frameworks,
    mode: 'slide-deck' | 'executive-summary' | 'proposal',
    topic: string,
    style: 'executive' | 'bold' | 'creative' = 'executive'
  ): Promise<GeneratedContent> {
    
    // Logic: Select framework based on mode
    let selectedFramework = frameworks[FrameworkCategory.SOLUTION_PRESENTATION] || "Standard Presentation";
    if (mode === 'executive-summary') {
      selectedFramework = frameworks[FrameworkCategory.EXECUTIVE_SUMMARY_TEMPLATE] || "Standard Executive Summary";
    } else if (mode === 'proposal') {
      selectedFramework = frameworks[FrameworkCategory.NEGOTIATION] || "Strategic Proposal Framework";
    }

    // Use existing context helper
    const context = getLogContext(account); 

    // Define Style Guidelines
    let styleGuide = "";
    switch (style) {
      case 'bold':
        styleGuide = `
        - **Tone:** Visionary, High-Impact, Minimalist.
        - **Layout Strategy:** Prioritize "statement" (for big ideas/quotes) and "split_right" (visuals).
        - **Content Style:** Short, punchy headlines. Avoid walls of text. Focus on the "Big Picture" and Future Vision.
        - **Data Usage:** Use data sparingly, only for massive impact.
        `;
        break;
      case 'creative':
        styleGuide = `
        - **Tone:** Narrative, Storytelling, Engaging, Empathetic.
        - **Layout Strategy:** Prioritize "process" (journey flows) and "case_study" (success stories).
        - **Content Style:** Focus on the customer journey, transformation, and emotional drivers.
        - **Data Usage:** Weave data into the narrative structure.
        `;
        break;
      case 'executive':
      default:
        styleGuide = `
        - **Tone:** Professional, Concise, Data-Driven, ROI-focused.
        - **Layout Strategy:** Prioritize "kpi" (metrics) and "chart_bar" (performance).
        - **Content Style:** Concise bullet points. Focus on financial impact, risk mitigation, and business outcomes.
        - **Data Usage:** Heavy reliance on numbers and hard facts.
        `;
        break;
    }

    let outputFormat = "";
    if (mode === 'slide-deck') {
      outputFormat = `
      **1. LAYOUT RULES (Choose the best for each slide based on Style):**
      - **"kpi"**: Use for "Traction", "Results", "Stats". Structure: regions have "header" (The Number) and "content" (The Label).
      - **"chart_bar"**: Use for "Growth", "Comparisons over time". Must provide "chartData".
      - **"chart_pie"**: Use for "Distribution", "Market Share". Must provide "chartData".
      - **"pricing"**: Use "grid" { columns: 3, rows: 1 }. First bullet must be Price.
      - **"matrix"**: Use "grid" { columns: 2, rows: 2 }. For SWOT/Risk.
      - **"timeline"**: Use "grid" { columns: 4, rows: 1 }. For Roadmaps/Quarters.
      - **"comparison"**: Use "grid" { columns: 2, rows: 1 }. For Problem vs Solution.
      - **"split_left"**: Text on LEFT, Image on RIGHT. Use for "Product Showcase", "Features". Region 1 is Text, Region 2 is Image placeholder.
      - **"split_right"**: Image on LEFT, Text on RIGHT.
      - **"team"**: Use for "Team", "Leadership". Structure: regions have "header" (Name) and "content" (Title/Bio).
      - **"logo_grid"**: Use for "Customers", "Partners", "Integrations". Regions have "header" (Name).
      - **"process"**: Use for "How it Works", "Onboarding Steps". Renders as Chevron flow. Regions: "header" (Step Title), "content" (Description).
      - **"case_study"**: Use for "Success Stories". MUST HAVE 4 REGIONS in this order: [1] Challenge, [2] Solution, [3] Impact, [4] Quote (header=Author, content=[Text]).
      - **"statement"**: Use for Quotes or Big Impacts.
      - **"text"**: Use for lists.

      **CRITICAL RULE:**
      If the slide compares "Manual vs. AI" or "Before vs. After", you MUST use the "grid" layout with 2 columns OR the "chart_bar" layout. Do NOT use standard bullet lists for comparisons.

      **2. CONSTRAINT:**
      Return STRICT JSON matching the schema below. Do not use markdown.

      **JSON Example:**
      {
        "slides": [
          {
            "title": "Year over Year Growth",
            "layoutType": "chart_bar",
            "chartData": { 
               "labels": ["2023", "2024"], 
               "values": [1.5, 3.2],
               "summary": ["Revenue doubled", "Driven by Enterprise"]
            },
            "speakerNotes": "Highlight the 2024 jump."
          },
          {
            "title": "Implementation Process",
            "layoutType": "process",
            "regions": [
               { "header": "Kickoff", "content": ["Day 1"] },
               { "header": "Setup", "content": ["Week 1"] },
               { "header": "Go Live", "content": ["Week 2"] }
            ]
          }
        ]
      }
      `;
    } else {
      outputFormat = `Return STRICT JSON ONLY (no markdown blocks): { "docStructure": { "title": "...", "sections": [{ "header": "...", "content": "..." }] } }`;
    }

    const prompt = `
      Role: Expert Content & Design Architect.
      Task: Create content for a ${mode} about "${topic}".
      
      **METHODOLOGY COMPLIANCE:** 
      You must write this content aligning with the user's Sales Framework: '${selectedFramework}'.

      **DESIGN INSTRUCTIONS:**
      **Selected Style:** ${style.toUpperCase()}
      ${styleGuide}
      
      **Context:**
      - Customer: ${account.name}
      - Pain Points: ${account.deal?.aiAnalysis?.gaps?.join(', ') || 'Unknown'}
      - History: ${context}
      
      **Constraint:**
      ${outputFormat}
      - Create 5-7 slides (if slides) or 3-5 sections (if doc).
      - Do NOT use markdown. Just output valid JSON.
    `;

    const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
    });

    try {
      return JSON.parse(response.text || '{}');
    } catch (e) {
      console.error("JSON Parse Error", e);
      return {};
    }
  }

  async generateBridgeContent(
    account: Account, 
    sellerInfo: SellerInfo, 
    mode: CanvasMode, 
    userRequest: string
  ): Promise<BridgeOutput> {
    return this.retryOperation(async () => {
      // 1. Get Universal Context
      const context = getLogContext(account); 
      const dealContext = account.deal ? `Stage: ${account.deal.stage}, Amount: ${account.deal.amount}` : "No active deal.";

      // 2. Construct System Prompt based on Mode
      let role = "";
      let task = "";
      let formatInstruction = "";
      
      if (mode === 'slides') {
        role = "Presentation Architect";
        task = `Write a **Master Prompt** that the user can paste into Google Slides AI (Gemini for Workspace). 
                The prompt must explicitly describe 5-7 slides based on the User Request and Account Context. 
                Do not output the slides themselves. Output the PROMPT to create them.
                Example Output: "Create a deck for [Account] covering [Topic]. Slide 1: Title... Slide 2: ..."`;
        formatInstruction = "Return plain text (The Prompt).";
      } else if (mode === 'sheets') {
        role = "Data Analyst & Spreadsheet Architect";
        task = `You are generating data for a spreadsheet.
                1. Create a **CSV formatted string** representing the data (e.g. ROI calculations, Project Plan, Pricing).
                2. Create a **Prompt** that describes this table for Google Sheets AI to help format or analyze it.
                Return JSON: { "csv": "...", "prompt": "..." }`;
        formatInstruction = "Return JSON object.";
      } else {
        role = "Executive Writer";
        task = `Write the **Actual Content** for a Google Doc (Markdown format).
                Use professional headings, bullet points, and the specific facts from the Context.`;
        formatInstruction = "Return plain text (Markdown Content).";
      }

      const prompt = `
        Role: ${role}
        User Request: "${userRequest}"
        
        **Account Context (Source of Truth):**
        Name: ${account.name}
        Description: ${account.relationshipStatus}
        Deal Info: ${dealContext}
        Key Pain Points (if any): ${account.deal?.aiAnalysis?.gaps?.join(', ') || 'See logs'}
        
        **Interaction History:**
        ${context}
        
        **Task:** ${task}
        
        **Constraint:** ${formatInstruction}
      `;

      // 3. Call API
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: mode === 'sheets' ? 'application/json' : 'text/plain'
        }
      });

      const text = response.text || '';

      // 4. Parse and Format Output
      if (mode === 'sheets') {
          try {
              const json = JSON.parse(text);
              return {
                  mode,
                  csvContent: json.csv,
                  aiPrompt: json.prompt,
                  instructions: "Paste the CSV into cell A1. Use the Prompt with Gemini in Sheets."
              };
          } catch (e) {
              return {
                  mode,
                  csvContent: "Error parsing JSON from AI.",
                  aiPrompt: "Error generating prompt.",
                  instructions: "Error"
              };
          }
      } else if (mode === 'slides') {
          return {
              mode,
              aiPrompt: text,
              instructions: "Copy this prompt and paste it into the 'Help me visualize' or 'Create image' sidebar in Google Slides."
          };
      } else {
          return {
              mode,
              textContent: text,
              instructions: "Copy the formatted text below and paste it directly into your Google Doc."
          };
      }
    });
  }

  async auditFileContent(
    account: Account, 
    fileData: string, 
    mimeType: string, 
    type: AuditType,
    frameworks: Frameworks
  ): Promise<AuditResult> {
    return this.retryOperation(async () => {
      const context = getLogContext(account); 
      
      // Select Framework based on type
      let styleGuide = "";
      let role = "Sales Coach";
      let specificInstructions = "";

      if (type === 'slide') {
        styleGuide = frameworks[FrameworkCategory.SOLUTION_PRESENTATION] || "Standard Professional Presentation";
        role = "Presentation Strategist";
        specificInstructions = `
          **CRITICAL: Style Alignment Check**
          The user follows this specific Presentation Framework:
          "${styleGuide}"
          
          You must critique the slide against this framework. 
          - If the framework says "Lead with Insight", and the slide leads with "About Us", flag it as a failure.
          - If the framework says "Visuals over Text", and the slide is a wall of text, flag it.
        `;
      } else if (type === 'email') {
        styleGuide = frameworks[FrameworkCategory.PROSPECTING_EMAIL] || "Standard Professional Email";
        role = "Copywriting Coach";
      } else {
        styleGuide = frameworks[FrameworkCategory.DEAL_MANAGEMENT] || "Standard Business Writing";
      }

      const prompt = `
        Role: ${role}.
        Task: Audit the uploaded content against TWO criteria: 
        1. **Deal Reality** (Does it match what the customer actually said?)
        2. **Selling Style** (Does it match the user's defined Framework?)
        
        **1. Deal Context (The Truth):**
        - Customer: ${account.name}
        - Evidence from Logs: ${context}
        
        **2. The Framework (The Style):**
        "${styleGuide}"
        
        ${specificInstructions}
        
        **Your Output:**
        1. **Critique:** Be specific. "This slide lists features, but your 'Challenger' framework requires leading with a Commercial Insight."
        2. **The Fix:** Tell them exactly how to rewrite it to fit the style.
        3. **Fix-It Prompt:** A prompt they can copy to generate the fixed version in their tool.
        
        **Return JSON:** { "status": "Pass"|"Needs Revision", "critique": "...", "suggestion": "...", "fixItPrompt": "..." }
      `;

      let contents: any;
      const isBinary = mimeType.startsWith('image/') || mimeType === 'application/pdf';
      
      if (isBinary) {
          contents = {
              parts: [
                  { inlineData: { mimeType, data: fileData } },
                  { text: prompt }
              ]
          };
      } else {
          contents = {
              parts: [
                  { text: `CONTENT TO AUDIT:\n${fileData}\n\n---\n\n${prompt}` }
              ]
          };
      }

      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [contents],
        config: {
          responseMimeType: 'application/json'
        }
      });

      try {
        return JSON.parse(response.text || '{}') as AuditResult;
      } catch (e) {
        return {
            status: 'Fail',
            critique: "AI failed to generate valid JSON analysis.",
            suggestion: "Try again.",
            fixItPrompt: ""
        };
      }
    });
  }
}

export const geminiCanvas = new GeminiCanvasService();
