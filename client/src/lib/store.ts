import { create } from 'zustand';
import { addDays, format } from 'date-fns';

export type UserRole = 'solicitor' | 'expert' | 'admin';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  avatar: string;
  specialty?: string; // For experts
}

export interface Meeting {
  id: string;
  title: string;
  date: Date;
  duration: number; // minutes
  attendees: string[]; // User IDs
  caseId?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  hasTranscript: boolean;
}

export interface Case {
  id: string;
  title: string;
  reference: string;
  clientName: string;
  status: 'active' | 'closed';
  solicitorId: string;
  assignedExperts: string[];
}

export interface Transcript {
  id: string;
  meetingId: string;
  content: string;
  date: Date;
  participants: string[];
}

interface GatewayStore {
  currentUser: User | null;
  users: User[];
  meetings: Meeting[];
  cases: Case[];
  transcripts: Transcript[];
  
  // Actions
  setCurrentUser: (user: User) => void;
  addMeeting: (meeting: Meeting) => void;
  addCase: (caseItem: Case) => void;
  generateTranscript: (meetingId: string) => void;
}

// Mock Data
const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Sarah Jennings', role: 'solicitor', email: 'sarah.j@lawfirm.com', avatar: 'https://i.pravatar.cc/150?u=u1' },
  { id: 'u2', name: 'Dr. Alan Grant', role: 'expert', specialty: 'Forensic Psychology', email: 'alan.g@experts.com', avatar: 'https://i.pravatar.cc/150?u=u2' },
  { id: 'u3', name: 'Dr. Ellie Sattler', role: 'expert', specialty: 'Orthopedics', email: 'ellie.s@experts.com', avatar: 'https://i.pravatar.cc/150?u=u3' },
];

const MOCK_CASES: Case[] = [
  { id: 'c1', title: 'Smith vs. Jones Insurance', reference: 'REF-2024-001', clientName: 'John Smith', status: 'active', solicitorId: 'u1', assignedExperts: ['u2'] },
  { id: 'c2', title: 'Estate of H. Croft', reference: 'REF-2024-042', clientName: 'Lara Croft', status: 'active', solicitorId: 'u1', assignedExperts: ['u3'] },
];

const MOCK_MEETINGS: Meeting[] = [
  { id: 'm1', title: 'Initial Assessment - Smith', date: addDays(new Date(), 2), duration: 60, attendees: ['u1', 'u2'], caseId: 'c1', status: 'scheduled', hasTranscript: false },
  { id: 'm2', title: 'Expert Review - Croft', date: addDays(new Date(), -2), duration: 45, attendees: ['u1', 'u3'], caseId: 'c2', status: 'completed', hasTranscript: true },
];

const MOCK_TRANSCRIPTS: Transcript[] = [
  { 
    id: 't1', 
    meetingId: 'm2', 
    date: addDays(new Date(), -2), 
    participants: ['Sarah Jennings', 'Dr. Ellie Sattler'],
    content: "Sarah Jennings: Good morning Dr. Sattler. regarding the Croft estate...\n\nDr. Sattler: Yes, I've reviewed the medical files. The injury dates clearly predate the incident in question.\n\nSarah Jennings: That is critical for our defense. Can you elaborate on the bone density scans?\n\nDr. Sattler: Certainly. The scans show signs of healed fractures that are at least 5 years old..." 
  }
];

export const useStore = create<GatewayStore>((set) => ({
  currentUser: MOCK_USERS[0], // Default to Solicitor
  users: MOCK_USERS,
  meetings: MOCK_MEETINGS,
  cases: MOCK_CASES,
  transcripts: MOCK_TRANSCRIPTS,

  setCurrentUser: (user: User) => set({ currentUser: user }),
  addMeeting: (meeting: Meeting) => set((state) => ({ meetings: [...state.meetings, meeting] })),
  addCase: (caseItem: Case) => set((state) => ({ cases: [...state.cases, caseItem] })),
  generateTranscript: (meetingId: string) => {
    // Mock generating a transcript
    const id = Math.random().toString(36).substr(2, 9);
    const newTranscript: Transcript = {
      id,
      meetingId,
      date: new Date(),
      participants: ['Participants...'],
      content: "Transcript generated automatically by Gateway AI...\n\n[Meeting Start]\n..."
    };
    set((state) => ({ 
      transcripts: [...state.transcripts, newTranscript],
      meetings: state.meetings.map((m) => m.id === meetingId ? { ...m, hasTranscript: true, status: 'completed' } : m)
    }));
  }
}));
