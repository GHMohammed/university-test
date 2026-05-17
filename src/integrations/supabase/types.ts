export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      absence_rules: {
        Row: {
          course_id: string | null
          id: string
          max_absence_count: number
          warning_threshold_percent: number
        }
        Insert: {
          course_id?: string | null
          id?: string
          max_absence_count?: number
          warning_threshold_percent?: number
        }
        Update: {
          course_id?: string | null
          id?: string
          max_absence_count?: number
          warning_threshold_percent?: number
        }
        Relationships: [
          {
            foreignKeyName: "absence_rules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_terms: {
        Row: {
          academic_year: string
          created_at: string
          end_date: string
          id: string
          is_active: boolean
          name: string
          start_date: string
          term_type: string
        }
        Insert: {
          academic_year: string
          created_at?: string
          end_date: string
          id?: string
          is_active?: boolean
          name: string
          start_date: string
          term_type?: string
        }
        Update: {
          academic_year?: string
          created_at?: string
          end_date?: string
          id?: string
          is_active?: boolean
          name?: string
          start_date?: string
          term_type?: string
        }
        Relationships: []
      }
      active_days: {
        Row: {
          day_of_week: number
          id: string
          is_active: boolean
          sort_order: number
        }
        Insert: {
          day_of_week: number
          id?: string
          is_active?: boolean
          sort_order?: number
        }
        Update: {
          day_of_week?: number
          id?: string
          is_active?: boolean
          sort_order?: number
        }
        Relationships: []
      }
      alerts: {
        Row: {
          created_at: string
          id: string
          message: string
          read_status: boolean
          role_target: Database["public"]["Enums"]["app_role"] | null
          title: string
          type: Database["public"]["Enums"]["alert_type"]
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read_status?: boolean
          role_target?: Database["public"]["Enums"]["app_role"] | null
          title: string
          type: Database["public"]["Enums"]["alert_type"]
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read_status?: boolean
          role_target?: Database["public"]["Enums"]["app_role"] | null
          title?: string
          type?: Database["public"]["Enums"]["alert_type"]
          user_id?: string | null
        }
        Relationships: []
      }
      attendance_records: {
        Row: {
          attendance_source: string
          attendance_status: Database["public"]["Enums"]["attendance_status"]
          duplicate_blocked: boolean
          id: string
          notes: string | null
          scanned_at: string
          session_id: string
          student_id: string
        }
        Insert: {
          attendance_source?: string
          attendance_status?: Database["public"]["Enums"]["attendance_status"]
          duplicate_blocked?: boolean
          id?: string
          notes?: string | null
          scanned_at?: string
          session_id: string
          student_id: string
        }
        Update: {
          attendance_source?: string
          attendance_status?: Database["public"]["Enums"]["attendance_status"]
          duplicate_blocked?: boolean
          id?: string
          notes?: string | null
          scanned_at?: string
          session_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "lecture_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      classrooms: {
        Row: {
          allowed_radius_meters: number
          building: string
          capacity: number
          id: string
          latitude: number
          longitude: number
          name: string
        }
        Insert: {
          allowed_radius_meters?: number
          building: string
          capacity?: number
          id?: string
          latitude?: number
          longitude?: number
          name: string
        }
        Update: {
          allowed_radius_meters?: number
          building?: string
          capacity?: number
          id?: string
          latitude?: number
          longitude?: number
          name?: string
        }
        Relationships: []
      }
      courses: {
        Row: {
          code: string
          created_at: string
          department: string | null
          description: string | null
          id: string
          instructor_id: string | null
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          department?: string | null
          description?: string | null
          id?: string
          instructor_id?: string | null
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          department?: string | null
          description?: string | null
          id?: string
          instructor_id?: string | null
          name?: string
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          course_id: string
          enrolled_at: string
          id: string
          student_id: string
          term_id: string | null
        }
        Insert: {
          course_id: string
          enrolled_at?: string
          id?: string
          student_id: string
          term_id?: string | null
        }
        Update: {
          course_id?: string
          enrolled_at?: string
          id?: string
          student_id?: string
          term_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "academic_terms"
            referencedColumns: ["id"]
          },
        ]
      }
      headcount_verifications: {
        Row: {
          created_at: string
          detected_count: number
          expected_count: number
          id: string
          mismatch_flag: boolean
          reviewed_by_instructor: boolean
          session_id: string
        }
        Insert: {
          created_at?: string
          detected_count?: number
          expected_count?: number
          id?: string
          mismatch_flag?: boolean
          reviewed_by_instructor?: boolean
          session_id: string
        }
        Update: {
          created_at?: string
          detected_count?: number
          expected_count?: number
          id?: string
          mismatch_flag?: boolean
          reviewed_by_instructor?: boolean
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "headcount_verifications_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "lecture_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      lecture_sessions: {
        Row: {
          classroom_id: string
          course_id: string
          end_time: string
          id: string
          instructor_id: string
          qr_expires_at: string | null
          qr_token: string
          schedule_id: string | null
          session_date: string
          start_time: string
          status: Database["public"]["Enums"]["session_status"]
          term_id: string | null
        }
        Insert: {
          classroom_id: string
          course_id: string
          end_time: string
          id?: string
          instructor_id: string
          qr_expires_at?: string | null
          qr_token?: string
          schedule_id?: string | null
          session_date: string
          start_time: string
          status?: Database["public"]["Enums"]["session_status"]
          term_id?: string | null
        }
        Update: {
          classroom_id?: string
          course_id?: string
          end_time?: string
          id?: string
          instructor_id?: string
          qr_expires_at?: string | null
          qr_token?: string
          schedule_id?: string | null
          session_date?: string
          start_time?: string
          status?: Database["public"]["Enums"]["session_status"]
          term_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lecture_sessions_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lecture_sessions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lecture_sessions_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lecture_sessions_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "academic_terms"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          department: string | null
          email: string
          full_name: string
          id: string
          instructor_code: string | null
          phone: string | null
          status: string
          student_code: string | null
        }
        Insert: {
          created_at?: string
          department?: string | null
          email: string
          full_name: string
          id: string
          instructor_code?: string | null
          phone?: string | null
          status?: string
          student_code?: string | null
        }
        Update: {
          created_at?: string
          department?: string | null
          email?: string
          full_name?: string
          id?: string
          instructor_code?: string | null
          phone?: string | null
          status?: string
          student_code?: string | null
        }
        Relationships: []
      }
      schedules: {
        Row: {
          classroom_id: string
          course_id: string
          day_of_week: number
          end_time: string
          id: string
          start_time: string
          term_id: string | null
        }
        Insert: {
          classroom_id: string
          course_id: string
          day_of_week: number
          end_time: string
          id?: string
          start_time: string
          term_id?: string | null
        }
        Update: {
          classroom_id?: string
          course_id?: string
          day_of_week?: number
          end_time?: string
          id?: string
          start_time?: string
          term_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedules_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "academic_terms"
            referencedColumns: ["id"]
          },
        ]
      }
      time_slots: {
        Row: {
          created_at: string
          end_time: string
          id: string
          label: string
          sort_order: number
          start_time: string
        }
        Insert: {
          created_at?: string
          end_time: string
          id?: string
          label: string
          sort_order?: number
          start_time: string
        }
        Update: {
          created_at?: string
          end_time?: string
          id?: string
          label?: string
          sort_order?: number
          start_time?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      alert_type: "mismatch" | "absence_warning" | "suspicious" | "system"
      app_role: "admin" | "instructor" | "student"
      attendance_status: "present" | "absent" | "late" | "rejected"
      session_status: "scheduled" | "active" | "closed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      alert_type: ["mismatch", "absence_warning", "suspicious", "system"],
      app_role: ["admin", "instructor", "student"],
      attendance_status: ["present", "absent", "late", "rejected"],
      session_status: ["scheduled", "active", "closed"],
    },
  },
} as const
