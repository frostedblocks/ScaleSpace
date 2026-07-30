import HashMap "mo:base/HashMap";
import Principal "mo:base/Principal";
import Time "mo:base/Time";
import Nat "mo:base/Nat";
import Int "mo:base/Int";
import Text "mo:base/Text";
import Array "mo:base/Array";
import Buffer "mo:base/Buffer";
import Iter "mo:base/Iter";

/**
 * ScaleSpace Messaging Canister
 * ---------------------------
 * Separate from the main social canister to isolate cycle costs.
 *
 * Cost controls:
 * - Max 100 messages stored per conversation (oldest dropped)
 * - Max 50 messages per user per day
 * - Messages older than 90 days can be pruned
 * - No media stored here (send image URLs only if needed)
 * - Only participants can read a conversation
 */
actor Messaging {

  // ==================== TYPES ====================

  type Message = {
    id : Nat;
    conversationId : Nat;
    from : Principal;
    content : Text;
    timestamp : Time.Time;
  };

  type Conversation = {
    id : Nat;
    participants : [Principal]; // exactly 2 for DMs
    lastMessageAt : Time.Time;
    messageCount : Nat;
  };

  // ==================== STORAGE ====================

  private stable var nextConversationId : Nat = 0;
  private stable var nextMessageId : Nat = 0;

  private var conversations = HashMap.HashMap<Nat, Conversation>(0, Nat.equal, func (n : Nat) : Nat32 { Nat32.fromNat(n) });
  private var messages = HashMap.HashMap<Nat, Message>(0, Nat.equal, func (n : Nat) : Nat32 { Nat32.fromNat(n) });

  // conversationId -> list of message ids (newest last)
  private var conversationMessages = HashMap.HashMap<Nat, [Nat]>(0, Nat.equal, func (n : Nat) : Nat32 { Nat32.fromNat(n) });

  // pair key "principalA:principalB" (sorted) -> conversationId
  private var pairIndex = HashMap.HashMap<Text, Nat>(0, Text.equal, Text.hash);

  // rate limiting: principal -> (count, lastReset)
  private var dailyCounts = HashMap.HashMap<Principal, { count : Nat; lastReset : Time.Time }>(0, Principal.equal, Principal.hash);

  // ==================== CONSTANTS ====================

  private let MAX_MESSAGES_PER_CONVERSATION : Nat = 100;  // drop oldest beyond this
  private let MAX_MESSAGES_PER_DAY : Nat = 50;             // per user
  private let MAX_CONTENT_LENGTH : Nat = 1000;
  private let MESSAGE_TTL_NANOS : Int = 90 * 24 * 60 * 60 * 1_000_000_000; // 90 days
  private let DAY_NANOS : Int = 24 * 60 * 60 * 1_000_000_000;

  // ==================== HELPERS ====================

  // Create a stable key for two principals (order-independent)
  private func pairKey(a : Principal, b : Principal) : Text {
    let sa = Principal.toText(a);
    let sb = Principal.toText(b);
    if (sa < sb) { sa # ":" # sb } else { sb # ":" # sa }
  };

  private func isParticipant(conv : Conversation, user : Principal) : Bool {
    for (p in conv.participants.vals()) {
      if (Principal.equal(p, user)) { return true };
    };
    false
  };

  private func checkAndIncrementDailyLimit(user : Principal) : Bool {
    let now = Time.now();
    switch (dailyCounts.get(user)) {
      case (?entry) {
        if (now - entry.lastReset > DAY_NANOS) {
          // reset
          dailyCounts.put(user, { count = 1; lastReset = now });
          true
        } else if (entry.count >= MAX_MESSAGES_PER_DAY) {
          false
        } else {
          dailyCounts.put(user, { count = entry.count + 1; lastReset = entry.lastReset });
          true
        }
      };
      case null {
        dailyCounts.put(user, { count = 1; lastReset = now });
        true
      };
    }
  };

  // Keep only the newest MAX_MESSAGES_PER_CONVERSATION messages
  private func trimConversation(conversationId : Nat) {
    switch (conversationMessages.get(conversationId)) {
      case (?ids) {
        if (ids.size() > MAX_MESSAGES_PER_CONVERSATION) {
          let overflow = ids.size() - MAX_MESSAGES_PER_CONVERSATION;
          // remove oldest messages from storage
          var i : Nat = 0;
          while (i < overflow) {
            messages.delete(ids[i]);
            i += 1;
          };
          // keep the newest ones
          let kept = Array.tabulate<Nat>(MAX_MESSAGES_PER_CONVERSATION, func (j) {
            ids[overflow + j]
          });
          conversationMessages.put(conversationId, kept);
        };
      };
      case null {};
    };
  };

  // ==================== PUBLIC API ====================

  /// Start or get an existing DM conversation with another user.
  /// Returns the conversation id.
  public shared(msg) func getOrCreateConversation(other : Principal) : async ?Nat {
    if (Principal.equal(msg.caller, other)) {
      return null; // can't message yourself
    };

    let key = pairKey(msg.caller, other);

    switch (pairIndex.get(key)) {
      case (?id) { ?id };
      case null {
        let id = nextConversationId;
        nextConversationId += 1;

        let conv : Conversation = {
          id = id;
          participants = [msg.caller, other];
          lastMessageAt = Time.now();
          messageCount = 0;
        };

        conversations.put(id, conv);
        pairIndex.put(key, id);
        conversationMessages.put(id, []);
        ?id
      };
    }
  };

  /// Send a message in a conversation.
  /// Returns the new message id, or null on failure (rate limit, not participant, too long).
  public shared(msg) func sendMessage(conversationId : Nat, content : Text) : async ?Nat {
    if (Text.size(content) == 0 or Text.size(content) > MAX_CONTENT_LENGTH) {
      return null;
    };

    switch (conversations.get(conversationId)) {
      case null { return null };
      case (?conv) {
        if (not isParticipant(conv, msg.caller)) {
          return null;
        };

        if (not checkAndIncrementDailyLimit(msg.caller)) {
          return null; // daily limit hit
        };

        let messageId = nextMessageId;
        nextMessageId += 1;

        let message : Message = {
          id = messageId;
          conversationId = conversationId;
          from = msg.caller;
          content = content;
          timestamp = Time.now();
        };

        messages.put(messageId, message);

        // append to conversation
        switch (conversationMessages.get(conversationId)) {
          case (?ids) {
            conversationMessages.put(conversationId, Array.append(ids, [messageId]));
          };
          case null {
            conversationMessages.put(conversationId, [messageId]);
          };
        };

        // update conversation metadata
        let updatedConv : Conversation = {
          id = conv.id;
          participants = conv.participants;
          lastMessageAt = Time.now();
          messageCount = conv.messageCount + 1;
        };
        conversations.put(conversationId, updatedConv);

        // cost control: drop oldest if over limit
        trimConversation(conversationId);

        ?messageId
      };
    }
  };

  /// Get messages in a conversation (only if you are a participant).
  /// Returns newest messages last. Limited to stored messages (max 100).
  public query(msg) func getMessages(conversationId : Nat) : async [Message] {
    switch (conversations.get(conversationId)) {
      case null { return [] };
      case (?conv) {
        if (not isParticipant(conv, msg.caller)) {
          return [];
        };

        switch (conversationMessages.get(conversationId)) {
          case (?ids) {
            let buf = Buffer.Buffer<Message>(ids.size());
            for (id in ids.vals()) {
              switch (messages.get(id)) {
                case (?m) { buf.add(m) };
                case null {};
              };
            };
            Buffer.toArray(buf)
          };
          case null { [] };
        }
      };
    }
  };

  /// List conversations the caller is part of (most recent activity first).
  public query(msg) func getMyConversations() : async [Conversation] {
    let buf = Buffer.Buffer<Conversation>(0);

    for ((id, conv) in conversations.entries()) {
      if (isParticipant(conv, msg.caller)) {
        buf.add(conv);
      };
    };

    // simple sort by lastMessageAt descending
    let arr = Buffer.toArray(buf);
    Array.sort<Conversation>(arr, func (a, b) {
      if (a.lastMessageAt > b.lastMessageAt) { #less }
      else if (a.lastMessageAt < b.lastMessageAt) { #greater }
      else { #equal }
    })
  };

  /// Get a single conversation (only if participant).
  public query(msg) func getConversation(conversationId : Nat) : async ?Conversation {
    switch (conversations.get(conversationId)) {
      case null { null };
      case (?conv) {
        if (isParticipant(conv, msg.caller)) { ?conv } else { null }
      };
    }
  };

  /// Optional: prune messages older than 90 days from a conversation.
  /// Can be called periodically by anyone (or a timer canister later).
  public shared func pruneOldMessages(conversationId : Nat) : async Nat {
    let cutoff = Time.now() - MESSAGE_TTL_NANOS;
    var removed : Nat = 0;

    switch (conversationMessages.get(conversationId)) {
      case (?ids) {
        let kept = Buffer.Buffer<Nat>(0);
        for (id in ids.vals()) {
          switch (messages.get(id)) {
            case (?m) {
              if (m.timestamp >= cutoff) {
                kept.add(id);
              } else {
                messages.delete(id);
                removed += 1;
              };
            };
            case null {};
          };
        };
        conversationMessages.put(conversationId, Buffer.toArray(kept));
      };
      case null {};
    };

    removed
  };

  /// How many messages the caller has sent today (for UI feedback).
  public query(msg) func getMyDailyMessageCount() : async Nat {
    let now = Time.now();
    switch (dailyCounts.get(msg.caller)) {
      case (?entry) {
        if (now - entry.lastReset > DAY_NANOS) { 0 } else { entry.count }
      };
      case null { 0 };
    }
  };
}
