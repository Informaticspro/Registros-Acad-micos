export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          role: 'admin' | 'organizador' | 'scanner';
          organization_id: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          email: string;
          role?: 'admin' | 'organizador' | 'scanner';
          organization_id?: string | null;
        };
        Update: {
          full_name?: string;
          email?: string;
          role?: 'admin' | 'organizador' | 'scanner';
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
          starts_at: string;
          ends_at: string;
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
        };
        Returns: {
          participant_id: string;
          registration_id: string;
          attendance_id: string;
          certificate_code: string;
          already_checked_in: boolean;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
