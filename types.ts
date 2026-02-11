
export enum FrameworkCategory {
  TERRITORY_PLANNING = 'Territory Planning (Tiering Rules)',
  ACCOUNT_PLANNING = 'Account Planning',
  PIPELINE_GENERATION = 'Pipeline Generation',
  DISCOVERY = 'Discovery Calls',
  PROSPECTING_EMAIL = 'Prospecting Emails',
  PROSPECTING_LINKEDIN = 'LinkedIn Messages',
  SOLUTION_PRESENTATION = 'Solution Presentation',
  NEGOTIATION = 'Contract Negotiation',
  DEAL_MANAGEMENT = 'Deal Management (e.g., BANT)',
  EXECUTIVE_SUMMARY_TEMPLATE = 'Executive Summary Format (Sample)',
  DISCOVERY_AGREEMENT_TEMPLATE = 'Discovery Agreement Format (Customer Facing)',
  MUTUAL_ACTION_PLAN = 'Mutual Action Plan (MAP)',
}

export type UserRole = 
  | 'admin'
  | 'vp'
  | 'manager'
  | 'rep';

export interface TerritoryPlanRow {
  accountId?: string; // Link to actual account
  accountName: string;
  tier: string;
  estimatedGrowth?: string; 
  growthSignals: string;
  rationale: string;
}

export interface TerritoryPlan {
  document: string; // Markdown narrative
  rows: TerritoryPlanRow[]; // Structured data for CSV
  lastUpdated: string;
}

export interface CoachingEvaluation {
  score: number; // 0-100
  strengths: string[];
  weaknesses: string[];
  missedOpportunities: string[]; // Specific questions they didn't ask
  frameworkAlignment: 'High' | 'Medium' | 'Low'; 
  actionableFeedback: string; // The "Coach's Note"
  dateEvaluated: string;
}

export interface IdealCustomerProfile {
  industries: string;
  roles: string;
  painPoints: string;
  companySize: string;
}

export interface SellerInfo {
  id?: string; 
  email?: string;
  sellerName: string;
  companyName: string;
  role: UserRole;
  organizationId?: string;
  managerId?: string;
  companyDescription: string;
  products: string;
  idealCustomerProfile?: IdealCustomerProfile;
  territoryPlan?: TerritoryPlan; // Kept for the narrative document
  coachingTrends?: {
    summary: string;
    topStrength: string;
    topWeakness: string;
    improvingAreas: string[]; // New: Trajectory
    decliningAreas: string[]; // New: Trajectory
    lastUpdated: string;
  };
  morningBriefing?: {
    text: string; // The AI-written narrative
    lastGenerated: string; // ISO Date timestamp
  };
}

export interface CommunicationLog {
  date: string;
  content: string;
  type: 'Call' | 'Email' | 'Message' | 'Sales Note';
  coaching?: CoachingEvaluation;
}

export interface Task {
  id: string;
  description: string;
  dueDate?: string;
  isCompleted: boolean;
  priority?: 'High' | 'Medium' | 'Low'; // Added priority
}

export interface ActionItem {
  id: string;
  description: string; // e.g. "Send pricing PDF"
  isCompleted: boolean;
  sourceLogId?: string; // Links back to the call it came from
  createdAt: string;
}

export interface MAPEntry {
  id: string;
  description: string;
  owner: string;
  dueDate?: string;
  status: string;
}

export interface OrgContact {
  id: string;
  name: string;
  title: string;
  role: 'Champion' | 'Economic Buyer' | 'Blocker' | 'Influencer' | 'User' | 'Unknown';
  sentiment: 'Positive' | 'Neutral' | 'Negative' | 'Unknown';
  managerId?: string;
  managerName?: string;
  notes?: string;
  linkedIn?: string;
}

export interface CoachingSession {
  id: string;
  repId: string;
  managerId: string;
  date: string;
  topics: string[];
  actionPlan: string;
}

export interface DealData {
  stage: string;
  amount: string;
  closeDate: string;
  probability: number;
  probabilityRationale?: string; // AI generated explanation
  analysis: string; 
  aiAnalysis?: {
    score: number;
    strengths: string[]; // Added strengths
    gaps: string[];
    recommendations: string[];
    lastUpdated: string;
  };
}

export interface StrategicRecommendation {
  blindspot: string; // e.g. "No Economic Buyer identified"
  action: string;    // e.g. "Multi-thread to the CFO"
  howTo: string;     // e.g. "Ask your Champion: 'Who signs off on budget?'..."
  priority: 'High' | 'Medium';
}

// --- NEW: Chat Action Types ---
export type ChatActionType = 'create_tasks' | 'update_prospecting_strategy' | 'update_deal_strategy' | 'log_interaction' | 'navigate';

export interface ChatAction {
  type: ChatActionType;
  label: string; // Text to show on button (e.g. "Add 3 Tasks")
  payload: any; // The data to apply
}
// -----------------------------

export type CanvasMode = 'slides' | 'sheets' | 'docs';

// Legacy Interface
export interface BridgeOutput {
  mode: CanvasMode;
  aiPrompt?: string; 
  csvContent?: string;
  textContent?: string;
  instructions: string; 
}

// New File Factory Interfaces
export interface SlideRegion {
  header?: string; // Used for Region Titles OR KPI Numbers
  content: string[]; // Bullets OR KPI Labels
  imageUrl?: string; // New: Image support
  imageCaption?: string; // New: Caption support
}

export interface BrandConfig {
  primaryColor: string; // Hex code
  secondaryColor?: string; // Hex code
  companyName: string;
}

