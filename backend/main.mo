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
    avatarURL : Text;
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
    imageURL : ?Text;
    timestamp : Time.Time;
    likes : Nat;
    loves : Nat;
    reportCount : Nat;
    isHidden : Bool;
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
  private var postComments = HashMap.HashMap<Nat, [Nat]>(0, Nat.equal, func (n: Nat) : Nat32 { Nat32.fromNat(n) });
  private var following = HashMap.HashMap<Principal, [Principal]>(0, Principal.equal, Principal.hash);
  private var keywordIndex = HashMap.HashMap<Text, [Nat]>(0, Text.equal, Text.hash);
  private var reports = HashMap.HashMap<Nat, [Principal]>(0, Nat.equal, func (n: Nat) : Nat32 { Nat32.fromNat(n) });

  // ==================== CONSTANTS ====================

  private let FREE_TIER_LIMIT : Nat = 20;
  private let DAILY_LIMIT : Nat = 5;
  private let TOKENS_PER_POST : Nat = 5;
  private let TOKENS_PER_LOVE : Nat = 2;
  private let FREE_MAX_LENGTH : Nat = 115;     // Free tier character limit
  private let PAID_MAX_LENGTH : Nat = 512;     // Paid tier character limit
  private let MAX_COMMENT_LENGTH : Nat = 2000;
  private let TIERS : [Nat] = [200, 400, 600];
  private let REPORTS_TO_HIDE : Nat = 5;

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
    let words = Text.split(content, #char ' ');
    for (word in words) {
      let lower = Text.toLower(word);
      if (Text.size(lower) > 2) {
        switch (keywordIndex.get(lower)) {
          case (?ids) { keywordIndex.put(lower, Array.append(ids, [postId])); };
          case null { keywordIndex.put(lower, [postId]); };
        };
      };
    };
  };

  // ==================== PROFILE ====================

  public shared(msg) func setProfile(username : Text, bio : Text, avatarURL : Text) : async () {
    let profile : UserProfile = { username; bio; avatarURL };
    userProfiles.put(msg.caller, profile);
  };

  public query func getProfile(user : Principal) : async ?UserProfile {
    userProfiles.get(user)
  };

  // ==================== FOLLOW ====================

  public shared(msg) func follow(target : Principal) : async () {
    switch (following.get(msg.caller)) {
      case (?list) { following.put(msg.caller, Array.append(list, [target])); };
      case null { following.put(msg.caller, [target]); };
    };
  };

  public query func getFollowing(user : Principal) : async [Principal] {
    switch (following.get(user)) {
      case (?list) { list };
      case null { [] };
    }
  };

  // ==================== TOKENS ====================

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

  public query func getTiers() : async [Nat] { TIERS };

  // ==================== POSTS ====================

  public shared(msg) func makePost(content : Text, imageURL : ?Text) : async ?Nat {
    var balance = getUserBalance(msg.caller);
    balance := maybeReset(msg.caller, balance);

    let isFree = balance.postsThisMonth < FREE_TIER_LIMIT;

    // Character limit depends on tier
    let maxLength = if (isFree) { FREE_MAX_LENGTH } else { PAID_MAX_LENGTH };
    if (Text.size(content) > maxLength) {
      return null; // too long for this tier
    };

    if (balance.postsToday >= DAILY_LIMIT) { return null };

    if (not isFree and balance.tokens < TOKENS_PER_POST) { return null };

    let postId = nextPostId;
    nextPostId += 1;

    let post : Post = {
      id = postId;
      author = msg.caller;
      content = content;
      imageURL = imageURL;
      timestamp = Time.now();
      likes = 0;
      loves = 0;
      reportCount = 0;
      isHidden = false;
    };

    posts.put(postId, post);
    indexPost(postId, content);

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
    switch (posts.get(postId)) {
      case (?p) { if (p.isHidden) { null } else { ?p } };
      case null { null };
    }
  };

  public query func getRecentPosts(limit : Nat) : async [Post] {
    let buf = Buffer.Buffer<Post>(0);
    var i : Nat = 0;
    while (i < nextPostId and buf.size() < limit) {
      let id = nextPostId - 1 - i;
      switch (posts.get(id)) {
        case (?p) { if (not p.isHidden) { buf.add(p) } };
        case null {};
      };
      i += 1;
    };
    Buffer.toArray(buf)
  };

  // ==================== REPORT SYSTEM ====================

  public shared(msg) func reportPost(postId : Nat) : async Text {
    switch (posts.get(postId)) {
      case null { return "Post not found" };
      case (?post) {
        if (post.isHidden) { return "Post already hidden" };

        switch (reports.get(postId)) {
          case (?reporters) {
            for (r in reporters.vals()) {
              if (Principal.equal(r, msg.caller)) {
                return "You already reported this post";
              };
            };
            let newReporters = Array.append(reporters, [msg.caller]);
            reports.put(postId, newReporters);

            let newCount = newReporters.size();
            let shouldHide = newCount >= REPORTS_TO_HIDE;

            let updatedPost : Post = {
              id = post.id;
              author = post.author;
              content = post.content;
              imageURL = post.imageURL;
              timestamp = post.timestamp;
              likes = post.likes;
              loves = post.loves;
              reportCount = newCount;
              isHidden = shouldHide;
            };
            posts.put(postId, updatedPost);

            if (shouldHide) {
              return "Post has been hidden due to multiple reports";
            } else {
              return "Report submitted. Thank you.";
            }
          };
          case null {
            reports.put(postId, [msg.caller]);
            let updatedPost : Post = {
              id = post.id;
              author = post.author;
              content = post.content;
              imageURL = post.imageURL;
              timestamp = post.timestamp;
              likes = post.likes;
              loves = post.loves;
              reportCount = 1;
              isHidden = false;
            };
            posts.put(postId, updatedPost);
            return "Report submitted. Thank you.";
          };
        }
      };
    }
  };

  // ==================== LIKES & LOVES ====================

  public shared(msg) func likePost(postId : Nat) : async Bool {
    switch (posts.get(postId)) {
      case (?post) {
        if (post.isHidden) { return false };
        let updated : Post = {
          id = post.id;
          author = post.author;
          content = post.content;
          imageURL = post.imageURL;
          timestamp = post.timestamp;
          likes = post.likes + 1;
          loves = post.loves;
          reportCount = post.reportCount;
          isHidden = post.isHidden;
        };
        posts.put(postId, updated);
        true
      };
      case null { false };
    }
  };

  public shared(msg) func lovePost(postId : Nat) : async Bool {
    switch (posts.get(postId)) {
      case (?post) {
        if (post.isHidden) { return false };

        var balance = getUserBalance(msg.caller);
        balance := maybeReset(msg.caller, balance);

        if (balance.tokens < TOKENS_PER_LOVE) { return false };

        let tipAmount : Nat = 1;

        let senderUpdated : UserBalance = {
          tokens = balance.tokens - TOKENS_PER_LOVE;
          postsThisMonth = balance.postsThisMonth;
          postsToday = balance.postsToday;
          lastReset = balance.lastReset;
          lastDailyReset = balance.lastDailyReset;
        };
        userBalances.put(msg.caller, senderUpdated);

        let authorBalance = getUserBalance(post.author);
        let authorUpdated : UserBalance = {
          tokens = authorBalance.tokens + tipAmount;
          postsThisMonth = authorBalance.postsThisMonth;
          postsToday = authorBalance.postsToday;
          lastReset = authorBalance.lastReset;
          lastDailyReset = authorBalance.lastDailyReset;
        };
        userBalances.put(post.author, authorUpdated);

        let updatedPost : Post = {
          id = post.id;
          author = post.author;
          content = post.content;
          imageURL = post.imageURL;
          timestamp = post.timestamp;
          likes = post.likes;
          loves = post.loves + 1;
          reportCount = post.reportCount;
          isHidden = post.isHidden;
        };
        posts.put(postId, updatedPost);
        true
      };
      case null { false };
    }
  };

  // ==================== COMMENTS ====================

  public shared(msg) func addComment(postId : Nat, content : Text) : async ?Nat {
    if (Text.size(content) > MAX_COMMENT_LENGTH) { return null };

    switch (posts.get(postId)) {
      case null { return null };
      case (?p) { if (p.isHidden) { return null } };
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

    switch (postComments.get(postId)) {
      case (?list) { postComments.put(postId, Array.append(list, [commentId])); };
      case null { postComments.put(postId, [commentId]); };
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
            case (?p) { if (not p.isHidden) { buf.add(p) } };
            case null {};
          };
        };
        Buffer.toArray(buf)
      };
      case null { [] };
    }
  };
}