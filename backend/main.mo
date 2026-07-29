import HashMap "mo:base/HashMap";
import Principal "mo:base/Principal";
import Time "mo:base/Time";
import Nat "mo:base/Nat";
import Int "mo:base/Int";
import Text "mo:base/Text";

actor ScaleSpace {
  // User balance record
  type UserBalance = {
    tokens: Nat;
    postsThisMonth: Nat;
    lastReset: Time.Time;
  };

  // Storage
  private stable var userBalances = HashMap.HashMap<Principal, UserBalance>(0, Principal.equal, Principal.hash);

  // Constants
  private let FREE_TIER_LIMIT: Nat = 20;
  private let TOKENS_PER_POST: Nat = 5;
  private let MAX_POST_LENGTH: Nat = 10000;
  private let TIERS = [200, 400, 600]; // Paid tier token amounts

  // Get or create user balance
  private func getUserBalance(user: Principal) : UserBalance {
    switch (userBalances.get(user)) {
      case (?balance) { balance };
      case null {
        let newBalance: UserBalance = {
          tokens = 0;
          postsThisMonth = 0;
          lastReset = Time.now();
        };
        userBalances.put(user, newBalance);
        newBalance
      };
    }
  };

  // Reset monthly post count if needed
  private func maybeResetMonthly(user: Principal, balance: UserBalance) : UserBalance {
    let now = Time.now();
    let monthInNanos = 30 * 24 * 60 * 60 * 1_000_000_000; // Approx 30 days
    if (now - balance.lastReset > monthInNanos) {
      let resetBalance: UserBalance = {
        tokens = balance.tokens;
        postsThisMonth = 0;
        lastReset = now;
      };
      userBalances.put(user, resetBalance);
      resetBalance
    } else {
      balance
    }
  };

  // Subscribe or buy tokens (adds to balance)
  public func subscribe(user: Principal, tokenAmount: Nat) : async () {
    let current = getUserBalance(user);
    let updated: UserBalance = {
      tokens = current.tokens + tokenAmount;
      postsThisMonth = current.postsThisMonth;
      lastReset = current.lastReset;
    };
    userBalances.put(user, updated);
  };

  // Make a post (burns tokens, respects free tier)
  public func makePost(user: Principal, content: Text) : async Bool {
    if (Text.size(content) > MAX_POST_LENGTH) {
      return false; // Post too long
    };

    var balance = getUserBalance(user);
    balance := maybeResetMonthly(user, balance);

    let isFreeTier = balance.postsThisMonth < FREE_TIER_LIMIT;

    if (isFreeTier) {
      // Free post
      let updated: UserBalance = {
        tokens = balance.tokens;
        postsThisMonth = balance.postsThisMonth + 1;
        lastReset = balance.lastReset;
      };
      userBalances.put(user, updated);
      return true;
    } else {
      // Paid post - need tokens
      if (balance.tokens >= TOKENS_PER_POST) {
        let updated: UserBalance = {
          tokens = balance.tokens - TOKENS_PER_POST;
          postsThisMonth = balance.postsThisMonth + 1;
          lastReset = balance.lastReset;
        };
        userBalances.put(user, updated);
        return true;
      } else {
        return false; // Not enough tokens
      }
    }
  };

  // Get user stats
  public query func getUserStats(user: Principal) : async ?{tokens: Nat; postsThisMonth: Nat; isFreeTier: Bool} {
    switch (userBalances.get(user)) {
      case (?balance) {
        let current = maybeResetMonthly(user, balance);
        ?{
          tokens = current.tokens;
          postsThisMonth = current.postsThisMonth;
          isFreeTier = current.postsThisMonth < FREE_TIER_LIMIT;
        }
      };
      case null { null }
    }
  };

  // Get available tiers
  public query func getTiers() : async [Nat] {
    TIERS
  };
}