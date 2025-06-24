export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      api_keys: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          key_masked: string
          name: string
          secret_stored: boolean
          service: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          key_masked: string
          name: string
          secret_stored?: boolean
          service: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          key_masked?: string
          name?: string
          secret_stored?: boolean
          service?: string
        }
        Relationships: []
      }
      article_ai_analysis: {
        Row: {
          ai_model_used: string | null
          analysis_data: Json | null
          analysis_version: number | null
          analyzed_at: string | null
          article_id: string
          content_quality_score: number | null
          created_at: string | null
          extracted_keywords: Json | null
          id: string
          matched_clusters: Json | null
          performance_prediction: Json | null
          template_classification: string | null
        }
        Insert: {
          ai_model_used?: string | null
          analysis_data?: Json | null
          analysis_version?: number | null
          analyzed_at?: string | null
          article_id: string
          content_quality_score?: number | null
          created_at?: string | null
          extracted_keywords?: Json | null
          id?: string
          matched_clusters?: Json | null
          performance_prediction?: Json | null
          template_classification?: string | null
        }
        Update: {
          ai_model_used?: string | null
          analysis_data?: Json | null
          analysis_version?: number | null
          analyzed_at?: string | null
          article_id?: string
          content_quality_score?: number | null
          created_at?: string | null
          extracted_keywords?: Json | null
          id?: string
          matched_clusters?: Json | null
          performance_prediction?: Json | null
          template_classification?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "article_ai_analysis_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      article_metrics: {
        Row: {
          article_id: string
          bounce_rate: number | null
          comments_count: number | null
          created_at: string | null
          id: string
          metric_type: string | null
          page_views: number | null
          readability_score: number | null
          recorded_at: string | null
          seo_score: number | null
          social_shares: number | null
          time_on_page: number | null
          wordpress_stats: Json | null
        }
        Insert: {
          article_id: string
          bounce_rate?: number | null
          comments_count?: number | null
          created_at?: string | null
          id?: string
          metric_type?: string | null
          page_views?: number | null
          readability_score?: number | null
          recorded_at?: string | null
          seo_score?: number | null
          social_shares?: number | null
          time_on_page?: number | null
          wordpress_stats?: Json | null
        }
        Update: {
          article_id?: string
          bounce_rate?: number | null
          comments_count?: number | null
          created_at?: string | null
          id?: string
          metric_type?: string | null
          page_views?: number | null
          readability_score?: number | null
          recorded_at?: string | null
          seo_score?: number | null
          social_shares?: number | null
          time_on_page?: number | null
          wordpress_stats?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "article_metrics_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      articles: {
        Row: {
          article_date: string | null
          byline_text: string | null
          chunks_count: number | null
          clean_content: string | null
          co_authors: string[] | null
          content_complexity_score: number | null
          content_hash: string | null
          content_variants: Json | null
          created_at: string | null
          destinations: string[] | null
          editor_brief_id: string | null
          embedding: string | null
          excerpt: string | null
          featured_image_url: string | null
          fred_data: Json | null
          id: string
          is_chunked: boolean | null
          last_chunked_at: string | null
          last_wordpress_sync: string | null
          linked_prior_articles: string[] | null
          primary_author_id: string | null
          publication_targets: string[] | null
          published_at: string | null
          read_time_minutes: number | null
          related_trends: string[] | null
          scraped_at: string | null
          source_attribution: string | null
          source_news_id: string | null
          source_system: string | null
          source_url: string | null
          status: string | null
          template_type: string | null
          title: string
          updated_at: string | null
          website_article_id: string | null
          word_count: number | null
          wordpress_author_id: number | null
          wordpress_author_name: string | null
          wordpress_categories: Json | null
          wordpress_id: number | null
          wordpress_tags: Json | null
        }
        Insert: {
          article_date?: string | null
          byline_text?: string | null
          chunks_count?: number | null
          clean_content?: string | null
          co_authors?: string[] | null
          content_complexity_score?: number | null
          content_hash?: string | null
          content_variants?: Json | null
          created_at?: string | null
          destinations?: string[] | null
          editor_brief_id?: string | null
          embedding?: string | null
          excerpt?: string | null
          featured_image_url?: string | null
          fred_data?: Json | null
          id?: string
          is_chunked?: boolean | null
          last_chunked_at?: string | null
          last_wordpress_sync?: string | null
          linked_prior_articles?: string[] | null
          primary_author_id?: string | null
          publication_targets?: string[] | null
          published_at?: string | null
          read_time_minutes?: number | null
          related_trends?: string[] | null
          scraped_at?: string | null
          source_attribution?: string | null
          source_news_id?: string | null
          source_system?: string | null
          source_url?: string | null
          status?: string | null
          template_type?: string | null
          title: string
          updated_at?: string | null
          website_article_id?: string | null
          word_count?: number | null
          wordpress_author_id?: number | null
          wordpress_author_name?: string | null
          wordpress_categories?: Json | null
          wordpress_id?: number | null
          wordpress_tags?: Json | null
        }
        Update: {
          article_date?: string | null
          byline_text?: string | null
          chunks_count?: number | null
          clean_content?: string | null
          co_authors?: string[] | null
          content_complexity_score?: number | null
          content_hash?: string | null
          content_variants?: Json | null
          created_at?: string | null
          destinations?: string[] | null
          editor_brief_id?: string | null
          embedding?: string | null
          excerpt?: string | null
          featured_image_url?: string | null
          fred_data?: Json | null
          id?: string
          is_chunked?: boolean | null
          last_chunked_at?: string | null
          last_wordpress_sync?: string | null
          linked_prior_articles?: string[] | null
          primary_author_id?: string | null
          publication_targets?: string[] | null
          published_at?: string | null
          read_time_minutes?: number | null
          related_trends?: string[] | null
          scraped_at?: string | null
          source_attribution?: string | null
          source_news_id?: string | null
          source_system?: string | null
          source_url?: string | null
          status?: string | null
          template_type?: string | null
          title?: string
          updated_at?: string | null
          website_article_id?: string | null
          word_count?: number | null
          wordpress_author_id?: number | null
          wordpress_author_name?: string | null
          wordpress_categories?: Json | null
          wordpress_id?: number | null
          wordpress_tags?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "articles_primary_author_id_fkey"
            columns: ["primary_author_id"]
            isOneToOne: false
            referencedRelation: "authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "articles_source_news_id_fkey"
            columns: ["source_news_id"]
            isOneToOne: false
            referencedRelation: "news"
            referencedColumns: ["id"]
          },
        ]
      }
      authors: {
        Row: {
          article_count: number | null
          author_type: string
          average_rating: number | null
          bio: string | null
          created_at: string
          email: string | null
          expertise_areas: string[] | null
          first_published_date: string | null
          id: string
          is_active: boolean
          last_published_date: string | null
          name: string
          photo_url: string | null
          social_links: Json | null
          total_views: number | null
          updated_at: string
          user_id: string | null
          wordpress_author_id: number | null
          wordpress_author_name: string | null
        }
        Insert: {
          article_count?: number | null
          author_type: string
          average_rating?: number | null
          bio?: string | null
          created_at?: string
          email?: string | null
          expertise_areas?: string[] | null
          first_published_date?: string | null
          id?: string
          is_active?: boolean
          last_published_date?: string | null
          name: string
          photo_url?: string | null
          social_links?: Json | null
          total_views?: number | null
          updated_at?: string
          user_id?: string | null
          wordpress_author_id?: number | null
          wordpress_author_name?: string | null
        }
        Update: {
          article_count?: number | null
          author_type?: string
          average_rating?: number | null
          bio?: string | null
          created_at?: string
          email?: string | null
          expertise_areas?: string[] | null
          first_published_date?: string | null
          id?: string
          is_active?: boolean
          last_published_date?: string | null
          name?: string
          photo_url?: string | null
          social_links?: Json | null
          total_views?: number | null
          updated_at?: string
          user_id?: string | null
          wordpress_author_id?: number | null
          wordpress_author_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "authors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_chunks: {
        Row: {
          article_id: string
          chunk_index: number
          chunk_type: string
          content: string
          created_at: string
          embedding: string | null
          id: string
          metadata: Json | null
          updated_at: string
          word_count: number
        }
        Insert: {
          article_id: string
          chunk_index: number
          chunk_type?: string
          content: string
          created_at?: string
          embedding?: string | null
          id?: string
          metadata?: Json | null
          updated_at?: string
          word_count: number
        }
        Update: {
          article_id?: string
          chunk_index?: number
          chunk_type?: string
          content?: string
          created_at?: string
          embedding?: string | null
          id?: string
          metadata?: Json | null
          updated_at?: string
          word_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "content_chunks_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          model_preference: string | null
          project_id: string | null
          provider_preference: string | null
          status: string
          title: string
          total_cost: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          model_preference?: string | null
          project_id?: string | null
          provider_preference?: string | null
          status?: string
          title?: string
          total_cost?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          model_preference?: string | null
          project_id?: string | null
          provider_preference?: string | null
          status?: string
          title?: string
          total_cost?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      document_chunks: {
        Row: {
          chunk_index: number
          content: string
          created_at: string
          document_id: string | null
          embedding: string | null
          id: string
          metadata: Json | null
          word_count: number
        }
        Insert: {
          chunk_index: number
          content: string
          created_at?: string
          document_id?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
          word_count?: number
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string
          document_id?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
          word_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "document_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      document_uploads: {
        Row: {
          conversation_id: string | null
          extracted_text: string | null
          file_name: string
          file_size: number
          file_type: string
          id: string
          metadata: Json | null
          original_name: string
          processing_error: string | null
          processing_status: string | null
          storage_path: string
          summary: string | null
          upload_status: string
          uploaded_at: string
          user_id: string
        }
        Insert: {
          conversation_id?: string | null
          extracted_text?: string | null
          file_name: string
          file_size: number
          file_type: string
          id?: string
          metadata?: Json | null
          original_name: string
          processing_error?: string | null
          processing_status?: string | null
          storage_path: string
          summary?: string | null
          upload_status?: string
          uploaded_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string | null
          extracted_text?: string | null
          file_name?: string
          file_size?: number
          file_type?: string
          id?: string
          metadata?: Json | null
          original_name?: string
          processing_error?: string | null
          processing_status?: string | null
          storage_path?: string
          summary?: string | null
          upload_status?: string
          uploaded_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_uploads_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_uploads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      editor_briefs: {
        Row: {
          content_variants: Json | null
          created_at: string | null
          destinations: string[] | null
          id: string
          outline: string | null
          source_id: string | null
          source_type: string | null
          sources: string[] | null
          status: string | null
          suggested_articles: string[] | null
          summary: string | null
          theme: string
          title: string | null
          updated_at: string | null
        }
        Insert: {
          content_variants?: Json | null
          created_at?: string | null
          destinations?: string[] | null
          id?: string
          outline?: string | null
          source_id?: string | null
          source_type?: string | null
          sources?: string[] | null
          status?: string | null
          suggested_articles?: string[] | null
          summary?: string | null
          theme: string
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          content_variants?: Json | null
          created_at?: string | null
          destinations?: string[] | null
          id?: string
          outline?: string | null
          source_id?: string | null
          source_type?: string | null
          sources?: string[] | null
          status?: string | null
          suggested_articles?: string[] | null
          summary?: string | null
          theme?: string
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      job_execution_logs: {
        Row: {
          completed_at: string | null
          created_at: string
          details: Json | null
          duration_ms: number | null
          execution_type: string
          id: string
          job_name: string
          message: string | null
          parameters_used: Json | null
          started_at: string
          status: string
          triggered_by: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          details?: Json | null
          duration_ms?: number | null
          execution_type?: string
          id?: string
          job_name: string
          message?: string | null
          parameters_used?: Json | null
          started_at?: string
          status?: string
          triggered_by?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          details?: Json | null
          duration_ms?: number | null
          execution_type?: string
          id?: string
          job_name?: string
          message?: string | null
          parameters_used?: Json | null
          started_at?: string
          status?: string
          triggered_by?: string | null
        }
        Relationships: []
      }
      keyword_clusters: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          keywords: string[] | null
          primary_theme: string
          priority_weight: number | null
          professions: string[] | null
          sub_theme: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          keywords?: string[] | null
          primary_theme: string
          priority_weight?: number | null
          professions?: string[] | null
          sub_theme: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          keywords?: string[] | null
          primary_theme?: string
          priority_weight?: number | null
          professions?: string[] | null
          sub_theme?: string
        }
        Relationships: []
      }
      keyword_plans: {
        Row: {
          assigned_to: string | null
          associated_clusters: string[] | null
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          priority: string
          start_date: string
          status: string
          title: string
        }
        Insert: {
          assigned_to?: string | null
          associated_clusters?: string[] | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          priority?: string
          start_date: string
          status?: string
          title: string
        }
        Update: {
          assigned_to?: string | null
          associated_clusters?: string[] | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          priority?: string
          start_date?: string
          status?: string
          title?: string
        }
        Relationships: []
      }
      keyword_tracking: {
        Row: {
          article_count: number | null
          category: string | null
          created_at: string | null
          id: string
          keyword: string
          last_searched_date: string | null
          priority: string | null
          status: string | null
        }
        Insert: {
          article_count?: number | null
          category?: string | null
          created_at?: string | null
          id?: string
          keyword: string
          last_searched_date?: string | null
          priority?: string | null
          status?: string | null
        }
        Update: {
          article_count?: number | null
          category?: string | null
          created_at?: string | null
          id?: string
          keyword?: string
          last_searched_date?: string | null
          priority?: string | null
          status?: string | null
        }
        Relationships: []
      }
      knowledge_categories: {
        Row: {
          access_level: string
          created_at: string
          department_restricted: string[] | null
          description: string | null
          icon: string | null
          id: string
          name: string
          parent_category: string | null
        }
        Insert: {
          access_level?: string
          created_at?: string
          department_restricted?: string[] | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          parent_category?: string | null
        }
        Update: {
          access_level?: string
          created_at?: string
          department_restricted?: string[] | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          parent_category?: string | null
        }
        Relationships: []
      }
      knowledge_items: {
        Row: {
          ai_keywords: Json | null
          ai_summary: string | null
          audio_duration_seconds: number | null
          audio_metadata: Json | null
          category: string
          classification_level: string
          client_reference: string | null
          content_type: string
          created_at: string
          department: string | null
          description: string | null
          document_upload_id: string | null
          file_path: string | null
          id: string
          last_accessed_at: string | null
          metadata: Json | null
          processing_cost: number | null
          processing_status: string | null
          project_code: string | null
          speaker_count: number | null
          subcategory: string | null
          tags: string[] | null
          title: string
          transcript_text: string | null
          updated_at: string
          user_id: string
          view_count: number | null
        }
        Insert: {
          ai_keywords?: Json | null
          ai_summary?: string | null
          audio_duration_seconds?: number | null
          audio_metadata?: Json | null
          category: string
          classification_level?: string
          client_reference?: string | null
          content_type: string
          created_at?: string
          department?: string | null
          description?: string | null
          document_upload_id?: string | null
          file_path?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          processing_cost?: number | null
          processing_status?: string | null
          project_code?: string | null
          speaker_count?: number | null
          subcategory?: string | null
          tags?: string[] | null
          title: string
          transcript_text?: string | null
          updated_at?: string
          user_id: string
          view_count?: number | null
        }
        Update: {
          ai_keywords?: Json | null
          ai_summary?: string | null
          audio_duration_seconds?: number | null
          audio_metadata?: Json | null
          category?: string
          classification_level?: string
          client_reference?: string | null
          content_type?: string
          created_at?: string
          department?: string | null
          description?: string | null
          document_upload_id?: string | null
          file_path?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          processing_cost?: number | null
          processing_status?: string | null
          project_code?: string | null
          speaker_count?: number | null
          subcategory?: string | null
          tags?: string[] | null
          title?: string
          transcript_text?: string | null
          updated_at?: string
          user_id?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_items_document_upload_id_fkey"
            columns: ["document_upload_id"]
            isOneToOne: false
            referencedRelation: "document_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_shares: {
        Row: {
          created_at: string
          id: string
          knowledge_item_id: string | null
          permission_level: string
          shared_by: string
          shared_with: string | null
          shared_with_department: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          knowledge_item_id?: string | null
          permission_level?: string
          shared_by: string
          shared_with?: string | null
          shared_with_department?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          knowledge_item_id?: string | null
          permission_level?: string
          shared_by?: string
          shared_with?: string | null
          shared_with_department?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_shares_knowledge_item_id_fkey"
            columns: ["knowledge_item_id"]
            isOneToOne: false
            referencedRelation: "knowledge_items"
            referencedColumns: ["id"]
          },
        ]
      }
      llm_prompts: {
        Row: {
          created_at: string | null
          function_name: string
          id: string
          include_clusters: boolean | null
          include_sources_map: boolean | null
          include_tracking_summary: boolean | null
          is_active: boolean | null
          last_updated_by: string | null
          model: string
          prompt_text: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          function_name: string
          id?: string
          include_clusters?: boolean | null
          include_sources_map?: boolean | null
          include_tracking_summary?: boolean | null
          is_active?: boolean | null
          last_updated_by?: string | null
          model: string
          prompt_text: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          function_name?: string
          id?: string
          include_clusters?: boolean | null
          include_sources_map?: boolean | null
          include_tracking_summary?: boolean | null
          is_active?: boolean | null
          last_updated_by?: string | null
          model?: string
          prompt_text?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      llm_usage_logs: {
        Row: {
          completion_tokens: number
          created_at: string
          duration_ms: number | null
          error_message: string | null
          estimated_cost: number
          function_name: string
          id: string
          model: string
          operation_metadata: Json | null
          prompt_tokens: number
          status: string
          total_tokens: number
          user_id: string | null
        }
        Insert: {
          completion_tokens?: number
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          estimated_cost?: number
          function_name: string
          id?: string
          model: string
          operation_metadata?: Json | null
          prompt_tokens?: number
          status?: string
          total_tokens?: number
          user_id?: string | null
        }
        Update: {
          completion_tokens?: number
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          estimated_cost?: number
          function_name?: string
          id?: string
          model?: string
          operation_metadata?: Json | null
          prompt_tokens?: number
          status?: string
          total_tokens?: number
          user_id?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          completion_tokens: number | null
          content: string
          conversation_id: string
          cost: number | null
          created_at: string
          id: string
          metadata: Json | null
          model_used: string | null
          prompt_tokens: number | null
          provider_used: string | null
          role: string
          total_tokens: number | null
          user_id: string | null
        }
        Insert: {
          completion_tokens?: number | null
          content: string
          conversation_id: string
          cost?: number | null
          created_at?: string
          id?: string
          metadata?: Json | null
          model_used?: string | null
          prompt_tokens?: number | null
          provider_used?: string | null
          role: string
          total_tokens?: number | null
          user_id?: string | null
        }
        Update: {
          completion_tokens?: number | null
          content?: string
          conversation_id?: string
          cost?: number | null
          created_at?: string
          id?: string
          metadata?: Json | null
          model_used?: string | null
          prompt_tokens?: number | null
          provider_used?: string | null
          role?: string
          total_tokens?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      model_configurations: {
        Row: {
          api_availability: string | null
          capabilities: Json | null
          context_window_tokens: number | null
          cost_per_1k_tokens: number
          cost_tier: string | null
          created_at: string
          default_monthly_limit: number
          description: string | null
          display_name: string
          display_order: number | null
          id: string
          is_deprecated: boolean | null
          is_globally_enabled: boolean
          last_pricing_update: string | null
          max_tokens: number | null
          model_name: string
          optimal_temperature: number | null
          performance_notes: string | null
          pricing_source: string | null
          primary_use_cases: Json | null
          provider: string
          provider_specific_params: Json | null
          recommended_context_tokens: number | null
          recommended_for: string | null
          recommended_max_tokens: number | null
          supports_streaming: boolean | null
          updated_at: string
        }
        Insert: {
          api_availability?: string | null
          capabilities?: Json | null
          context_window_tokens?: number | null
          cost_per_1k_tokens?: number
          cost_tier?: string | null
          created_at?: string
          default_monthly_limit?: number
          description?: string | null
          display_name: string
          display_order?: number | null
          id?: string
          is_deprecated?: boolean | null
          is_globally_enabled?: boolean
          last_pricing_update?: string | null
          max_tokens?: number | null
          model_name: string
          optimal_temperature?: number | null
          performance_notes?: string | null
          pricing_source?: string | null
          primary_use_cases?: Json | null
          provider: string
          provider_specific_params?: Json | null
          recommended_context_tokens?: number | null
          recommended_for?: string | null
          recommended_max_tokens?: number | null
          supports_streaming?: boolean | null
          updated_at?: string
        }
        Update: {
          api_availability?: string | null
          capabilities?: Json | null
          context_window_tokens?: number | null
          cost_per_1k_tokens?: number
          cost_tier?: string | null
          created_at?: string
          default_monthly_limit?: number
          description?: string | null
          display_name?: string
          display_order?: number | null
          id?: string
          is_deprecated?: boolean | null
          is_globally_enabled?: boolean
          last_pricing_update?: string | null
          max_tokens?: number | null
          model_name?: string
          optimal_temperature?: number | null
          performance_notes?: string | null
          pricing_source?: string | null
          primary_use_cases?: Json | null
          provider?: string
          provider_specific_params?: Json | null
          recommended_context_tokens?: number | null
          recommended_for?: string | null
          recommended_max_tokens?: number | null
          supports_streaming?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      news: {
        Row: {
          byline_text: string | null
          clean_content: string | null
          content_hash: string | null
          content_variants: Json | null
          destinations: string[] | null
          editorial_content: string | null
          editorial_headline: string | null
          editorial_summary: string | null
          id: string
          is_competitor_covered: boolean | null
          last_scraped_at: string | null
          matched_clusters: string[] | null
          original_author: string | null
          original_publication_date: string | null
          original_title: string | null
          perplexity_score: number | null
          primary_author_id: string | null
          publication_confidence_score: number | null
          publication_status: string | null
          published_article_id: string | null
          source: string | null
          source_attribution: string | null
          source_content: string | null
          status: string | null
          summary: string | null
          template_type: string | null
          timestamp: string | null
          url: string
        }
        Insert: {
          byline_text?: string | null
          clean_content?: string | null
          content_hash?: string | null
          content_variants?: Json | null
          destinations?: string[] | null
          editorial_content?: string | null
          editorial_headline?: string | null
          editorial_summary?: string | null
          id?: string
          is_competitor_covered?: boolean | null
          last_scraped_at?: string | null
          matched_clusters?: string[] | null
          original_author?: string | null
          original_publication_date?: string | null
          original_title?: string | null
          perplexity_score?: number | null
          primary_author_id?: string | null
          publication_confidence_score?: number | null
          publication_status?: string | null
          published_article_id?: string | null
          source?: string | null
          source_attribution?: string | null
          source_content?: string | null
          status?: string | null
          summary?: string | null
          template_type?: string | null
          timestamp?: string | null
          url: string
        }
        Update: {
          byline_text?: string | null
          clean_content?: string | null
          content_hash?: string | null
          content_variants?: Json | null
          destinations?: string[] | null
          editorial_content?: string | null
          editorial_headline?: string | null
          editorial_summary?: string | null
          id?: string
          is_competitor_covered?: boolean | null
          last_scraped_at?: string | null
          matched_clusters?: string[] | null
          original_author?: string | null
          original_publication_date?: string | null
          original_title?: string | null
          perplexity_score?: number | null
          primary_author_id?: string | null
          publication_confidence_score?: number | null
          publication_status?: string | null
          published_article_id?: string | null
          source?: string | null
          source_attribution?: string | null
          source_content?: string | null
          status?: string | null
          summary?: string | null
          template_type?: string | null
          timestamp?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_published_article_id_fkey"
            columns: ["published_article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_history: {
        Row: {
          created_at: string | null
          id: string
          metadata: Json | null
          model_name: string
          new_price: number
          old_price: number | null
          price_change_reason: string | null
          provider: string
          updated_by: string | null
          updated_via: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          model_name: string
          new_price: number
          old_price?: number | null
          price_change_reason?: string | null
          provider: string
          updated_by?: string | null
          updated_via?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          model_name?: string
          new_price?: number
          old_price?: number | null
          price_change_reason?: string | null
          provider?: string
          updated_by?: string | null
          updated_via?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pricing_history_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          approval_requested_at: string | null
          approved_at: string | null
          approved_by: string | null
          avatar_url: string | null
          created_at: string
          department: string | null
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          approval_requested_at?: string | null
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email: string
          first_name?: string | null
          id: string
          last_name?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          approval_requested_at?: string | null
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_archived: boolean
          name: string
          parent_project_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_archived?: boolean
          name: string
          parent_project_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_archived?: boolean
          name?: string
          parent_project_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_parent_project_id_fkey"
            columns: ["parent_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_job_settings: {
        Row: {
          created_at: string
          id: string
          is_enabled: boolean
          job_name: string
          last_run: string | null
          parameters: Json
          schedule: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          job_name: string
          last_run?: string | null
          parameters?: Json
          schedule: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          job_name?: string
          last_run?: string | null
          parameters?: Json
          schedule?: string
          updated_at?: string
        }
        Relationships: []
      }
      sources: {
        Row: {
          cluster_alignment: string[] | null
          created_at: string | null
          id: string
          priority_tier: number | null
          source_name: string
          source_type: string | null
          source_url: string
        }
        Insert: {
          cluster_alignment?: string[] | null
          created_at?: string | null
          id?: string
          priority_tier?: number | null
          source_name: string
          source_type?: string | null
          source_url: string
        }
        Update: {
          cluster_alignment?: string[] | null
          created_at?: string | null
          id?: string
          priority_tier?: number | null
          source_name?: string
          source_type?: string | null
          source_url?: string
        }
        Relationships: []
      }
      summary_requests: {
        Row: {
          created_at: string | null
          id: string
          knowledge_item_id: string
          status: string | null
          summary_content: string | null
          template_id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          knowledge_item_id: string
          status?: string | null
          summary_content?: string | null
          template_id: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          knowledge_item_id?: string
          status?: string | null
          summary_content?: string | null
          template_id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "summary_requests_knowledge_item_id_fkey"
            columns: ["knowledge_item_id"]
            isOneToOne: false
            referencedRelation: "knowledge_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "summary_requests_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "summary_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      summary_templates: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          name: string
          prompt_template: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          prompt_template: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          prompt_template?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      sync_operations: {
        Row: {
          completed_items: number | null
          created_at: string
          error_details: Json | null
          id: string
          merge_decisions: Json | null
          operation_type: string
          results_summary: Json | null
          status: string
          total_items: number | null
          updated_at: string
        }
        Insert: {
          completed_items?: number | null
          created_at?: string
          error_details?: Json | null
          id?: string
          merge_decisions?: Json | null
          operation_type: string
          results_summary?: Json | null
          status?: string
          total_items?: number | null
          updated_at?: string
        }
        Update: {
          completed_items?: number | null
          created_at?: string
          error_details?: Json | null
          id?: string
          merge_decisions?: Json | null
          operation_type?: string
          results_summary?: Json | null
          status?: string
          total_items?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      user_api_access: {
        Row: {
          created_at: string
          current_usage: number
          id: string
          is_enabled: boolean
          metadata: Json | null
          model_name: string
          monthly_limit: number
          provider: string
          updated_at: string
          usage_period_start: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_usage?: number
          id?: string
          is_enabled?: boolean
          metadata?: Json | null
          model_name: string
          monthly_limit?: number
          provider: string
          updated_at?: string
          usage_period_start?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_usage?: number
          id?: string
          is_enabled?: boolean
          metadata?: Json | null
          model_name?: string
          monthly_limit?: number
          provider?: string
          updated_at?: string
          usage_period_start?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_api_access_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      news_approval_stats: {
        Row: {
          approval_date: string | null
          dismissed_count: number | null
          magazine_count: number | null
          mpdaily_count: number | null
          total_reviewed: number | null
          website_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      bulk_update_user_model_access: {
        Args: {
          user_ids: string[]
          provider_param: string
          model_param: string
          is_enabled_param: boolean
          monthly_limit_param?: number
        }
        Returns: number
      }
      get_active_api_key: {
        Args: { service_name: string }
        Returns: string
      }
      get_admin_dashboard_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          total_users: number
          active_today: number
          active_this_week: number
          active_this_month: number
          total_conversations: number
          conversations_today: number
          conversations_this_week: number
          conversations_this_month: number
          total_cost: number
          cost_today: number
          cost_this_week: number
          cost_this_month: number
          avg_response_time: number
          error_rate: number
          active_connections: number
        }[]
      }
      get_admin_model_overview: {
        Args: Record<PropertyKey, never>
        Returns: {
          provider: string
          model_name: string
          display_name: string
          is_globally_enabled: boolean
          default_monthly_limit: number
          cost_per_1k_tokens: number
          total_users_with_access: number
          total_monthly_usage: number
          api_key_status: string
          last_pricing_update: string
          pricing_source: string
          is_deprecated: boolean
          api_availability: string
          primary_use_cases: Json
          recommended_for: string
          cost_tier: string
          performance_notes: string
          context_window_tokens: number
          supports_streaming: boolean
          recommended_max_tokens: number
          recommended_context_tokens: number
          optimal_temperature: number
          provider_specific_params: Json
        }[]
      }
      get_approval_stats: {
        Args: { start_date: string; end_date: string }
        Returns: {
          approval_date: string
          mpdaily_count: number
          magazine_count: number
          website_count: number
          dismissed_count: number
          total_reviewed: number
        }[]
      }
      get_available_models: {
        Args: Record<PropertyKey, never>
        Returns: {
          provider: string
          model_name: string
          is_active: boolean
        }[]
      }
      get_cron_jobs: {
        Args: Record<PropertyKey, never>
        Returns: {
          jobid: number
          jobname: string
          schedule: string
          command: string
          nodename: string
          nodeport: number
          database: string
          username: string
          active: boolean
          next_run: string
        }[]
      }
      get_daily_usage_trends: {
        Args: { start_date?: string; end_date?: string }
        Returns: {
          date: string
          conversations: number
          cost: number
          users: number
        }[]
      }
      get_job_execution_logs: {
        Args: {
          p_job_name?: string
          p_status?: string
          p_execution_type?: string
          p_limit?: number
          p_offset?: number
        }
        Returns: {
          completed_at: string | null
          created_at: string
          details: Json | null
          duration_ms: number | null
          execution_type: string
          id: string
          job_name: string
          message: string | null
          parameters_used: Json | null
          started_at: string
          status: string
          triggered_by: string | null
        }[]
      }
      get_job_settings: {
        Args: { job_name_param: string }
        Returns: {
          created_at: string
          id: string
          is_enabled: boolean
          job_name: string
          last_run: string | null
          parameters: Json
          schedule: string
          updated_at: string
        }[]
      }
      get_model_token_config: {
        Args: { provider_param: string; model_param: string }
        Returns: {
          recommended_max_tokens: number
          recommended_context_tokens: number
          optimal_temperature: number
          provider_specific_params: Json
        }[]
      }
      get_model_usage_distribution: {
        Args: Record<PropertyKey, never>
        Returns: {
          provider: string
          model_name: string
          usage_count: number
          total_cost: number
          usage_percentage: number
        }[]
      }
      get_monthly_summary: {
        Args: { target_year?: number; target_month?: number }
        Returns: {
          total_conversations: number
          total_cost: number
          average_per_user: number
          active_users: number
          new_users: number
          top_model: string
          cost_growth_percentage: number
        }[]
      }
      get_recent_admin_activities: {
        Args: { limit_count?: number }
        Returns: {
          id: string
          activity_type: string
          message: string
          user_email: string
          metadata: Json
          created_at: string
        }[]
      }
      get_top_users_by_usage: {
        Args: { period_days?: number; limit_count?: number }
        Returns: {
          user_id: string
          user_email: string
          user_name: string
          total_cost: number
          conversation_count: number
          usage_percentage: number
        }[]
      }
      get_usage_alerts: {
        Args: Record<PropertyKey, never>
        Returns: {
          user_id: string
          user_email: string
          user_name: string
          current_usage: number
          monthly_limit: number
          usage_percentage: number
          alert_level: string
        }[]
      }
      get_user_model_access: {
        Args: { user_id_param: string }
        Returns: {
          provider: string
          model_name: string
          is_enabled: boolean
          usage_percentage: number
          remaining_credits: number
          monthly_limit: number
          is_over_limit: boolean
        }[]
      }
      get_user_model_matrix: {
        Args: Record<PropertyKey, never>
        Returns: {
          user_id: string
          user_email: string
          user_name: string
          user_status: string
          total_monthly_usage: number
          conversation_count: number
          model_access: Json
        }[]
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id?: string
        }
        Returns: boolean
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      initialize_user_api_access: {
        Args: { user_id_param: string }
        Returns: undefined
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: unknown
      }
      log_job_execution: {
        Args: {
          p_job_name: string
          p_execution_type?: string
          p_status?: string
          p_message?: string
          p_details?: Json
          p_parameters_used?: Json
          p_triggered_by?: string
        }
        Returns: string
      }
      log_llm_usage: {
        Args: {
          p_function_name: string
          p_model: string
          p_prompt_tokens?: number
          p_completion_tokens?: number
          p_total_tokens?: number
          p_estimated_cost?: number
          p_duration_ms?: number
          p_status?: string
          p_error_message?: string
          p_user_id?: string
          p_operation_metadata?: Json
        }
        Returns: string
      }
      reactivate_scheduled_job: {
        Args: { job_name_param: string }
        Returns: string
      }
      search_content_chunks: {
        Args: {
          query_text: string
          query_embedding?: string
          similarity_threshold?: number
          max_results?: number
          article_filters?: Json
        }
        Returns: {
          id: string
          article_id: string
          content: string
          word_count: number
          chunk_type: string
          similarity: number
          rank: number
          article_title: string
          article_status: string
        }[]
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      update_job_execution_status: {
        Args: {
          p_log_id: string
          p_status: string
          p_message?: string
          p_details?: Json
        }
        Returns: boolean
      }
      update_job_settings: {
        Args: { job_name_param: string; settings_json: Json }
        Returns: boolean
      }
      update_news_fetch_job: {
        Args: {
          p_job_name: string
          p_schedule: string
          p_is_enabled: boolean
          p_parameters: Json
        }
        Returns: string
      }
      update_user_api_usage: {
        Args: {
          user_id_param: string
          provider_param: string
          model_param: string
          cost_param: number
        }
        Returns: undefined
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
    }
    Enums: {
      app_role: "admin" | "editor" | "writer" | "viewer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "editor", "writer", "viewer"],
    },
  },
} as const
