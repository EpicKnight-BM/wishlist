// Database types generated from schema
export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type GroupRole = "admin" | "member";

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string;
          profile_image: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name: string;
          profile_image?: string | null;
        };
        Update: {
          name?: string;
          profile_image?: string | null;
          updated_at?: string;
        };
      };
      groups: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          created_by: string;
          invite_code: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          name: string;
          description?: string | null;
          created_by: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          updated_at?: string;
        };
      };
      group_members: {
        Row: {
          id: string;
          user_id: string;
          group_id: string;
          role: GroupRole;
          joined_at: string;
        };
        Insert: {
          user_id: string;
          group_id: string;
          role?: GroupRole;
        };
        Update: {
          role?: GroupRole;
        };
      };
      wishlists: {
        Row: {
          id: string;
          user_id: string;
          group_id: string;
          title: string;
          description: string | null;
          occasion_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          group_id: string;
          title: string;
          description?: string | null;
          occasion_date?: string | null;
        };
        Update: {
          title?: string;
          description?: string | null;
          occasion_date?: string | null;
          updated_at?: string;
        };
      };
      items: {
        Row: {
          id: string;
          wishlist_id: string;
          added_by_user_id: string;
          is_secret_gift: boolean;
          name: string;
          description: string | null;
          price: number | null;
          url: string | null;
          image_url: string | null;
          get_by_date: string | null;
          get_by_label: string | null;
          quantity: number;
          category: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          wishlist_id: string;
          added_by_user_id: string;
          is_secret_gift?: boolean;
          name: string;
          description?: string | null;
          price?: number | null;
          url?: string | null;
          image_url?: string | null;
          get_by_date?: string | null;
          get_by_label?: string | null;
          quantity?: number;
          category?: string | null;
        };
        Update: {
          name?: string;
          description?: string | null;
          price?: number | null;
          url?: string | null;
          image_url?: string | null;
          get_by_date?: string | null;
          get_by_label?: string | null;
          quantity?: number;
          category?: string | null;
          updated_at?: string;
        };
      };
      claims: {
        Row: {
          id: string;
          item_id: string;
          claimed_by_user_id: string;
          quantity_claimed: number;
          notes: string | null;
          is_purchased: boolean;
          claimed_at: string;
          updated_at: string;
        };
        Insert: {
          item_id: string;
          claimed_by_user_id: string;
          quantity_claimed?: number;
          notes?: string | null;
          is_purchased?: boolean;
        };
        Update: {
          quantity_claimed?: number;
          notes?: string | null;
          is_purchased?: boolean;
          updated_at?: string;
        };
      };
    };
    Functions: {
      is_group_member: { Args: { p_group_id: string }; Returns: boolean };
      item_has_claims: { Args: { p_item_id: string }; Returns: boolean };
    };
  };
}

// Convenience shorthand types
export type User = Database["public"]["Tables"]["users"]["Row"];
export type Group = Database["public"]["Tables"]["groups"]["Row"];
export type GroupMember = Database["public"]["Tables"]["group_members"]["Row"];
export type Wishlist = Database["public"]["Tables"]["wishlists"]["Row"];
export type Item = Database["public"]["Tables"]["items"]["Row"];
export type Claim = Database["public"]["Tables"]["claims"]["Row"];

// Enriched types used in the UI
export type GroupWithMembers = Group & {
  group_members: (GroupMember & { users: User })[];
};

export type WishlistWithOwner = Wishlist & { users: User };

export type ItemWithClaims = Item & {
  claims: (Claim & { users: User })[];
  total_claimed: number;
};

export type ClaimWithUser = Claim & { users: User };
