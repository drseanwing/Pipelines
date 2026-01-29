// Document generation type definitions

export enum DocumentType {
  RESEARCH_PROTOCOL = 'RESEARCH_PROTOCOL',
  QI_PROJECT_PLAN = 'QI_PROJECT_PLAN',
  EMF_APPLICATION = 'EMF_APPLICATION',
  HREC_COVER_LETTER = 'HREC_COVER_LETTER',
  PICF = 'PICF',
  DATA_MANAGEMENT_PLAN = 'DATA_MANAGEMENT_PLAN',
  SITE_ASSESSMENT = 'SITE_ASSESSMENT',
  LNR_APPLICATION = 'LNR_APPLICATION'
}

export enum DocumentStatus {
  DRAFT = 'DRAFT',
  PENDING_REVIEW = 'PENDING_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  FINAL = 'FINAL'
}

export interface DocumentMetadata {
  project_id: string;
  version: string;
  generated_at: string;
  total_pages?: number;
  word_count?: number;
}

export interface GeneratedDocument {
  id: string;
  project_id: string;
  document_type: DocumentType;
  filename: string;
  file_path: string;
  file_size?: number;
  mime_type?: string;
  version: string;
  status: DocumentStatus;
  created_at: string;
  metadata?: DocumentMetadata;
}

export interface DocumentsOutput {
  generated: GeneratedDocument[];
  pending_review: string[];
  metadata: {
    total_documents: number;
    submission_checklist: {
      document_type: DocumentType;
      required: boolean;
      status: string;
    }[];
    estimated_pages: number;
  };
}
