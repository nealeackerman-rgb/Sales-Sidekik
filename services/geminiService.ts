
import { GoogleGenAI } from "@google/genai";
import { Account, SellerInfo, CoachingEvaluation, Task, MeetingType, MeetingPrepData, SalesPlay, ProspectTarget, DealData, Frameworks, FrameworkCategory, StrategicRecommendation } from "../types";
import { usageService } from "./usageService";

// Helper function used by other services
export const getLogContext = (account: Account, charLimit = 500000): string => {
  if (!account.communicationLogs || account.communicationLogs.length === 0) return "No interaction history available.";
  
  const sorted = [...account.communicationLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  const fullText = sorted.map(log => 
    `[${new Date(log.date).toLocaleDateString()} - ${log.type}]\n${log.content}`
  ).join('\n\n');

  if (fullText.length > charLimit) {
      return fullText.substring(0, charLimit) + "\n\n[...System Note: Older content truncated due to length limits...]";
  }
  return fullText;
};

export const getFamilyContext = (account: Account, allAccounts: Account[] = []): string => {
  if (account.parentAccountId) {
    const parent = allAccounts.find(a => a.id === account.parentAccountId);
    if (parent) {
      const siblings = allAccounts.filter(a => a.parentAccountId === account.parentAccountId && a.id !== account.id);
      return `CORPORATE CONTEXT: This account is a SUBSIDIARY of ${parent.name}. Sibling accounts in portfolio: ${siblings.map(s => s.name).join(', ')}.`;
    }
  }
  const children = allAccounts.filter(a => a.parentAccountId === account.id);
  if (children.length > 0) {
    return `CORPORATE CONTEXT: This account is the PARENT HQ for: ${children.map(c => c.name).join(', ')}.`;
  }
  return "";
};

const cleanJson = (text: string): string => {
  if (!text) return '{}';
  const firstBrace = text.indexOf('{');
  const firstBracket = text.indexOf('[');
  let start = -1;
  if (firstBrace !== -1 && firstBracket !== -1) start = Math.min(firstBrace, firstBracket);
  else start = Math.max(firstBrace, firstBracket);
  const lastBrace = text.lastIndexOf('}');
  const lastBracket = text.lastIndexOf(']');
  const end = Math.max(lastBrace, lastBracket);
  if (start !== -1 && end !== -1 && end > start) return text.substring(start, end + 1);
  return text.replace(/^```json/, '').replace(/^```/, '').replace(/```$/, '').trim();
};

export const researchCompanyInfo = async (companyName: string): Promise<{ companyDescription: string, products: string }> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const modelName = 'gemini-3-flash-preview';
    const prompt = `Research the company "${companyName}". Return JSON object with "companyDescription" (2 sentences) and "products" (list).`;
    try {
        const response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });
        if (response.usageMetadata) usageService.trackUsage(modelName, response.usageMetadata.promptTokenCount || 0, response.usageMetadata.candidatesTokenCount || 0);
        const json = JSON.parse(cleanJson(response.text || '{}'));
        return { companyDescription: json.companyDescription || '', products: json.products || '' };
    } catch (e) { return { companyDescription: '', products: '' }; }
};

export class GeminiService {
  private get ai() {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async generateContent(prompt: string, systemInstruction?: string, jsonMode = false) {
     const config: any = {};
     if (jsonMode) config.responseMimeType = 'application/json';
     if (systemInstruction) config.systemInstruction = systemInstruction;
     const modelName = 'gemini-3-pro-preview'; 
     const response = await this.ai.models.generateContent({ model: modelName, contents: prompt, config });
     if (response.usageMetadata) usageService.trackUsage(modelName, response.usageMetadata.promptTokenCount || 0, response.usageMetadata.candidatesTokenCount || 0);
     const groundingUrls = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((c: any) => ({ title: c.web?.title || 'Source', uri: c.web?.uri || '' })).filter((c: any) => c.uri) || [];
     return { text: response.text || '', groundingUrls };
  }

  async enrichTerritoryData(
    accounts: Account[], 
    sellerInfo: SellerInfo, 
    framework: string, 
    allAccounts: Account[],
    customInstruction?: string,
    onProgress?: (progress: { current: number, total: number }) => void
  ): Promise<Account[]> {
    const BATCH_SIZE = 25;
    const enrichedResults: Account[] = [];
    const modelName = 'gemini-3-flash-preview';
    
    for (let i = 0; i < accounts.length; i += BATCH_SIZE) {
        const batch = accounts.slice(i, i + BATCH_SIZE);
        const accountList = batch.map(a => `- ID: ${a.id}, Name: ${a.name}, Current Revenue: ${a.annualRevenue || 'Unknown'}`).join('\n');

        const prompt = `
            Role: Revenue Operations Analyst.
            Task: Enrich this list and assign strategic tiers based on data.
            
            **CONTEXT:** Seller sells: ${sellerInfo.products}.
            **FRAMEWORK:** ${framework || "None provided."}
            **INSTRUCTION:** ${customInstruction || "Provide enrichment based on current market data."}
            
            **TIERING LOGIC (Strict Math):**
            1. Analyze the Framework: specific rules for account tiering (e.g. 'A/B/C' split)?
            • YES: Follow the framework's rules exactly.
            • NO: Apply the Standard Enterprise Fallback Distribution:
               • Tier 1: Top 10% of accounts.
               • Tier 2: Next 30% of accounts.
               • Tier 3: Remaining 60% of accounts.
            
            **ACCOUNTS (Batch ${Math.floor(i/BATCH_SIZE) + 1}):**
            ${accountList}
            
            **OUTPUT JSON:**
            { "updates": [
              {
                "id": "...",
                "annualRevenue": (Number, Millions),
                "estimatedGrowth": (String %),
                "tier": "Tier 1" | "Tier 2" | "Tier 3",
                "growthSignals": "Concise reason...",
                "rationale": "Explain tiering choice referencing TIERING LOGIC.",
                "parentCompanyName": "Ultimate Parent Name"
              }
            ]}
        `;

        try {
            const response = await this.ai.models.generateContent({
                model: modelName,
                contents: prompt,
                config: { responseMimeType: 'application/json', tools: [{ googleSearch: {} }] }
            });
            if (response.usageMetadata) usageService.trackUsage(modelName, response.usageMetadata.promptTokenCount || 0, response.usageMetadata.candidatesTokenCount || 0);
            const json = JSON.parse(cleanJson(response.text || '{"updates":[]}'));
            const updates = json.updates || [];
            const accountNameMap = new Map<string, string>();
            allAccounts.forEach(a => accountNameMap.set(a.name.toLowerCase().trim(), a.id));

            const batchEnriched = batch.map(acc => {
                const update = updates.find((u: any) => u.id === acc.id);
                if (!update) return acc;
                let resolvedParentId = acc.parentAccountId;
                if (update.parentCompanyName) {
                    const parentId = accountNameMap.get(update.parentCompanyName.toLowerCase().trim());
                    if (parentId && parentId !== acc.id) resolvedParentId = parentId;
                }
                return {
                    ...acc,
                    annualRevenue: update.annualRevenue ? String(update.annualRevenue) : acc.annualRevenue,
                    tier: update.tier || acc.tier,
                    growthSignals: update.growthSignals || acc.growthSignals,
                    rationale: update.rationale || acc.rationale,
                    estimatedGrowth: update.estimatedGrowth || acc.estimatedGrowth,
                    parentAccountId: resolvedParentId
                };
            });
            enrichedResults.push(...batchEnriched);
            if (i + BATCH_SIZE < accounts.length) await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (e) { enrichedResults.push(...batch); }
        if (onProgress) onProgress({ current: Math.min(i + BATCH_SIZE, accounts.length), total: accounts.length });
    }
    return enrichedResults;
  }

  async generateICP(sellerInfo: SellerInfo) {
    const prompt = `Analyze products: ${sellerInfo.products}. Return JSON with industries, roles, painPoints, companySize.`;
    const res = await this.generateContent(prompt, undefined, true);
    return JSON.parse(cleanJson(res.text || '{}'));
  }

  async enhanceFramework(category: string, currentContent: string, instruction: string) {
    const prompt = `Enhance framework: ${category}. Content: ${currentContent}. Instruction: ${instruction}`;
    const res = await this.generateContent(prompt);
    return res.text;
  }

  async generateAccountStatusSummary(account: Account) {
    const prompt = `Summary for ${account.name} from logs: ${getLogContext(account)}. 250 chars max.`;
    const res = await this.generateContent(prompt);
    return res.text.trim();
  }

  async generateCoachingTrends(evals: CoachingEvaluation[]) {
    const prompt = `Analyze: ${JSON.stringify(evals)}. Return JSON with summary, topStrength, topWeakness, improvingAreas, decliningAreas.`;
    const res = await this.generateContent(prompt, undefined, true);
    return JSON.parse(cleanJson(res.text || '{}'));
  }

  async generateAccountBriefing(account: Account, sellerInfo: SellerInfo, frameworks: any, allAccounts: Account[] = []) {
    const logContext = getLogContext(account);
    const dealFramework = frameworks[FrameworkCategory.DEAL_MANAGEMENT] || "MEDDIC";

    // Strict system instructions to enforce brevity
    const systemInstruction = `
      You are an elite, high-velocity Sales Manager. 
      Your task is to provide a situational report that is EXTREMELY brief.
      
      CRITICAL FORMATTING RULES:
      1. Output MUST be exactly two short paragraphs.
      2. DO NOT use Headers (e.g. "Account Overview", "Status").
      3. DO NOT use Bullet Points.
      4. DO NOT use Lists.
      5. Total word count must be under 150 words.
      
      CONTENT STRUCTURE:
      Paragraph 1: The Status. Summarize the deal momentum and key facts based *only* on the evidence provided.
      Paragraph 2: The Directive. Tell the seller exactly what their next move is to align with the ${dealFramework} framework.
      
      After the two paragraphs, append the JSON Action Block.
    `;

    const prompt = `
      Brief me on account: ${account.name}.
      
      **EVIDENCE (Logs):**
      ${logContext}

      **ACTION BLOCK FORMAT:** :::ACTION::: { "type": "create_tasks", "label": "Add Suggested Tasks", "payload": [ { "description": "...", "priority": "High"| "Medium", "dueDate": "YYYY-MM-DD" } ] } :::END:::
    `;

    const res = await this.generateContent(prompt, systemInstruction);
    return res.text;
  }

  async generateAccountPlan(account: Account, sellerInfo: SellerInfo, frameworks: any, allAccounts: Account[], userInstructions?: string) {
    const logContext = getLogContext(account);
    const familyContext = getFamilyContext(account, allAccounts);
    const accountFramework = frameworks[FrameworkCategory.ACCOUNT_PLANNING] || "Standard Account Planning Strategy";
    const tier = account.tier || "Unassigned";

    const prompt = `
      You are an elite Strategic Account Executive at ${sellerInfo.companyName}.
      This is an Account-Level Plan for ${account.name}. DO NOT mention territory-wide strategy.
      
      Account Tier: ${tier}.

      **SELLER CONTEXT:**
      My Value Prop: ${sellerInfo.companyDescription}
      My Products: ${sellerInfo.products}

      **EVIDENCE (Internal CRM Logs):**
      ${logContext}

      **METHODOLOGY (CRITICAL):**
      You MUST strictly apply this Account Planning Framework to the evidence:
      "${accountFramework}"

      **TASK:**
      Draft a comprehensive Account Plan. 
      - If Tier 1: Provide deep, multi-threaded strategy, political mapping, and long-term mutual goals.
      - If Tier 2: Provide a tactical plan focused on near-term conversion.
      - If Tier 3: Provide a high-velocity summary.

      **INSTRUCTION:** ${userInstructions || "Create a comprehensive strategic plan based on the tier and evidence."}

      **OUTPUT:** 
      Return JSON: { "planMarkdown": "Markdown Content Here", "extractedRevenue": "Estimated annual revenue" }
    `;

    const result = await this.generateContent(prompt, "Focus on account execution depth. Do not mix with territory planning.", true);
    try {
        const parsed = JSON.parse(cleanJson(result.text));
        return { text: parsed.planMarkdown, extractedRevenue: parsed.extractedRevenue, groundingUrls: result.groundingUrls };
    } catch (e) {
        return { text: result.text, groundingUrls: result.groundingUrls };
    }
  }

  async draftTerritoryPlan(accounts: Account[], sellerInfo: SellerInfo, framework: string) {
    // Map full command center data for the AI
    const portfolioSummary = accounts.map(a => 
      `- ${a.name}: [Tier: ${a.tier}, Status: ${a.relationshipStatus}, Deal: ${a.dealStatus}, Rev: ${a.annualRevenue}M, Growth: ${a.estimatedGrowth}, Uses: ${a.currentProducts || 'Unknown'}, Signals: ${a.growthSignals}]`
    ).join('\n');
    
    const prompt = `
      You are a Chief Revenue Officer. Draft a high-impact, actionable Territory Execution Plan for ${sellerInfo.sellerName} at ${sellerInfo.companyName}.
      
      **METHODOLOGY COMPLIANCE (CRITICAL):**
      You MUST strictly apply the following Territory Planning Framework:
      "${framework}"

      **PORTFOLIO DATA (The Ground Truth):**
      ${portfolioSummary}

      **SELLER ASSETS (What you sell):**
      ${sellerInfo.products}

      **REQUIRED SECTIONS (Markdown):**
      
      1. # Executive Objective & Time Allocation
      State the revenue target and explicitly define how the seller's 40-hour week should be split based on the Tiers provided. Identify if the current Tier distribution is healthy.

      2. ## Strategic Clusters & "Plan of Attack"
      Group accounts into tactical clusters (e.g., "The Expansion Whales", "High-Growth Entry Points"). 
      For each cluster, provide a specific "Plan of Attack" derived from their 'Uses' vs. 'Sells' gap.

      3. ## Tier 1 Deep Execution: Individual Sales Plays
      For EVERY Tier 1 account, provide a 1-sentence Strategic Directive. 
      If they are a CUSTOMER, identify a specific UPSELL/CROSS-SELL play based on what they use vs what you sell.
      If they are a PROSPECT without an ACTIVE DEAL, provide a "Break-In" sales play.

      4. ## Risk Mitigation: Churn & Stagnation
      Identify Tier 1 or 2 accounts with 'None' for Deal Status or '-Growth' and provide a retention/resuscitation tactic.

      5. ## The "Stop Doing" List
      List Tier 3 accounts and explicitly state why they should be ignored/automated to preserve the 80/20 rule.

      **STYLE:** Commanding, hyper-specific, no generic advice. Use bolding for accounts and products.
      **OUTPUT FORMAT:** Return JSON: { "document": "Markdown Content", "lastUpdated": "ISO Date" }
    `;
    const res = await this.generateContent(prompt, "You are a master of strategic territory planning and revenue operations.", true);
    return JSON.parse(cleanJson(res.text || '{}'));
  }

  async runAssistantChat(msg: string, history: any[], account: Account | null, frameworks: Frameworks, sellerInfo: any, allAccounts: Account[] = []) {
    const context = account ? `Active Account: ${account.name}\nLogs: ${getLogContext(account)}\nSignals: ${account.signals || 'None'}\nFamily: ${getFamilyContext(account, allAccounts)}` : "Global Mode.";
    const system = `
      You are Sales Sidekik Strategic Coach. 
      Frameworks: ${JSON.stringify(frameworks)}. 
      User: ${sellerInfo.sellerName} (${sellerInfo.companyName}).
      
      Your goal is to provide elite strategic advice using Tactical Empathy and professional sales logic (MEDDIC, etc).
      Always check the "Active Account" context if provided.
      
      **INTERACTIVE ACTIONS:**
      If you suggest specific tasks, email drafts, or navigation, wrap a JSON action block in :::ACTION::: and :::END::: tags.
      Example Task: :::ACTION::: { "type": "create_tasks", "label": "Add 2 Tasks", "payload": [{ "description": "Call the EB", "priority": "High" }] } :::END:::
      Example Nav: :::ACTION::: { "type": "navigate", "label": "Go to Org Chart", "payload": { "tab": "org" } } :::END:::
    `;
    const prompt = `${system}\n\nContext:\n${context}\n\nUser: ${msg}`;
    const res = await this.generateContent(prompt);
    return res.text;
  }

  async analyzeInteraction(content: string) {
    const prompt = `Analyze interaction: "${content}". Return JSON { summary, extractedTasks }.`;
    const res = await this.generateContent(prompt, undefined, true);
    return JSON.parse(cleanJson(res.text || '{"summary":"", "extractedTasks":[]}'));
  }

  async processInteraction(content: string, user: string, date: string) {
    const prompt = `Extract tasks from: "${content}". JSON { "tasks": [{ "description", "dueDate", "priority" }] }.`;
    const res = await this.generateContent(prompt, undefined, true);
    return JSON.parse(cleanJson(res.text || '{"tasks":[]}'));
  }

  async generateDiscoveryPrep(type: string, context: string, account: Account, framework: string) {
    const prompt = `Prep for ${type} with ${account.name}. Goal: ${context}. Framework: ${framework}.`;
    return this.generateContent(prompt);
  }

  async generateProspectingMessage(type: string, context: string, account: Account, sellerInfo: SellerInfo, framework: string, familyContext?: string) {
    const prompt = `Draft ${type} to ${account.name}. Context: ${context}. Framework: ${framework}. Family: ${familyContext}.`;
    return this.generateContent(prompt);
  }

  async findProspects(account: Account, sellerInfo: SellerInfo, query?: string) {
    const prompt = `Find prospects at ${account.name}. Return JSON array.`;
    const res = await this.generateContent(prompt, undefined, true);
    try { return JSON.parse(cleanJson(res.text)); } catch { return []; }
  }

  async generateSignals(account: Account, sellerInfo: SellerInfo, query?: string, existing?: string, parentName?: string) {
    // Determine the "Buyer Context" to avoid generic results
    const buyerContext = sellerInfo.products ? `RELEVANCE: The seller sells "${sellerInfo.products}". Prioritize news related to this.` : "";
    const companyContext = parentName ? `${account.name} (Subsidiary of ${parentName})` : account.name;
    const userQuery = query || `Executive Hiring, Mergers and Acquisitions, Quarterly Earnings Call pain points, Layoffs, New Product Launches`;

    const prompt = `
      Role: Elite Sales Intelligence Analyst.
      Task: Search for specific, recent "Buying Signals" for the account: "${companyContext}".

      **SELLER CONTEXT:**
      ${buyerContext}

      **DEFINITION OF A "SIGNAL":**
      - Executive Hiring/Departures (CXO, VP level).
      - Recent Funding or Acquisitions (M&A).
      - Quarterly Earnings call quotes regarding specific pain points (Cost cutting, Innovation, Digital Transformation).
      - New Product Launches or expansions.
      - Layoffs or Restructuring.

      **CRITICAL CONSTRAINTS:**
      1. Timeframe: Focus on the last 3-6 months.
      2. **NO GENERIC DATA:** Do NOT output "What the company does" or their history (e.g. "Founded in 2007..."). The user already knows this.
      3. **NO FLUFF:** If no *recent* news exists, state "No significant recent triggers found" rather than providing a generic summary.

      **SEARCH QUERY TO EXECUTE:**
      "${userQuery} for ${companyContext} last 6 months"

      **OUTPUT FORMAT (JSON):**
      {
          "text": "Markdown formatted summary of 3-5 key bullet points. Bold the dates and key events.",
          "detectedContacts": [
              { "name": "Name", "title": "Title", "context": "Why they are relevant based on the news", "linkedin": "" }
          ]
      }
    `;

    const res = await this.ai.models.generateContent({ 
        model: 'gemini-3-flash-preview', 
        contents: prompt, 
        config: { 
            responseMimeType: 'application/json', 
            tools: [{ googleSearch: {} }] 
        } 
    });

    if (res.usageMetadata) usageService.trackUsage('gemini-3-flash-preview', res.usageMetadata.promptTokenCount || 0, res.usageMetadata.candidatesTokenCount || 0);

    try {
        const json = JSON.parse(cleanJson(res.text || '{}'));
        // Extract URLs from grounding metadata
        const groundingUrls = res.candidates?.[0]?.groundingMetadata?.groundingChunks
            ?.map((c: any) => ({ title: c.web?.title || 'Source', uri: c.web?.uri || '' }))
            .filter((c: any) => c.uri) || [];
            
        return { 
            text: json.text || 'No signals found.', 
            detectedContacts: json.detectedContacts || [], 
            groundingUrls 
        };
    } catch { 
        return { text: res.text || "Error parsing signals.", detectedContacts: [], groundingUrls: [] }; 
    }
  }

  async checkForNewSignals(account: Account, sellerInfo: SellerInfo, parentName?: string) {
    return this.generateSignals(account, sellerInfo, undefined, account.signals, parentName);
  }

  async researchStakeholders(account: Account, sellerInfo: SellerInfo, instruction?: string) {
    const res = await this.generateContent(`Research stakeholders at ${account.name}. JSON array.`, undefined, true);
    try { return JSON.parse(cleanJson(res.text)); } catch { return []; }
  }

  async scanInputsForStakeholders(account: Account) {
    const res = await this.generateContent(`Extract people from logs: ${getLogContext(account)}. JSON array.`, undefined, true);
    try { return JSON.parse(cleanJson(res.text)); } catch { return []; }
  }

  async analyzeDealHealth(account: Account, fwName: string, fwContent: string, allAccounts: Account[]) {
    const logContext = getLogContext(account);
    const familyContext = getFamilyContext(account, allAccounts);
    
    const prompt = `
      You are an elite Sales Deal Auditor. 
      Task: Perform a deep audit of the deal for ${account.name} using the ${fwName} framework.
      
      **METHODOLOGY RULES:**
      ${fwContent}
      
      **EVIDENCE (The only data you can trust from internal logs):**
      ${logContext}
      
      **FAMILY CONTEXT:**
      ${familyContext}

      **AUDIT REQUIREMENTS:**
      1. Be skeptical. If a framework requirement (like 'Economic Buyer') is not explicitly named or mentioned in the logs, it is a GAP.
      2. Calculate a "Probability of Closing" (0-100) based on evidence vs. framework completion.
      3. Create a comprehensive Markdown analysis of the deal status.
      4. List specific, actionable recommendations to close the gaps identified.

      **OUTPUT FORMAT (STRICT JSON):**
      {
        "analysisMarkdown": "Full detailed markdown report summarizing the audit results...",
        "calculatedProbability": number,
        "probabilityRationale": "Short 1-sentence explanation for the score",
        "aiAnalysis": {
          "score": number,
          "strengths": ["Evidence-backed strength 1", "..."],
          "gaps": ["Unverified framework element 1", "..."],
          "recommendations": ["Action to verify/close gap 1", "..."],
          "lastUpdated": "ISO Date"
        }
      }
    `;

    const res = await this.generateContent(prompt, "You are a ruthless but fair sales deal auditor who only values evidence-based entries.", true);
    try {
        return JSON.parse(cleanJson(res.text || '{}'));
    } catch (e) {
        return { 
          analysisMarkdown: res.text, 
          calculatedProbability: 50, 
          probabilityRationale: "Error parsing structured audit. Basic summary provided.",
          aiAnalysis: { score: 50, strengths: [], gaps: ["Audit parsing failed"], recommendations: ["Run the audit again"], lastUpdated: new Date().toISOString() }
        };
    }
  }

  async calculateDealProbability(account: Account) {
    const logContext = getLogContext(account);
    const prompt = `
      Analyze interaction logs for ${account.name} and provide a closing probability (0-100).
      
      **LOGS:**
      ${logContext}

      **OUTPUT JSON:**
      { "calculatedProbability": number, "probabilityRationale": "Brief explanation" }
    `;
    const res = await this.generateContent(prompt, undefined, true);
    return JSON.parse(cleanJson(res.text || '{"calculatedProbability":50, "probabilityRationale": "No evidence found."}'));
  }

  async extractNextStepsFromLog(content: string, accId: string, accName: string, date: string) {
    const res = await this.generateContent(`Extract tasks: "${content}". JSON array.`, undefined, true);
    try { return JSON.parse(cleanJson(res.text)); } catch { return []; }
  }

  async generateDealStrategy(account: Account, context: string): Promise<StrategicRecommendation[]> {
    const logContext = getLogContext(account);
    const prompt = `
      You are an elite Sales Strategy Coach. 
      Task: Identify 3-5 critical "Strategic Blindspots" for the deal: ${account.name}.
      
      **THE OPERATING FRAMEWORKS:**
      ${context}

      **THE CRM EVIDENCE (Logs):**
      ${logContext}

      **STRATEGY LOGIC:**
      A "Blindspot" is a piece of the Framework that is completely missing or weak in the CRM Evidence.
      Example: If the MEDDIC framework is used, and there is no mention of an 'Economic Buyer' in the logs, the blindspot is 'Single-Threaded / No Economic Buyer'.

      **OUTPUT FORMAT (STRICT JSON ARRAY):**
      [
        {
          "blindspot": "Short name of the gap (e.g., 'Missing Economic Buyer')",
          "action": "Specific tactical move to fix it (e.g., 'Request referral to CFO')",
          "howTo": "Practical advice for the seller (e.g., 'Ask your champion: Who owns the budget for this fiscal year?')",
          "priority": "High"
        }
      ]

      **CRITICAL:** Every field MUST be populated. Do not return empty strings. If no blindspots are found, return empty array [].
    `;

    const modelName = 'gemini-3-pro-preview';
    const response = await this.ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: { responseMimeType: 'application/json' }
    });

    if (response.usageMetadata) usageService.trackUsage(modelName, response.usageMetadata.promptTokenCount || 0, response.usageMetadata.candidatesTokenCount || 0);

    try {
        const json = JSON.parse(cleanJson(response.text || '[]'));
        return Array.isArray(json) ? json : [];
    } catch (e) {
        console.error("Deal Strategy JSON Parse Error", e);
        return [];
    }
  }

  async refineTerritoryPlan(plan: any, input: string, accounts: Account[], sellerInfo: SellerInfo) {
    const prompt = `Refine territory plan: ${plan.document}. User instruction: ${input}. Return JSON { document, lastUpdated }.`;
    const res = await this.generateContent(prompt, undefined, true);
    return JSON.parse(cleanJson(res.text || '{}'));
  }

  async askHelpBot(msg: string) {
    const res = await this.generateContent(`Support: "${msg}".`);
    return res.text;
  }

  async generatePriorityMatrix(account: Account, sellerInfo: SellerInfo, familyContext?: string) {
    const res = await this.generateContent(`Priority matrix for ${account.name}.`);
    return res.text;
  }

  async generateSalesPlays(account: Account, sellerInfo: SellerInfo, matrix: string) {
    const res = await this.generateContent(`Sales plays for ${account.name}. JSON array.`, undefined, true);
    try { return JSON.parse(cleanJson(res.text)); } catch { return []; }
  }

  async refineStrategy(current: string, instruction: string) {
    const res = await this.generateContent(`Refine strategy: ${current}. Instruction: ${instruction}.`);
    return res.text;
  }

  async refineSalesPlays(plays: SalesPlay[], instruction: string) {
    const res = await this.generateContent(`Refine plays: ${JSON.stringify(plays)}. Instruction: ${instruction}. JSON array.`, undefined, true);
    try { return JSON.parse(cleanJson(res.text)); } catch { return plays; }
  }

  async generateMeetingPrep(
    meetingGoal: string, 
    linkedinContext: string, 
    account: Account, 
    allFrameworks: Frameworks, 
    familyContext?: string
  ) {
    const logContext = getLogContext(account);
    const signalsContext = account.signals || "No specific market signals found.";
    const frameworksContext = JSON.stringify(allFrameworks);

    const prompt = `
      You are Sales Sidekik, an elite sales strategy coach. 
      
      **CORE OPERATING FRAMEWORKS (PRIORITY #1):**
      ${frameworksContext}

      **TASK:** 
      Prepare a rigid, high-impact meeting strategy guide based on the user's goal.

      **INPUTS:**
      1. User Goal: "${meetingGoal}"
      2. Stakeholder Bio/Context: "${linkedinContext}"
      3. Interaction History (Logs): "${logContext}"
      4. Market Intelligence (Signals): "${signalsContext}"
      5. Corporate/Family Context: "${familyContext || 'None'}"

      **EXECUTION PROTOCOL (INTERNAL PROGRAMMING):**
      1. **Methodology Selection:** If goal mentions "Contract" or "Negotiation", prioritize NEGOTIATION and DEAL_MANAGEMENT. If "First Meeting", prioritize DISCOVERY.
      2. **Contextual Intelligence:** You MUST use the "Market Intelligence (Signals)" to make the advice hyper-specific (e.g. mention their recent earnings or ownership if relevant).
      3. **Tactical Empathy:** Always include an "Accusation Audit" section to deactivate defensiveness.
      4. **MEDDICCC Hygiene:** If it's a contract phase, audit the Economic Buyer (EB) and Decision Process (DP).
      
      **OUTPUT FORMAT (Markdown):**
      # [Name of Selected Framework] - Strategic Meeting Plan
      
      ## 👤 Stakeholder Persona Analysis
      * Profile: [Executive Summary]
      * The Angle: [How to specifically tailor your message to this person]

      ## 🛡️ Accusation Audit (Tactical Empathy)
      * "It might seem like..."
      * "You probably feel..."

      ## 🎯 Framework Execution: [Methodology Name]
      * **Key Insight:** [Fact from signals/logs that creates urgency]
      * **Calibrated Questions:** [Open-ended 'How' or 'What' questions tailored to the goal]

      ## 🚩 Red Flags & Deal Hygiene (MEDDICCC)
      * [Specific risks identified from interaction logs]

      ## 🗺️ Mutual Action Plan (MAP)
      * [Suggested timeline backward from their target go-live]

      **INSTRUCTION:** Do not provide generic advice. If the bio is blank, use the Company Signals and CRM logs to deduce the stakeholder's likely concerns.
    `;

    return this.generateContent(prompt);
  }

  async evaluateCall(content: string, stage: string, framework: string) {
    const res = await this.generateContent(`Evaluate call: "${content}". JSON format.`, undefined, true);
    return JSON.parse(cleanJson(res.text));
  }

  async mapCsvImport(text: string): Promise<any[]> { return []; }
}

export const geminiService = new GeminiService();