export interface SlideData {
  title: string;
  layoutType?: 'text' | 'grid' | 'statement' | 'kpi' | 'chart_bar' | 'chart_pie' | 'split_left' | 'split_right' | 'team' | 'logo_grid' | 'process' | 'case_study';
  
  // Basic Text
  bullets?: string[]; 

  // For Grids & KPIs
  gridConfig?: { columns: number; rows: number };
  regions?: SlideRegion[];
  
  // For Charts
  chartData?: {
    labels: string[]; 
    values: number[];
    summary: string[];
  };
  
  speakerNotes?: string;
}

export interface DocData {
  title: string;
  sections: { header: string; content: string }[];
}

export interface GeneratedContent {
  slides?: SlideData[];
  docStructure?: DocData;
}

export interface CanvasDraft {
  id: string;
  mode: CanvasMode;
  title: string;
  content: string; 
  lastUpdated: string;
}

export type AuditType = 'slide' | 'document' | 'email';

export interface AuditResult {
  status: 'Pass' | 'Needs Revision' | 'Fail';
  critique: string;
  suggestion: string;
  fixItPrompt: string;
}

export interface SlidePrescription {
  slideNumber?: number;
  title: string;
  action: 'Keep' | 'Modify' | 'Discard' | 'New';
  reasoning: string;
  contentInstructions: {
    targetSection: string; // e.g. "Header", "Green Box"
    suggestedText: string;
  }[];
  talkTrack: string;
}

export interface DeckStrategy {
  strategySummary: string;
  slides: SlidePrescription[];
}

export interface ProspectTarget {
  id: string;
  name: string;
  title: string;
  linkedin?: string;
  context?: string;
  addedBy?: 'Signal' | 'Manual' | 'Search';
  dateAdded: string;
}

export type MeetingType = 'IQM' | 'Discovery' | 'Solution Presentation' | 'Follow Up' | 'Contract Negotiation';

export interface MeetingPrepData {
  type: MeetingType;
  content: string; // Markdown guide
  contextInput?: string; // e.g. LinkedIn profile used
  lastUpdated: string;
}

export interface SalesPlay {
  title: string;
  objective: string;
  target: string;
  hook: string;
  script: string;
}

export interface Account {
  id: string;
  isInPortfolio: boolean; // TRUE = Active (Sidebar), FALSE = Staging (Spreadsheet Only)
  
  ownerId?: string;
  organizationId?: string;
  name: string;
  annualRevenue?: string;
  
  // Relationship Status (Refined from 'status')
  relationshipStatus: 'Prospect' | 'Customer' | 'Former Customer';
  
  // Deal Status (New)
  dealStatus: 'Active' | 'None';
  
  currentSpend?: string;
  renewalDate?: string; 
  currentProducts?: string; // New: Products they use
  
  type?: string; 
  tier?: string;
  
  // MERGED STRATEGIC FIELDS
  estimatedGrowth?: string; 
  growthSignals?: string;
  rationale?: string;
  
  techStack?: string; 
  accountPlan?: string;
  discoveryPrep?: string; // Legacy field
  meetingPrep?: MeetingPrepData; // New robust field
  prospectingPlan?: string; 
  salesPlays?: SalesPlay[]; // Updated to structured array
  discoverySheet?: string;
  discoveryAgreement?: string;
  discoveryLinkedInContext?: string;
  prospectingMessages?: { type: 'Email' | 'LinkedIn'; content: string; date: string }[];
  prospects?: ProspectTarget[]; // New: List of identified prospects
  communicationLogs?: CommunicationLog[];
  transcripts?: string[];
  signals?: string;
  lastSignalCheck?: string;
  tasks?: Task[];
  dealActionItems?: ActionItem[];
  dealStrategy?: {
    recommendations: StrategicRecommendation[];
    lastAnalysisDate: string;
  };
  aiSummary?: {
    text: string;
    lastUpdated: string;
  };
  mutualActionPlan?: MAPEntry[];
  dealFrameworkAnalysis?: string;
  deal?: DealData;
  orgChart?: OrgContact[];
  googleSheetUrl?: string;
  coachingAnalysis?: any;
  savedCoachingSessions?: CoachingSession[];
  savedDrafts?: CanvasDraft[];
  
  // Hierarchy Support
  parentAccountId?: string;
}

export interface TerritoryRow {
  accountName: string;
  annualRevenue: string;
  currentSpend: string;
  currentProductsUsed: string;
  tier: string;
  rationale?: string;
}

export interface NavigationExtras {
  initialTab?: string;
  initialCanvasMode?: CanvasMode;
  initialInstruction?: string;
  initialSubTab?: string; // Added for deep linking
}

export interface DailyUsageStats {
  date: string; // YYYY-MM-DD
  inputTokens: number;
  outputTokens: number;
  totalCost: number;
  requestCount: number;
  modelBreakdown: Record<string, number>; // modelName -> cost
}

export type Frameworks = Record<FrameworkCategory, string>;

export type ViewId = 
  | 'dashboard'
  | 'territory' 
  | 'tasks' 
  | 'territoryPlan' 
  | 'accountPlan' 
  | 'prospectingPlan' 
  | 'signals' 
  | 'discovery' 
  | 'prospecting' 
  | 'transcripts' 
  | 'deal' 
  | 'orgChart' 
  | 'coaching' 
  | 'map' 
  | 'settings'
  | 'accountWorkspace'
  | 'help';

export interface AccountPlanTabProps {
  account: Account;
  sellerInfo: SellerInfo;
  frameworks: Frameworks;
  onUpdateAccount: (updatedAccount: Account) => void;
  allAccounts?: Account[]; // <--- NEW PROP
}
