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
        Relationships: [];
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
        Relationships: [
          {
            foreignKeyName: "groups_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
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
        Relationships: [
          {
            foreignKeyName: "group_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "group_members_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          }
        ];
      };
      wishlists: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          occasion_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
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
        Relationships: [
          {
            foreignKeyName: "wishlists_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      wishlist_groups: {
        Row: {
          id: string;
          wishlist_id: string;
          group_id: string;
          added_by: string;
          added_at: string;
        };
        Insert: {
          wishlist_id: string;
          group_id: string;
          added_by: string;
        };
        Update: {
          added_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wishlist_groups_wishlist_id_fkey";
            columns: ["wishlist_id"];
            isOneToOne: false;
            referencedRelation: "wishlists";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wishlist_groups_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wishlist_groups_added_by_fkey";
            columns: ["added_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      items: {
        Row: {
          id: string;
          wishlist_id: string | null;
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
          wishlist_id?: string | null;
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
          wishlist_id?: string | null;
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
        Relationships: [
          {
            foreignKeyName: "items_wishlist_id_fkey";
            columns: ["wishlist_id"];
            isOneToOne: false;
            referencedRelation: "wishlists";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "items_added_by_user_id_fkey";
            columns: ["added_by_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
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
        Relationships: [
          {
            foreignKeyName: "claims_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "claims_claimed_by_user_id_fkey";
            columns: ["claimed_by_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Record<string, never>;
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
export type WishlistGroup = Database["public"]["Tables"]["wishlist_groups"]["Row"];
export type Item = Database["public"]["Tables"]["items"]["Row"];
export type Claim = Database["public"]["Tables"]["claims"]["Row"];

// Enriched types used in the UI
export type GroupWithMembers = Group & {
  group_members: (GroupMember & { users: User })[];
};

export type WishlistWithOwner = Wishlist & { users: User };

export type WishlistWithGroups = Wishlist & {
  wishlist_groups: (WishlistGroup & { groups: Group })[];
};

export type WishlistWithOwnerAndGroups = WishlistWithGroups & {
  users: User;
};

export type ItemWithClaims = Item & {
  claims: (Claim & { users: User })[];
  total_claimed: number;
};

export type ClaimWithUser = Claim & { users: User };
