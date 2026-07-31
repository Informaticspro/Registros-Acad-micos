export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type BaseDatos = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          role: 'propietario' | 'admin' | 'organizador' | 'scanner' | 'soporte';
          organization_id: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          email: string;
          role?: 'propietario' | 'admin' | 'organizador' | 'scanner' | 'soporte';
          organization_id?: string | null;
        };
        Update: {
          full_name?: string;
          email?: string;
          role?: 'propietario' | 'admin' | 'organizador' | 'scanner' | 'soporte';
          organization_id?: string | null;
        };
        Relationships: [];
      };
      events: {
        Row: {
          id: string;
          title: string;
          event_type: string;
          description: string;
          location: string;
          starts_at: string | null;
          ends_at: string | null;
          capacity: number;
          status: string;
          organizer_id: string;
          created_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      participants: {
        Row: {
          id: string;
          first_name: string;
          last_name: string;
          email: string;
          document_id: string;
          institution: string;
          phone: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      registrations: {
        Row: {
          id: string;
          event_id: string;
          participant_id: string;
          qr_token: string;
          certificate_code: string;
          checked_in_at: string | null;
          created_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      attendance_records: {
        Row: {
          id: string;
          event_id: string;
          registration_id: string;
          scanned_by: string;
          status: string;
          checked_in_at: string;
          device_meta: Json;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      attendance_daily_logs: {
        Row: {
          id: string;
          event_id: string;
          registration_id: string;
          scanned_by: string | null;
          checked_in_at: string;
          attendance_period: 'matutina' | 'vespertina';
          created_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      laboratory_technical_sheets: {
        Row: {
          id: string;
          organization_id: string;
          sheet_date: string;
          pc: string;
          ip_address: string;
          location: string;
          responsible: string;
          assigned_user: string;
          access_reference: string;
          applications: Json;
          technical_specs: Json;
          inventory: Json;
          actions: Json;
          general_notes: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      laboratory_equipment: {
        Row: {
          id: string;
          organization_id: string;
          code: string;
          name: string;
          category: string;
          brand_model: string;
          serial_number: string;
          location: string;
          status: string;
          notes: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      laboratory_sections: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          description: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      laboratory_catalogs: {
        Row: {
          id: string;
          organization_id: string;
          catalog_type: 'categoria_equipo' | 'estado_equipo';
          name: string;
          description: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      laboratory_logs: {
        Row: {
          id: string;
          organization_id: string;
          work_date: string;
          work_type: string;
          title: string;
          description: string;
          responsible: string;
          priority: string;
          status: string;
          entry_type: string;
          equipment_id: string | null;
          source_equipment: string;
          target_equipment: string;
          location: string;
          evidence_title: string;
          evidence_url: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      laboratory_loans: {
        Row: {
          id: string;
          organization_id: string;
          equipment: string;
          delivered_to: string;
          beneficiary_type: string;
          document_id: string;
          delivered_by: string;
          loaned_at: string;
          returned_at: string | null;
          status: string;
          notes: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      public_event_check_in: {
        Args: {
          p_event_id: string;
          p_first_name: string;
          p_last_name: string;
          p_document_id: string;
          p_email: string;
          p_metadata: Json;
        };
        Returns: {
          result_participant_id: string;
          result_registration_id: string;
          result_attendance_id: string;
          result_certificate_code: string;
          result_qr_token: string;
          result_already_checked_in: boolean;
        }[];
      };
      record_daily_attendance: {
        Args: {
          p_event_id: string;
          p_lookup: string;
          p_attendance_period: 'matutina' | 'vespertina';
        };
        Returns: {
          result_participant_name: string;
          result_document_id: string;
          result_certificate_code: string;
          result_checked_in_at: string;
          result_attendance_period: 'matutina' | 'vespertina';
          result_already_logged_today: boolean;
        }[];
      };
      lookup_participant_registration: {
        Args: {
          p_event_id: string;
          p_document_id: string;
        };
        Returns: {
          result_first_name: string;
          result_last_name: string;
          result_document_id: string;
          result_email: string;
          result_qr_token: string;
          result_certificate_code: string;
        }[];
      };
      admin_assign_staff_profile: {
        Args: {
          p_user_id: string;
          p_full_name: string;
          p_email: string;
          p_role: 'propietario' | 'admin' | 'organizador' | 'scanner' | 'soporte';
        };
        Returns: undefined;
      };
      admin_disable_staff_profile: {
        Args: {
          p_user_id: string;
        };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

