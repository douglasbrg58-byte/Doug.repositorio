export type VictimStatus = 'active' | 'inactive' | 'refused';

export interface Victim {
  id: string;
  internalCode?: string;
  processNumber: string;
  name: string;
  phone: string;
  aggressorName: string;
  protectiveMeasureDate: string;
  observations: string;
  status: VictimStatus;
  attachmentUrl?: string;
  attachmentName?: string;
  refusalDate?: string | null;
  createdAt: any;
  updatedAt: any;
}

export type VisitType = 'victim' | 'aggressor';
export type VisitSituation = 'first_visit' | 'follow_up' | 'emergency' | 'violation';

export interface Visit {
  id: string;
  victimId: string;
  date: string;
  type: VisitType;
  situation: VisitSituation;
  observation: string;
  createdAt: any;
}
