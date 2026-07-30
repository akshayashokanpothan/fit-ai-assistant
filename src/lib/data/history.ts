"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { useDemoStore } from "@/lib/demo/store";
import { createClient } from "@/utils/supabase/client";
import { DEMO_MESSAGES } from "@/lib/demo/seed-data";
import type { ChatMessage, Conversation } from "@/types";

import { isToday, parseISO } from "date-fns";

export interface ConversationHistoryItem extends Conversation {
  messageCount: number;
}

let globalDbMessages: ChatMessage[] | null = null;
let globalDbConversation: Conversation | null = null;
let globalDbConversations: ConversationHistoryItem[] | null = null;
let globalFetchedUserId: string | null = null;
let globalHasFetchedInitial = false;

export function clearHistoryCache() {
  globalDbMessages = null;
  globalDbConversation = null;
  globalDbConversations = null;
  globalFetchedUserId = null;
  globalHasFetchedInitial = false;
}

/**
 * Data Access Layer for History (Conversations, Messages).
 * Supports Supabase as primary, demo store as fallback.
 */
export function useHistoryDAL() {
  const { user } = useAuth();
  const demoStore = useDemoStore();
  const supabase = useMemo(() => createClient(), []);

  const [dbMessages, setDbMessages] = useState<ChatMessage[]>(() => {
    if (user && user.id === globalFetchedUserId && globalDbMessages) return globalDbMessages;
    return [];
  });
  const [dbConversation, setDbConversation] = useState<Conversation | null>(() => {
    if (user && user.id === globalFetchedUserId && globalDbConversation !== undefined) return globalDbConversation;
    return null;
  });
  const [dbConversations, setDbConversations] = useState<ConversationHistoryItem[]>(() => {
    if (user && user.id === globalFetchedUserId && globalDbConversations) return globalDbConversations;
    return [];
  });

  // True only while the initial Supabase history fetch is in-flight for an
  // authenticated user. Starts false for unauthenticated/demo paths.
  const [historyLoading, setHistoryLoading] = useState(() => {
    if (user && user.id === globalFetchedUserId && globalHasFetchedInitial) return false;
    return !!user;
  });

  const idMapRef = useRef<Record<string, string>>({});
  const pendingConvRef = useRef<Promise<string> | null>(null);
  const pendingMsgRef = useRef<Record<string, Promise<string> | undefined>>({});

  // For Phase 7, we proxy the demo store if not logged in, or wire to Supabase.
  const messages = useMemo(() => {
    if (!user) return demoStore.state.messages;
    // Ensure exactly one welcome message is at the top of the chat timeline
    // as an in-memory fallback, without persisting it to Supabase.
    const filteredDb = dbMessages.filter((m) => m.id !== "msg-welcome");
    return [DEMO_MESSAGES[0], ...filteredDb];
  }, [user, dbMessages, demoStore.state.messages]);

  const conversation = user ? dbConversation : demoStore.state.conversation;

  // Sync state to cache
  useEffect(() => {
    if (user && user.id === globalFetchedUserId) {
      globalDbMessages = dbMessages;
      globalDbConversation = dbConversation;
      globalDbConversations = dbConversations;
    }
  }, [user, dbMessages, dbConversation, dbConversations]);

  useEffect(() => {
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDbMessages([]);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDbConversation(null);
      setHistoryLoading(false);
      clearHistoryCache();
      return;
    }

    if (user.id === globalFetchedUserId && globalHasFetchedInitial) {
      // Cache hit, skip refetch
      return;
    }

    setHistoryLoading(true);

    let isMounted = true;

    const fetchHistory = async () => {
      try {
        globalFetchedUserId = user.id;

        // Fetch all user's conversations
        const { data: convData, error: convError } = await supabase
          .from("conversations")
          .select("*, messages(count)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (convError) {
          console.error("Error fetching conversations", convError);
        }

        if (convData && isMounted) {
          const formattedConvs: ConversationHistoryItem[] = convData.map(c => ({
            id: c.id,
            userId: c.user_id,
            title: c.title,
            createdAt: c.created_at,
            updatedAt: c.updated_at,
            messageCount: c.messages?.[0]?.count || 0
          }));
          
          setDbConversations(formattedConvs);

          // Find the active conversation to load.
          // By default, we load the most recent conversation ONLY IF it was created today.
          // If the most recent was created yesterday or earlier, we leave dbConversation null
          // so that the next message creates a new one. (One conversation per day rule).
          // Exception: If the most recent conversation has 0 messages, we can reuse it even if it's old (though rare).
          const mostRecent = formattedConvs[0];
          
          let activeConv = null;
          if (mostRecent) {
             const createdDate = parseISO(mostRecent.createdAt);
             if (isToday(createdDate) || mostRecent.messageCount === 0) {
               activeConv = mostRecent;
             }
          }

          if (activeConv) {
            setDbConversation(activeConv);

            // Fetch messages for this active conversation
            const { data: msgData, error: msgError } = await supabase
              .from("messages")
              .select("*")
              .eq("conversation_id", activeConv.id)
              .order("created_at", { ascending: true });

            if (msgError) {
              console.error("Error fetching messages", msgError);
            } else if (msgData) {
              setDbMessages(
                msgData.map((row) => ({
                  id: row.id,
                  conversationId: row.conversation_id,
                  role: row.role as ChatMessage["role"],
                  content: row.content,
                  attachments: row.attachments || [],
                  card: row.card || undefined,
                  createdAt: row.created_at,
                  status: "sent",
                }))
              );
            }
          } else {
            // New day state (or first time user)
            setDbConversation(null);
            setDbMessages([]);
          }
          globalHasFetchedInitial = true;
        } else if (!convData && isMounted) {
          setDbConversations([]);
          setDbConversation(null);
          setDbMessages([]);
          globalHasFetchedInitial = true;
        }
      } catch (err) {
        console.error("History fetch error:", err);
      } finally {
        if (isMounted) setHistoryLoading(false);
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
          const insertTask = async () => {
            let validConversationId = message.conversationId;

            if (!validConversationId || validConversationId === "default") {
              if (dbConversation?.id && dbConversation.id !== "default") {
                validConversationId = dbConversation.id;
              } else if (pendingConvRef.current) {
                validConversationId = await pendingConvRef.current;
              } else {
                pendingConvRef.current = (async () => {
                  const { data: newConv, error: convError } = await supabase
                    .from("conversations")
                    .insert({ user_id: user.id })
                    .select()
                    .single();

                  if (convError) throw convError;

                  setDbConversation({
                    id: newConv.id,
                    userId: newConv.user_id,
                    title: newConv.title,
                    createdAt: newConv.created_at,
                    updatedAt: newConv.updated_at,
                  });
                  return newConv.id;
                })();
                validConversationId = await pendingConvRef.current;
              }
            }

            const { data: insertedMsg, error } = await supabase.from("messages").insert({
              // id: message.id, // Omitted so Supabase generates a UUID
              conversation_id: validConversationId,
              user_id: user.id,
              role: message.role,
              content: message.content,
              attachments: message.attachments || [],
              card: message.card || null,
              created_at: message.createdAt,
            }).select().single();

            if (error) throw error;
            return insertedMsg.id;
          };

          const p = insertTask();
          pendingMsgRef.current[message.id] = p;
          const realId = await p;
          idMapRef.current[message.id] = realId;
        } catch (err) {
          console.error("Failed to insert message:", err);
          // Revert optimistic update on failure
          setDbMessages((prev) => prev.filter((m) => m.id !== message.id));
        }
      } else {
        demoStore.addMessage(message);
      }
    },
    [user, dbConversation, demoStore, supabase]
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
            let realId = idMapRef.current[id];
            if (!realId && pendingMsgRef.current[id]) {
              realId = await pendingMsgRef.current[id];
            }
            realId = realId || id;

            const { error } = await supabase
              .from("messages")
              .update(payload)
              .eq("id", realId)
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

  const loadConversation = useCallback(async (id: string) => {
    if (!user) return; // Not supported in demo mode
    const conv = dbConversations.find(c => c.id === id);
    if (!conv) return;
    
    setHistoryLoading(true);
    setDbConversation(conv);
    
    try {
      const { data: msgData, error: msgError } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conv.id)
        .order("created_at", { ascending: true });

      if (msgError) throw msgError;

      if (msgData) {
        setDbMessages(
          msgData.map((row) => ({
            id: row.id,
            conversationId: row.conversation_id,
            role: row.role as ChatMessage["role"],
            content: row.content,
            attachments: row.attachments || [],
            card: row.card || undefined,
            createdAt: row.created_at,
            status: "sent",
          }))
        );
      }
    } catch (err) {
      console.error("Failed to load conversation messages", err);
    } finally {
      setHistoryLoading(false);
    }
  }, [user, dbConversations, supabase]);

  const startNewConversation = useCallback(() => {
    if (!user) {
      // Demo mode doesn't support multiple conversations, but we can clear messages
      demoStore.resetDemo(); // Optionally clear demo state entirely, or just ignore.
      return;
    }
    // Set active conversation to null, which drops the current chat. 
    // New conversation will be created on first message insert.
    setDbConversation(null);
    setDbMessages([]);
  }, [user, demoStore]);

  return {
    messages,
    conversation,
    conversations: user ? dbConversations : [{ ...demoStore.state.conversation, messageCount: demoStore.state.messages.length }],
    addMessage,
    updateMessage,
    historyLoading,
    loadConversation,
    startNewConversation
  };
}
