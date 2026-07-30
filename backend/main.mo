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

  type SiteStats = {
    totalPosts : Nat;
    visiblePosts : Nat;
    hiddenPosts : Nat;
    totalComments : Nat;
    totalProfiles : Nat;
    totalBalances : Nat;
    reportedPosts : Nat;
    totalReportFlags : Nat;
    bannedUsers : Nat;
    tokensInCirculation : Nat;
  };

  private stable var nextPostId : Nat = 0;
  private stable var nextCommentId : Nat = 0;

  private stable var owner : Principal = Principal.fromText("aaaaa-aa");
  private stable var ownerCloaked : Bool = false;

  private var userBalances = HashMap.HashMap<Principal, UserBalance>(0, Principal.equal, Principal.hash);
  private var userProfiles = HashMap.HashMap<Principal, UserProfile>(0, Principal.equal, Principal.hash);
  private var posts = HashMap.HashMap<Nat, Post>(0, Nat.equal, func (n: Nat) : Nat32 { Nat32.fromNat(n) });
  private var comments = HashMap.HashMap<Nat, Comment>(0, Nat.equal, func (n: Nat) : Nat32 { Nat32.fromNat(n) });
  private var postComments = HashMap.HashMap<Nat, [Nat]>(0, Nat.equal, func (n: Nat) : Nat32 { Nat32.fromNat(n) });
  private var following = HashMap.HashMap<Principal, [Principal]>(0, Principal.equal, Principal.hash);
  private var keywordIndex = HashMap.HashMap<Text, [Nat]>(0, Text.equal, Text.hash);
  private var reports = HashMap.HashMap<Nat, [Principal]>(0, Nat.equal, func (n: Nat) : Nat32 { Nat32.fromNat(n) });
  private var banned = HashMap.HashMap<Principal, Bool>(0, Principal.equal, Principal.hash);

  private let FREE_TIER_LIMIT : Nat = 20;
  private let DAILY_LIMIT : Nat = 5;
  private let TOKENS_PER_POST : Nat = 5;
  private let TOKENS_PER_LOVE : Nat = 2;
  private let TOKENS_PER_MESSAGE : Nat = 1;
  private let FREE_MAX_LENGTH : Nat = 115;
  private let PAID_MAX_LENGTH : Nat = 512;
  private let MAX_COMMENT_LENGTH : Nat = 2000;
  private let TIERS : [Nat] = [200, 400, 600];
  private let REPORTS_TO_HIDE : Nat = 5;

  private func isMaster(p : Principal) : Bool {
    not Principal.isAnonymous(owner) and Principal.equal(owner, p)
  };

  private func isBannedUser(p : Principal) : Bool {
    switch (banned.get(p)) {
      case (?true) { true };
      case _ { false };
    }
  };

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

  public shared(msg) func claimMasterProfile() : async Text {
    if (Principal.isAnonymous(msg.caller)) {
      return "You must be logged in";
    };
    if (not Principal.isAnonymous(owner)) {
      if (Principal.equal(owner, msg.caller)) {
        return "You already own the master profile";
      };
      return "Master profile already claimed";
    };

    owner := msg.caller;
    ownerCloaked := false;

    let profile : UserProfile = {
      username = "ScaleSpace";
      bio = "Founder of ScaleSpace — a quieter place for real conversation.";
      avatarURL = "";
    };
    userProfiles.put(msg.caller, profile);

    let bal = getUserBalance(msg.caller);
    userBalances.put(msg.caller, {
      tokens = bal.tokens + 1000;
      postsThisMonth = bal.postsThisMonth;
      postsToday = bal.postsToday;
      lastReset = bal.lastReset;
      lastDailyReset = bal.lastDailyReset;
    });

    "Master profile claimed successfully"
  };

  public query func getOwner() : async Principal { owner };
  public query func isOwner(user : Principal) : async Bool { isMaster(user) };
  public query func isOwnerVisible(user : Principal) : async Bool {
    isMaster(user) and not ownerCloaked
  };
  public query func isCloaked() : async Bool { ownerCloaked };

  public shared(msg) func setCloak(cloaked : Bool) : async Bool {
    if (not isMaster(msg.caller)) { return false };
    ownerCloaked := cloaked;
    true
  };

  public shared(msg) func adminGrantTokens(to : Principal, amount : Nat) : async Bool {
    if (not isMaster(msg.caller)) { return false };
    if (amount == 0) { return true };
    let bal = getUserBalance(to);
    userBalances.put(to, {
      tokens = bal.tokens + amount;
      postsThisMonth = bal.postsThisMonth;
      postsToday = bal.postsToday;
      lastReset = bal.lastReset;
      lastDailyReset = bal.lastDailyReset;
    });
    true
  };

  public shared(msg) func adminHidePost(postId : Nat) : async Bool {
    if (not isMaster(msg.caller)) { return false };
    switch (posts.get(postId)) {
      case null { false };
      case (?post) {
        posts.put(postId, {
          id = post.id;
          author = post.author;
          content = post.content;
          imageURL = post.imageURL;
          timestamp = post.timestamp;
          likes = post.likes;
          loves = post.loves;
          reportCount = post.reportCount;
          isHidden = true;
        });
        true
      };
    }
  };

  public shared(msg) func adminUnhidePost(postId : Nat) : async Bool {
    if (not isMaster(msg.caller)) { return false };
    switch (posts.get(postId)) {
      case null { false };
      case (?post) {
        reports.delete(postId);
        posts.put(postId, {
          id = post.id;
          author = post.author;
          content = post.content;
          imageURL = post.imageURL;
          timestamp = post.timestamp;
          likes = post.likes;
          loves = post.loves;
          reportCount = 0;
          isHidden = false;
        });
        true
      };
    }
  };

  public shared(msg) func adminBanUser(user : Principal) : async Text {
    if (not isMaster(msg.caller)) { return "Not authorized" };
    if (Principal.equal(user, msg.caller)) { return "You cannot ban yourself" };
    if (isMaster(user)) { return "Cannot ban the master profile" };
    banned.put(user, true);
    "User banned"
  };

  public shared(msg) func adminUnbanUser(user : Principal) : async Text {
    if (not isMaster(msg.caller)) { return "Not authorized" };
    banned.delete(user);
    "User unbanned"
  };

  public query func isBanned(user : Principal) : async Bool {
    isBannedUser(user)
  };

  public query(msg) func getBannedUsers() : async [Principal] {
    if (not isMaster(msg.caller)) { return [] };
    let buf = Buffer.Buffer<Principal>(0);
    for ((p, flag) in banned.entries()) {
      if (flag) { buf.add(p) };
    };
    Buffer.toArray(buf)
  };

  /// Master only: aggregate site statistics
  public query(msg) func getSiteStats() : async SiteStats {
    if (not isMaster(msg.caller)) {
      return {
        totalPosts = 0;
        visiblePosts = 0;
        hiddenPosts = 0;
        totalComments = 0;
        totalProfiles = 0;
        totalBalances = 0;
        reportedPosts = 0;
        totalReportFlags = 0;
        bannedUsers = 0;
        tokensInCirculation = 0;
      };
    };

    var visible : Nat = 0;
    var hidden : Nat = 0;
    var reported : Nat = 0;
    var reportFlags : Nat = 0;

    for ((id, post) in posts.entries()) {
      if (post.isHidden) { hidden += 1 } else { visible += 1 };
      if (post.reportCount > 0) {
        reported += 1;
        reportFlags += post.reportCount;
      };
    };

    var bannedCount : Nat = 0;
    for ((p, flag) in banned.entries()) {
      if (flag) { bannedCount += 1 };
    };

    var tokenSum : Nat = 0;
    for ((p, bal) in userBalances.entries()) {
      tokenSum += bal.tokens;
    };

    {
      totalPosts = nextPostId;
      visiblePosts = visible;
      hiddenPosts = hidden;
      totalComments = nextCommentId;
      totalProfiles = userProfiles.size();
      totalBalances = userBalances.size();
      reportedPosts = reported;
      totalReportFlags = reportFlags;
      bannedUsers = bannedCount;
      tokensInCirculation = tokenSum;
    }
  };

  public query(msg) func getReportedPosts() : async [Post] {
    if (not isMaster(msg.caller)) { return [] };
    let buf = Buffer.Buffer<Post>(0);
    for ((id, post) in posts.entries()) {
      if (post.reportCount > 0 or post.isHidden) {
        buf.add(post);
      };
    };
    let arr = Buffer.toArray(buf);
    Array.sort<Post>(arr, func (a, b) {
      if (a.reportCount > b.reportCount) { #less }
      else if (a.reportCount < b.reportCount) { #greater }
      else { #equal }
    })
  };

  public shared(msg) func setProfile(username : Text, bio : Text, avatarURL : Text) : async () {
    if (isBannedUser(msg.caller)) { return };
    userProfiles.put(msg.caller, { username; bio; avatarURL });
  };

  public query func getProfile(user : Principal) : async ?UserProfile {
    userProfiles.get(user)
  };

  public shared(msg) func follow(target : Principal) : async () {
    if (isBannedUser(msg.caller)) { return };
    if (Principal.equal(msg.caller, target)) { return };
    switch (following.get(msg.caller)) {
      case (?list) {
        for (p in list.vals()) {
          if (Principal.equal(p, target)) { return };
        };
        following.put(msg.caller, Array.append(list, [target]));
      };
      case null { following.put(msg.caller, [target]); };
    };
  };

  public shared(msg) func unfollow(target : Principal) : async () {
    switch (following.get(msg.caller)) {
      case (?list) {
        following.put(msg.caller, Array.filter<Principal>(list, func (p) { not Principal.equal(p, target) }));
      };
      case null {};
    };
  };

  public query func getFollowing(user : Principal) : async [Principal] {
    switch (following.get(user)) {
      case (?list) { list };
      case null { [] };
    }
  };

  public shared(msg) func subscribe(tokenAmount : Nat) : async () {
    if (isBannedUser(msg.caller)) { return };
    let current = getUserBalance(msg.caller);
    userBalances.put(msg.caller, {
      tokens = current.tokens + tokenAmount;
      postsThisMonth = current.postsThisMonth;
      postsToday = current.postsToday;
      lastReset = current.lastReset;
      lastDailyReset = current.lastDailyReset;
    });
  };

  public shared(msg) func spendTokens(amount : Nat) : async Bool {
    if (isBannedUser(msg.caller)) { return false };
    if (amount == 0) { return true };
    var balance = getUserBalance(msg.caller);
    balance := maybeReset(msg.caller, balance);
    if (balance.tokens < amount) { return false };
    userBalances.put(msg.caller, {
      tokens = balance.tokens - amount;
      postsThisMonth = balance.postsThisMonth;
      postsToday = balance.postsToday;
      lastReset = balance.lastReset;
      lastDailyReset = balance.lastDailyReset;
    });
    true
  };

  public query func getTokensPerMessage() : async Nat { TOKENS_PER_MESSAGE };

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

  public shared(msg) func makePost(content : Text, imageURL : ?Text) : async ?Nat {
    if (isBannedUser(msg.caller)) { return null };
    var balance = getUserBalance(msg.caller);
    balance := maybeReset(msg.caller, balance);
    let master = isMaster(msg.caller);
    let isFree = balance.postsThisMonth < FREE_TIER_LIMIT;
    let maxLength = if (master or not isFree) { PAID_MAX_LENGTH } else { FREE_MAX_LENGTH };
    if (Text.size(content) > maxLength) { return null };
    if (not master) {
      if (balance.postsToday >= DAILY_LIMIT) { return null };
      if (not isFree and balance.tokens < TOKENS_PER_POST) { return null };
    };
    let postId = nextPostId;
    nextPostId += 1;
    posts.put(postId, {
      id = postId;
      author = msg.caller;
      content = content;
      imageURL = imageURL;
      timestamp = Time.now();
      likes = 0;
      loves = 0;
      reportCount = 0;
      isHidden = false;
    });
    indexPost(postId, content);
    let newTokens = if (master or isFree) { balance.tokens } else { balance.tokens - TOKENS_PER_POST };
    userBalances.put(msg.caller, {
      tokens = newTokens;
      postsThisMonth = balance.postsThisMonth + 1;
      postsToday = balance.postsToday + 1;
      lastReset = balance.lastReset;
      lastDailyReset = balance.lastDailyReset;
    });
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

  public query func getPostsByAuthor(author : Principal, limit : Nat) : async [Post] {
    let buf = Buffer.Buffer<Post>(0);
    var i : Nat = 0;
    while (i < nextPostId and buf.size() < limit) {
      let id = nextPostId - 1 - i;
      switch (posts.get(id)) {
        case (?p) {
          if (not p.isHidden and Principal.equal(p.author, author)) {
            buf.add(p);
          };
        };
        case null {};
      };
      i += 1;
    };
    Buffer.toArray(buf)
  };

  public shared(msg) func reportPost(postId : Nat) : async Text {
    if (isBannedUser(msg.caller)) { return "You are banned" };
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
            posts.put(postId, {
              id = post.id;
              author = post.author;
              content = post.content;
              imageURL = post.imageURL;
              timestamp = post.timestamp;
              likes = post.likes;
              loves = post.loves;
              reportCount = newCount;
              isHidden = shouldHide;
            });
            if (shouldHide) {
              return "Post has been hidden due to multiple reports";
            } else {
              return "Report submitted. Thank you.";
            }
          };
          case null {
            reports.put(postId, [msg.caller]);
            posts.put(postId, {
              id = post.id;
              author = post.author;
              content = post.content;
              imageURL = post.imageURL;
              timestamp = post.timestamp;
              likes = post.likes;
              loves = post.loves;
              reportCount = 1;
              isHidden = false;
            });
            return "Report submitted. Thank you.";
          };
        }
      };
    }
  };

  public shared(msg) func likePost(postId : Nat) : async Bool {
    if (isBannedUser(msg.caller)) { return false };
    switch (posts.get(postId)) {
      case (?post) {
        if (post.isHidden) { return false };
        posts.put(postId, {
          id = post.id;
          author = post.author;
          content = post.content;
          imageURL = post.imageURL;
          timestamp = post.timestamp;
          likes = post.likes + 1;
          loves = post.loves;
          reportCount = post.reportCount;
          isHidden = post.isHidden;
        });
        true
      };
      case null { false };
    }
  };

  public shared(msg) func lovePost(postId : Nat) : async Bool {
    if (isBannedUser(msg.caller)) { return false };
    switch (posts.get(postId)) {
      case (?post) {
        if (post.isHidden) { return false };
        var balance = getUserBalance(msg.caller);
        balance := maybeReset(msg.caller, balance);
        if (balance.tokens < TOKENS_PER_LOVE) { return false };
        userBalances.put(msg.caller, {
          tokens = balance.tokens - TOKENS_PER_LOVE;
          postsThisMonth = balance.postsThisMonth;
          postsToday = balance.postsToday;
          lastReset = balance.lastReset;
          lastDailyReset = balance.lastDailyReset;
        });
        let authorBalance = getUserBalance(post.author);
        userBalances.put(post.author, {
          tokens = authorBalance.tokens + 1;
          postsThisMonth = authorBalance.postsThisMonth;
          postsToday = authorBalance.postsToday;
          lastReset = authorBalance.lastReset;
          lastDailyReset = authorBalance.lastDailyReset;
        });
        posts.put(postId, {
          id = post.id;
          author = post.author;
          content = post.content;
          imageURL = post.imageURL;
          timestamp = post.timestamp;
          likes = post.likes;
          loves = post.loves + 1;
          reportCount = post.reportCount;
          isHidden = post.isHidden;
        });
        true
      };
      case null { false };
    }
  };

  public shared(msg) func addComment(postId : Nat, content : Text) : async ?Nat {
    if (isBannedUser(msg.caller)) { return null };
    if (Text.size(content) > MAX_COMMENT_LENGTH) { return null };
    switch (posts.get(postId)) {
      case null { return null };
      case (?p) { if (p.isHidden) { return null } };
    };
    let commentId = nextCommentId;
    nextCommentId += 1;
    comments.put(commentId, {
      id = commentId;
      postId = postId;
      author = msg.caller;
      content = content;
      timestamp = Time.now();
    });
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
