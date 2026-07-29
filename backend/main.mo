import HashMap "mo:base/HashMap";
import Principal "mo:base/Principal";
import Time "mo:base/Time";
import Nat "mo:base/Nat";
import Int "mo:base/Int";
import Text "mo:base/Text";
import Array "mo:base/Array";
import Iter "mo:base/Iter";
import Buffer "mo:base/Buffer";

actor ScaleSpace {

  // ==================== TYPES ====================

  type UserProfile = {
    username : Text;
    bio : Text;
    avatarURL : Text; // Cloudflare R2 or Arweave URL
  };

  type UserBalance = {
    tokens : Nat;
    postsThisMonth : Nat;
    postsToday : Nat;
    lastReset : Time.Time;
    lastDailyReset : Time.Time;
  };

  type Post = {
    id : Nat;
    author : Principal;
    content : Text;
    imageURL : ?Text; // Optional – one image per post
    timestamp : Time.Time;
    likes : Nat;
    loves : Nat;
  };

  type Comment = {
    id : Nat;
    postId : Nat;
    author : Principal;
    content : Text;
    timestamp : Time.Time;
  };

  // ==================== STORAGE ====================

  private stable var nextPostId : Nat = 0;
  private stable var nextCommentId : Nat = 0;

  private var userBalances = HashMap.HashMap<Principal, UserBalance>(0, Principal.equal, Principal.hash);
  private var userProfiles = HashMap.HashMap<Principal, UserProfile>(0, Principal.equal, Principal.hash);
  private var posts = HashMap.HashMap<Nat, Post>(0, Nat.equal, func (n: Nat) : Nat32 { Nat32.fromNat(n) });
  private var comments = HashMap.HashMap<Nat, Comment>(0, Nat.equal, func (n: Nat) : Nat32 { Nat32.fromNat(n) });
  private var postComments = HashMap.HashMap<Nat, [Nat]>(0, Nat.equal, func (n: Nat) : Nat32 { Nat32.fromNat(n) }); // postId -> commentIds
  private var following = HashMap.HashMap<Principal, [Principal]>(0, Principal.equal, Principal.hash);
  private var keywordIndex = HashMap.HashMap<Text, [Nat]>(0, Text.equal, Text.hash); // simple search index

  // ==================== CONSTANTS ====================

  private let FREE_TIER_LIMIT : Nat = 20;       // posts per month free
  private let DAILY_LIMIT : Nat = 5;            // max posts per day
  private let TOKENS_PER_POST : Nat = 5;
  private let TOKENS_PER_LOVE : Nat = 2;        // 1 burns, 1 tips creator
  private let MAX_POST_LENGTH : Nat = 10000;
  private let MAX_COMMENT_LENGTH : Nat = 2000;
  private let TIERS : [Nat] = [200, 400, 600];

  // ==================== HELPERS ====================

  private func getUserBalance(user : Principal) : UserBalance {
    switch (userBalances.get(user)) {
      case (?b) { b };
      case null {
        let newB : UserBalance = {
          tokens = 0;
          postsThisMonth = 0;
          postsToday = 0;
          lastReset = Time.now();
          lastDailyReset = Time.now();
        };
        userBalances.put(user, newB);
        newB
      };
    }
  };

  private func maybeReset(user : Principal, balance : UserBalance) : UserBalance {
    let now = Time.now();
    let dayInNanos : Int = 24 * 60 * 60 * 1_000_000_000;
    let monthInNanos : Int = 30 * dayInNanos;

    var postsThisMonth = balance.postsThisMonth;
    var postsToday = balance.postsToday;
    var lastReset = balance.lastReset;
    var lastDailyReset = balance.lastDailyReset;

    if (now - balance.lastReset > monthInNanos) {
      postsThisMonth := 0;
      lastReset := now;
    };

    if (now - balance.lastDailyReset > dayInNanos) {
      postsToday := 0;
      lastDailyReset := now;
    };

    let updated : UserBalance = {
      tokens = balance.tokens;
      postsThisMonth = postsThisMonth;
      postsToday = postsToday;
      lastReset = lastReset;
      lastDailyReset = lastDailyReset;
    };
    userBalances.put(user, updated);
    updated
  };

  private func indexPost(postId : Nat, content : Text) {
    // Very simple keyword indexing (split by space)
    let words = Text.split(content, #char ' ');
    for (word in words) {
      let lower = Text.toLower(word);
      if (Text.size(lower) > 2) {
        switch (keywordIndex.get(lower)) {
          case (?ids) {
            keywordIndex.put(lower, Array.append(ids, [postId]));
          };
          case null {
            keywordIndex.put(lower, [postId]);
          };
        };
      };
    };
  };

  // ==================== PROFILE ====================

  public shared(msg) func setProfile(username : Text, bio : Text, avatarURL : Text) : async () {
    let profile : UserProfile = {
      username = username;
      bio = bio;
      avatarURL = avatarURL; // Cloudflare R2 URL for now, switchable to Arweave later
    };
    userProfiles.put(msg.caller, profile);
  };

  public query func getProfile(user : Principal) : async ?UserProfile {
    userProfiles.get(user)
  };

  // ==================== FOLLOW ====================

  public shared(msg) func follow(target : Principal) : async () {
    switch (following.get(msg.caller)) {
      case (?list) {
        following.put(msg.caller, Array.append(list, [target]));
      };
      case null {
        following.put(msg.caller, [target]);
      };
    };
  };

  public query func getFollowing(user : Principal) : async [Principal] {
    switch (following.get(user)) {
      case (?list) { list };
      case null { [] };
    }
  };

  // ==================== TOKENS / SUBSCRIBE ====================

  public shared(msg) func subscribe(tokenAmount : Nat) : async () {
    let current = getUserBalance(msg.caller);
    let updated : UserBalance = {
      tokens = current.tokens + tokenAmount;
      postsThisMonth = current.postsThisMonth;
      postsToday = current.postsToday;
      lastReset = current.lastReset;
      lastDailyReset = current.lastDailyReset;
    };
    userBalances.put(msg.caller, updated);
  };

  public query func getUserStats(user : Principal) : async ?{
    tokens : Nat;
    postsThisMonth : Nat;
    postsToday : Nat;
    isFreeTier : Bool;
  } {
    switch (userBalances.get(user)) {
      case (?balance) {
        let current = maybeReset(user, balance);
        ?{
          tokens = current.tokens;
          postsThisMonth = current.postsThisMonth;
          postsToday = current.postsToday;
          isFreeTier = current.postsThisMonth < FREE_TIER_LIMIT;
        }
      };
      case null { null };
    }
  };

  public query func getTiers() : async [Nat] {
    TIERS
  };

  // ==================== POSTS (with image) ====================

  public shared(msg) func makePost(content : Text, imageURL : ?Text) : async ?Nat {
    if (Text.size(content) > MAX_POST_LENGTH) {
      return null; // too long
    };

    var balance = getUserBalance(msg.caller);
    balance := maybeReset(msg.caller, balance);

    // Daily rate limit
    if (balance.postsToday >= DAILY_LIMIT) {
      return null;
    };

    let isFree = balance.postsThisMonth < FREE_TIER_LIMIT;

    if (not isFree) {
      if (balance.tokens < TOKENS_PER_POST) {
        return null; // not enough tokens
      };
    };

    // Create the post
    let postId = nextPostId;
    nextPostId += 1;

    let post : Post = {
      id = postId;
      author = msg.caller;
      content = content;
      imageURL = imageURL; // one image max
      timestamp = Time.now();
      likes = 0;
      loves = 0;
    };

    posts.put(postId, post);
    indexPost(postId, content);

    // Update balance
    let newTokens = if (isFree) { balance.tokens } else { balance.tokens - TOKENS_PER_POST };
    let updated : UserBalance = {
      tokens = newTokens;
      postsThisMonth = balance.postsThisMonth + 1;
      postsToday = balance.postsToday + 1;
      lastReset = balance.lastReset;
      lastDailyReset = balance.lastDailyReset;
    };
    userBalances.put(msg.caller, updated);

    ?postId
  };

  public query func getPost(postId : Nat) : async ?Post {
    posts.get(postId)
  };

  public query func getRecentPosts(limit : Nat) : async [Post] {
    let buf = Buffer.Buffer<Post>(0);
    var i : Nat = 0;
    while (i < nextPostId and buf.size() < limit) {
      let id = nextPostId - 1 - i;
      switch (posts.get(id)) {
        case (?p) { buf.add(p) };
        case null {};
      };
      i += 1;
    };
    Buffer.toArray(buf)
  };

  // ==================== LIKES (free) & LOVES (paid) ====================

  public shared(msg) func likePost(postId : Nat) : async Bool {
    switch (posts.get(postId)) {
      case (?post) {
        let updated : Post = {
          id = post.id;
          author = post.author;
          content = post.content;
          imageURL = post.imageURL;
          timestamp = post.timestamp;
          likes = post.likes + 1;
          loves = post.loves;
        };
        posts.put(postId, updated);
        true
      };
      case null { false };
    }
  };

  // Love costs 2 tokens: 1 burns, 1 tips the post author
  public shared(msg) func lovePost(postId : Nat) : async Bool {
    switch (posts.get(postId)) {
      case (?post) {
        var balance = getUserBalance(msg.caller);
        balance := maybeReset(msg.caller, balance);

        if (balance.tokens < TOKENS_PER_LOVE) {
          return false;
        };

        // Burn 1 + tip 1 to author
        let tipAmount : Nat = 1;

        // Deduct from sender
        let senderUpdated : UserBalance = {
          tokens = balance.tokens - TOKENS_PER_LOVE;
          postsThisMonth = balance.postsThisMonth;
          postsToday = balance.postsToday;
          lastReset = balance.lastReset;
          lastDailyReset = balance.lastDailyReset;
        };
        userBalances.put(msg.caller, senderUpdated);

        // Tip the author
        let authorBalance = getUserBalance(post.author);
        let authorUpdated : UserBalance = {
          tokens = authorBalance.tokens + tipAmount;
          postsThisMonth = authorBalance.postsThisMonth;
          postsToday = authorBalance.postsToday;
          lastReset = authorBalance.lastReset;
          lastDailyReset = authorBalance.lastDailyReset;
        };
        userBalances.put(post.author, authorUpdated);

        // Update post love count
        let updatedPost : Post = {
          id = post.id;
          author = post.author;
          content = post.content;
          imageURL = post.imageURL;
          timestamp = post.timestamp;
          likes = post.likes;
          loves = post.loves + 1;
        };
        posts.put(postId, updatedPost);

        true
      };
      case null { false };
    }
  };

  // ==================== COMMENTS ====================

  public shared(msg) func addComment(postId : Nat, content : Text) : async ?Nat {
    if (Text.size(content) > MAX_COMMENT_LENGTH) {
      return null;
    };

    switch (posts.get(postId)) {
      case null { return null };
      case (?_) {};
    };

    let commentId = nextCommentId;
    nextCommentId += 1;

    let comment : Comment = {
      id = commentId;
      postId = postId;
      author = msg.caller;
      content = content;
      timestamp = Time.now();
    };
    comments.put(commentId, comment);

    // Attach to post
    switch (postComments.get(postId)) {
      case (?list) {
        postComments.put(postId, Array.append(list, [commentId]));
      };
      case null {
        postComments.put(postId, [commentId]);
      };
    };

    ?commentId
  };

  public query func getComments(postId : Nat) : async [Comment] {
    switch (postComments.get(postId)) {
      case (?ids) {
        let buf = Buffer.Buffer<Comment>(0);
        for (id in ids.vals()) {
          switch (comments.get(id)) {
            case (?c) { buf.add(c) };
            case null {};
          };
        };
        Buffer.toArray(buf)
      };
      case null { [] };
    }
  };

  // ==================== SEARCH ====================

  public query func searchPosts(keyword : Text) : async [Post] {
    let lower = Text.toLower(keyword);
    switch (keywordIndex.get(lower)) {
      case (?ids) {
        let buf = Buffer.Buffer<Post>(0);
        for (id in ids.vals()) {
          switch (posts.get(id)) {
            case (?p) { buf.add(p) };
            case null {};
          };
        };
        Buffer.toArray(buf)
      };
      case null { [] };
    }
  };
}