
export interface KnowledgeItem {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  content_type: 'document' | 'presentation' | 'recording' | 'template' | 'guideline' | 'report';
  category: 'company_resources' | 'department_library' | 'project_workspace' | 'personal_collection';
  subcategory?: string;
  file_path?: string;
  document_upload_id?: string;
  classification_level: 'public' | 'internal' | 'confidential';
  department?: 'marketing' | 'operations' | 'strategy' | 'hr' | 'finance';
  project_code?: string;
  client_reference?: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  ai_summary?: string;
  ai_keywords?: string[];
  metadata?: Record<string, any>;
  tags?: string[];
  view_count: number;
  last_accessed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeCategory {
  id: string;
  name: string;
  parent_category?: string;
  icon?: string;
  description?: string;
  access_level: 'public' | 'internal' | 'restricted';
  department_restricted?: string[];
  created_at: string;
}

export interface KnowledgeShare {
  id: string;
  knowledge_item_id: string;
  shared_by: string;
  shared_with?: string;
  shared_with_department?: string;
  permission_level: 'view' | 'edit' | 'admin';
  created_at: string;
}

export interface FSGDepartment {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
}

export const FSG_DEPARTMENTS: FSGDepartment[] = [
  { id: 'marketing', name: 'Marketing', description: 'Marketing campaigns and materials', icon: 'megaphone', color: 'pink' },
  { id: 'operations', name: 'Operations', description: 'Operational procedures and resources', icon: 'settings', color: 'gray' },
  { id: 'strategy', name: 'Strategy', description: 'Strategic planning and analysis', icon: 'target', color: 'red' },
  { id: 'hr', name: 'Human Resources', description: 'HR policies and training materials', icon: 'users', color: 'orange' },
  { id: 'finance', name: 'Finance', description: 'Financial reports and procedures', icon: 'dollar-sign', color: 'emerald' },
];

export const CONTENT_TYPES = [
  { id: 'document', name: 'Document', icon: 'file-text' },
  { id: 'presentation', name: 'Presentation', icon: 'presentation' },
  { id: 'recording', name: 'Recording', icon: 'mic' },
  { id: 'template', name: 'Template', icon: 'template' },
  { id: 'guideline', name: 'Guideline', icon: 'file-check' },
  { id: 'report', name: 'Report', icon: 'bar-chart' },
];

export const CLASSIFICATION_LEVELS = [
  { id: 'public', name: 'Public', description: 'Available to everyone', color: 'green' },
  { id: 'internal', name: 'Internal', description: 'FSG internal use only', color: 'blue' },
  { id: 'confidential', name: 'Confidential', description: 'Restricted access', color: 'red' },
];
