import { supabase } from "./client";

export interface ContentItemRow {
  id: string;
  title: string;
  type: string | null;
  status: string | null;
  scheduled_date: string | null;
  content: string | null;
  author: string | null;
  platform: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface ContentItemInsert {
  id?: string;
  title: string;
  type?: string | null;
  status?: string | null;
  scheduled_date?: string | null;
  content?: string | null;
  author?: string | null;
  platform?: string | null;
  tags?: string[] | null;
}

export interface ContentItemUpdate {
  title?: string;
  type?: string | null;
  status?: string | null;
  scheduled_date?: string | null;
  content?: string | null;
  author?: string | null;
  platform?: string | null;
  tags?: string[] | null;
}

export async function listContentItems(): Promise<ContentItemRow[]> {
  const { data, error } = await supabase
    .from("content_items")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createContentItem(item: ContentItemInsert): Promise<ContentItemRow> {
  const { data, error } = await supabase
    .from("content_items")
    .insert(item)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateContentItem(id: string, item: ContentItemUpdate): Promise<ContentItemRow> {
  const { data, error } = await supabase
    .from("content_items")
    .update(item)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteContentItem(id: string): Promise<void> {
  const { error } = await supabase.from("content_items").delete().eq("id", id);
  if (error) throw error;
}
