"use client";

import { useCallback, useMemo } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { useDemoStore } from "@/lib/demo/store";
import { createClient } from "@/utils/supabase/client";
import type { ChatMessage } from "@/types";

/**
 * Data Access Layer for History (Conversations, Messages, Activities).
 * Supports Supabase as primary, demo store as fallback.
 */
export function useHistoryDAL() {
  const { user } = useAuth();
  const demoStore = useDemoStore();
  const supabase = useMemo(() => createClient(), []);

  // For Phase 7, we proxy the demo store if not logged in, or wire to Supabase.
  const messages = user ? [] : demoStore.state.messages; // TODO: implement Supabase messages query
  const conversation = user ? null : demoStore.state.conversation; 
  
  const addMessage = useCallback(
    async (message: ChatMessage) => {
      if (user) {
        const { error } = await supabase.from("messages").insert({
          id: message.id,
          conversation_id: message.conversationId,
          user_id: user.id,
          role: message.role,
          content: message.content,
          attachments: message.attachments || [],
          card: message.card || null,
          created_at: message.createdAt,
        });
        if (error) throw error;
      } else {
        demoStore.addMessage(message);
      }
    },
    [user, demoStore, supabase]
  );

  const updateMessage = useCallback(
    async (id: string, patch: Partial<ChatMessage>) => {
      if (user) {
        // Snake case mapping for patch (e.g. status isn't currently tracked in db schema? 
        // actually status isn't in db schema, it's transient. Attachments and card are.)
        const payload: Record<string, unknown> = {};
        if (patch.content !== undefined) payload.content = patch.content;
        if (patch.attachments !== undefined) payload.attachments = patch.attachments;
        if (patch.card !== undefined) payload.card = patch.card;

        const { error } = await supabase
          .from("messages")
          .update(payload)
          .eq("id", id)
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        demoStore.updateMessage(id, patch);
      }
    },
    [user, demoStore, supabase]
  );

  return {
    messages,
    conversation,
    addMessage,
    updateMessage,
  };
}
