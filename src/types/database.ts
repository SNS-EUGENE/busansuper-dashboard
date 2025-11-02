export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      products: {
        Row: {
          id: string;
          product_code: string;
          barcode: string | null;
          name: string;
          price: number;
          category_id: string | null;
          item_id: string | null;
          vendor_id: string | null;
          initial_stock: number;
          current_stock: number;
          low_stock_threshold: number;
          tour_guide: boolean;
          sponsor: boolean;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          product_code: string;
          barcode?: string | null;
          name: string;
          price: number;
          category_id?: string | null;
          item_id?: string | null;
          vendor_id?: string | null;
          initial_stock?: number;
          current_stock?: number;
          low_stock_threshold?: number;
          tour_guide?: boolean;
          sponsor?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          product_code?: string;
          barcode?: string | null;
          name?: string;
          price?: number;
          category_id?: string | null;
          item_id?: string | null;
          vendor_id?: string | null;
          initial_stock?: number;
          current_stock?: number;
          low_stock_threshold?: number;
          tour_guide?: boolean;
          sponsor?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
      };
      vendors: {
        Row: {
          id: string;
          company: string;
          short_name: string | null;
          representative: string | null;
          contact: string | null;
          email: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company: string;
          short_name?: string | null;
          representative?: string | null;
          contact?: string | null;
          email?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company?: string;
          short_name?: string | null;
          representative?: string | null;
          contact?: string | null;
          email?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      categories: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
        };
      };
      items: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
        };
      };
      sales_transactions: {
        Row: {
          id: string;
          transaction_date: string;
          product_id: string | null;
          product_code: string | null;
          barcode: string | null;
          product_name: string | null;
          quantity: number;
          type: string;
          total_amount: number | null;
          receipt_number: string | null;
          matched: boolean;
          upload_batch_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          transaction_date: string;
          product_id?: string | null;
          product_code?: string | null;
          barcode?: string | null;
          product_name?: string | null;
          quantity: number;
          type: string;
          total_amount?: number | null;
          receipt_number?: string | null;
          matched?: boolean;
          upload_batch_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          transaction_date?: string;
          product_id?: string | null;
          product_code?: string | null;
          barcode?: string | null;
          product_name?: string | null;
          quantity?: number;
          type?: string;
          total_amount?: number | null;
          receipt_number?: string | null;
          matched?: boolean;
          upload_batch_id?: string | null;
          created_at?: string;
        };
      };
      upload_history: {
        Row: {
          id: string;
          filename: string;
          upload_date: string;
          file_type: string | null;
          sales_count: number;
          return_count: number;
          matched_count: number;
          unmatched_count: number;
          status: string;
          user_id: string | null;
          error_message: string | null;
          inventory_snapshot: Json | null;
          processed_items: Json | null;
        };
        Insert: {
          id?: string;
          filename: string;
          upload_date?: string;
          file_type?: string | null;
          sales_count?: number;
          return_count?: number;
          matched_count?: number;
          unmatched_count?: number;
          status?: string;
          user_id?: string | null;
          error_message?: string | null;
          inventory_snapshot?: Json | null;
          processed_items?: Json | null;
        };
        Update: {
          id?: string;
          filename?: string;
          upload_date?: string;
          file_type?: string | null;
          sales_count?: number;
          return_count?: number;
          matched_count?: number;
          unmatched_count?: number;
          status?: string;
          user_id?: string | null;
          error_message?: string | null;
          inventory_snapshot?: Json | null;
          processed_items?: Json | null;
        };
      };
    };
  };
}
