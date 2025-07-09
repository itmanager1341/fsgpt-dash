
export interface Project {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  parent_project_id?: string;
  is_archived: boolean;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProjectWithConversations extends Project {
  conversations: Array<{
    id: string;
    title: string;
    updated_at: string;
    total_cost: number;
  }>;
  subprojects?: ProjectWithConversations[];
}

export interface CreateProjectData {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  parent_project_id?: string;
  is_public?: boolean;
}
