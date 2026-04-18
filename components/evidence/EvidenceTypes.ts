import { Budget } from '../../types';

export interface EvidenceTemplatesProps {
  budgets: Budget[];
  onUpdate: (id: string, updates: Partial<Budget>) => void;
}

export type EvidenceTab = 'templates' | 'upload' | 'album';

export interface AlbumViewState {
  month: number | null;
  transactionKey: string | null;
}

export interface FormDataState {
  date: string;
  city: string;
  ksName: string;
  ksNip: string;
  trName: string;
  trNip: string;
  schoolName: string;
  year: string;
  amount: string;
  terbilang: string;
  receiver: string;
  receiverNip: string;
  description: string;
  activityName: string;
  projectLocation: string;
  contractorName: string;
  contractorAddress: string;
  contractorRole: string;
  spkNumber: string;
  skNumber: string;
  mouNumber: string;
  suratTugasNumber: string;
  sppdNumber: string;
  transportMode: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  reportResult: string;
  officials: any[];
  skConsiderations: string;
  skAppointees: any[];
  workers: any[];
}
