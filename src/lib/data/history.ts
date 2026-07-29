"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { useDemoStore } from "@/lib/demo/store";
import { createClient } from "@/utils/supabase/client";
import { DEMO_MESSAGES } from "@/lib/demo/seed-data";
import type { ChatMessage, Conversation } from "@/types";

/**
 * Data Access Layer for History (Conversations, Messages).
 * Supports Supabase as primary, demo store as fallback.
 */
export function useHistoryDAL() {
  const { user } = useAuth();
  const demoStore = useDemoStore();
  const supabase = useMemo(() => createClient(), []);

  const [dbMessages, setDbMessages] = useState<ChatMessage[]>([]);
  const [dbConversation, setDbConversation] = useState<Conversation | null>(null);

  // For Phase 7, we proxy the demo store if not logged in, or wire to Supabase.
  const messages = useMemo(() => {
    if (!user) return demoStore.state.messages;
    if (dbMessages.length === 0 || dbMessages[0].id !== "msg-welcome") {
      return [DEMO_MESSAGES[0], ...dbMessages];
    }
    return dbMessages;
  }, [user, dbMessages, demoStore.state.messages]);

  const conversation = user ? dbConversation : demoStore.state.conversation;

  useEffect(() => {
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDbMessages([]);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDbConversation(null);
      return;
    }

    let isMounted = true;

    const fetchHistory = async () => {
      try {
        // Fetch the user's default conversation
        const { data: convData, error: convError } = await supabase
          .from("conversations")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (convError && convError.code !== "PGRST116") {
          console.error("Error fetching conversation", convError);
        }

        if (convData && isMounted) {
          setDbConversation({
            id: convData.id,
            userId: convData.user_id,
            title: convData.title,
            createdAt: convData.created_at,
            updatedAt: convData.updated_at,
          });

          // Fetch messages for this conversation
          const { data: msgData, error: msgError } = await supabase
            .from("messages")
            .select("*")
            .eq("conversation_id", convData.id)
            .order("created_at", { ascending: true });

          if (msgError) {
            console.error("Error fetching messages", msgError);
          } else if (msgData && isMounted) {
            setDbMessages(
              msgData.map((row) => ({
                id: row.id,
                conversationId: row.conversation_id,
                role: row.role as ChatMessage["role"],
                content: row.content,
                attachments: row.attachments || [],
                card: row.card || undefined,
                createdAt: row.created_at,
                // Supabase doesn't store 'status'
                status: "sent",
              }))
            );
          }
        } else if (!convData && isMounted) {
          // If no conversation exists, that's fine. It'll be created on first message.
          setDbConversation(null);
          setDbMessages([]);
        }
      } catch (err) {
        console.error("History fetch error:", err);
      }
    };

    fetchHistory();

    return () => {
      isMounted = false;
    };
  }, [user, supabase]);

  const addMessage = useCallback(
    async (message: ChatMessage) => {
      if (user) {
        // Optimistic UI update
        setDbMessages((prev) => [...prev, message]);

        try {
          let validConversationId = message.conversationId;

          if (!validConversationId || validConversationId === "default") {
            const { data: newConv, error: convError } = await supabase
              .from("conversations")
              .insert({ user_id: user.id })
              .select()
              .single();

            if (convError) throw convError;

            validConversationId = newConv.id;
            
            setDbConversation({
              id: newConv.id,
              userId: newConv.user_id,
              title: newConv.title,
              createdAt: newConv.created_at,
              updatedAt: newConv.updated_at,
            });
          }

          const { error } = await supabase.from("messages").insert({
            id: message.id,
            conversation_id: validConversationId,
            user_id: user.id,
            role: message.role,
            content: message.content,
            attachments: message.attachments || [],
            card: message.card || null,
            created_at: message.createdAt,
          });
          if (error) throw error;
        } catch (err) {
          console.error("Failed to insert message:", err);
          // Revert optimistic update on failure
          setDbMessages((prev) => prev.filter((m) => m.id !== message.id));
        }
      } else {
        demoStore.addMessage(message);
      }
    },
    [user, demoStore, supabase]
  );

  const updateMessage = useCallback(
    async (id: string, patch: Partial<ChatMessage>) => {
      if (user) {
        // Optimistic UI update
        setDbMessages((prev) =>
          prev.map((m) => (m.id === id ? { ...m, ...patch } : m))
        );

        // Snake case mapping for patch (status isn't persisted)
        const payload: Record<string, unknown> = {};
        if (patch.content !== undefined) payload.content = patch.content;
        if (patch.attachments !== undefined) payload.attachments = patch.attachments;
        if (patch.card !== undefined) payload.card = patch.card;

        // If there's nothing to persist (e.g. only status changed to "sent"), we can skip DB call
        if (Object.keys(payload).length > 0) {
          try {
            const { error } = await supabase
              .from("messages")
              .update(payload)
              .eq("id", id)
              .eq("user_id", user.id);

            if (error) throw error;
          } catch (err) {
            console.error("Failed to update message:", err);
            // Revert logic could be complex here; generally optimistic UI assumes success
          }
        }
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
