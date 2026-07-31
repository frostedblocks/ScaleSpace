import HashMap "mo:base/HashMap";
import Principal "mo:base/Principal";
import Time "mo:base/Time";
import Nat "mo:base/Nat";
import Nat32 "mo:base/Nat32";
import Int "mo:base/Int";
import Text "mo:base/Text";
import Array "mo:base/Array";
import Iter "mo:base/Iter";
import Buffer "mo:base/Buffer";

persistent actor Ice {

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

  type Limits = {
    freeTierLimit : Nat;
    dailyLimit : Nat;
    tokensPerPost : Nat;
    tokensPerLove : Nat;
    tokensPerMessage : Nat;
    freeMaxLength : Nat;
    paidMaxLength : Nat;
    maxCommentLength : Nat;
    reportsToHide : Nat;
  };

  type SubOffer = {
    tokens : Nat;
    priceE8s : Nat;
    // "label" is reserved in older Motoko (dfx 0.29.x); use tierLabel
    tierLabel : Text;
  };

  type PendingPayment = {
    user : Principal;
    tokens : Nat;
    priceE8s : Nat;
    requestedAt : Time.Time;
  };

  type TreasuryStats = {
    paymentsEnabled : Bool;
    totalIcpReceivedE8s : Nat;
    pendingCount : Nat;
  };

  private stable var nextPostId : Nat = 0;
  private stable var nextCommentId : Nat = 0;
  private stable var nextPendingId : Nat = 0;

  private stable var owner : Principal = Principal.fromText("aaaaa-aa");
  private stable var ownerCloaked : Bool = false;

  // Live-adjustable usage limits
  private stable var freeTierLimit : Nat = 20;
  private stable var dailyLimit : Nat = 5;
  private stable var tokensPerPost : Nat = 5;
  private stable var tokensPerLove : Nat = 2;
  private stable var tokensPerMessage : Nat = 1;
  private stable var freeMaxLength : Nat = 115;
  private stable var paidMaxLength : Nat = 512;
  private stable var maxCommentLength : Nat = 2000;
  private stable var reportsToHide : Nat = 5;
  private stable var tiers : [Nat] = [200, 400, 600];

  // ICP prices (e8s: 100_000_000 e8s = 1 ICP). Master can change live.
  private stable var price200E8s : Nat = 10_000_000;  // 0.10 ICP
  private stable var price400E8s : Nat = 18_000_000;  // 0.18 ICP
  private stable var price600E8s : Nat = 25_000_000;  // 0.25 ICP
  private stable var paymentsEnabled : Bool = false;
  private stable var totalIcpReceivedE8s : Nat = 0;

  private transient var userBalances = HashMap.HashMap<Principal, UserBalance>(0, Principal.equal, Principal.hash);
  private transient var userProfiles = HashMap.HashMap<Principal, UserProfile>(0, Principal.equal, Principal.hash);
  private transient var posts = HashMap.HashMap<Nat, Post>(0, Nat.equal, func (n: Nat) : Nat32 { Nat32.fromNat(n) });
  private transient var comments = HashMap.HashMap<Nat, Comment>(0, Nat.equal, func (n: Nat) : Nat32 { Nat32.fromNat(n) });
  private transient var postComments = HashMap.HashMap<Nat, [Nat]>(0, Nat.equal, func (n: Nat) : Nat32 { Nat32.fromNat(n) });
  private transient var following = HashMap.HashMap<Principal, [Principal]>(0, Principal.equal, Principal.hash);
  private transient var keywordIndex = HashMap.HashMap<Text, [Nat]>(0, Text.equal, Text.hash);
  private transient var reports = HashMap.HashMap<Nat, [Principal]>(0, Nat.equal, func (n: Nat) : Nat32 { Nat32.fromNat(n) });
  private transient var banned = HashMap.HashMap<Principal, Bool>(0, Principal.equal, Principal.hash);
  private transient var pendingPayments = HashMap.HashMap<Nat, PendingPayment>(0, Nat.equal, func (n: Nat) : Nat32 { Nat32.fromNat(n) });
  // One reaction per user per post
  private transient var postLikers = HashMap.HashMap<Nat, [Principal]>(0, Nat.equal, func (n: Nat) : Nat32 { Nat32.fromNat(n) });
  private transient var postLovers = HashMap.HashMap<Nat, [Principal]>(0, Nat.equal, func (n: Nat) : Nat32 { Nat32.fromNat(n) });

  // Sentinel "aaaaa-aa" means unclaimed (not the anonymous principal 2vxsx-fae)
  private func isOwnerUnclaimed() : Bool {
    Principal.isAnonymous(owner) or Principal.equal(owner, Principal.fromText("aaaaa-aa"))
  };

  private func isMaster(p : Principal) : Bool {
    (not isOwnerUnclaimed()) and Principal.equal(owner, p)
  };

  private func isBannedUser(p : Principal) : Bool {
    switch (banned.get(p)) {
      case (?true) { true };
      case _ { false };
    }
  };

  private func principalInList(list : [Principal], p : Principal) : Bool {
    for (x in list.vals()) {
      if (Principal.equal(x, p)) { return true };
    };
    false
  };

  private func priceForTokens(tokenAmount : Nat) : ?Nat {
    if (tokenAmount == 200) { ?price200E8s }
    else if (tokenAmount == 400) { ?price400E8s }
    else if (tokenAmount == 600) { ?price600E8s }
    else { null }
  };

  private func creditTokens(user : Principal, amount : Nat) {
    let bal = getUserBalance(user);
    userBalances.put(user, {
      tokens = bal.tokens + amount;
      postsThisMonth = bal.postsThisMonth;
      postsToday = bal.postsToday;
      lastReset = bal.lastReset;
      lastDailyReset = bal.lastDailyReset;
    });
  };

  private func getUserBalance(user : Principal) : UserBalance {
    switch (userBalances.get(user)) {
      case (?b) { b };
      case null {
        // Starter tokens so new users can try loves / messages without buying first
        let newB : UserBalance = {
          tokens = 50;
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
      let lower = Text.toLowercase(word);
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
    if (not isOwnerUnclaimed()) {
      if (Principal.equal(owner, msg.caller)) {
        return "You already own the master profile";
      };
      return "Master profile already claimed";
    };

    owner := msg.caller;
    ownerCloaked := false;

    userProfiles.put(msg.caller, {
      username = "I.C.E.";
      bio = "Founder of I.C.E. — a quieter place for real conversation.";
      avatarURL = "";
    });

    creditTokens(msg.caller, 1000);
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

  // ─── Tokenomics / ICP pricing ───────────────────────────────────────────

  public query func getSubscriptionOffers() : async [SubOffer] {
    [
      { tokens = 200; priceE8s = price200E8s; tierLabel = "Starter" },
      { tokens = 400; priceE8s = price400E8s; tierLabel = "Regular" },
      { tokens = 600; priceE8s = price600E8s; tierLabel = "Power" },
    ]
  };

  public query func isPaymentsEnabled() : async Bool { paymentsEnabled };

  public shared(msg) func adminSetPaymentsEnabled(enabled : Bool) : async Text {
    if (not isMaster(msg.caller)) { return "Not authorized" };
    paymentsEnabled := enabled;
    if (enabled) { "Payments enabled — free test subscribe is locked" }
    else { "Payments disabled — test subscribe allowed" }
  };

  public shared(msg) func adminSetPrices(p200 : Nat, p400 : Nat, p600 : Nat) : async Text {
    if (not isMaster(msg.caller)) { return "Not authorized" };
    if (p200 == 0 or p400 == 0 or p600 == 0) { return "Prices must be > 0 e8s" };
    price200E8s := p200;
    price400E8s := p400;
    price600E8s := p600;
    "Prices updated"
  };

  public query(msg) func getTreasuryStats() : async TreasuryStats {
    if (not isMaster(msg.caller)) {
      return { paymentsEnabled = false; totalIcpReceivedE8s = 0; pendingCount = 0 };
    };
    {
      paymentsEnabled = paymentsEnabled;
      totalIcpReceivedE8s = totalIcpReceivedE8s;
      pendingCount = pendingPayments.size();
    }
  };

  public query(msg) func getPendingPayments() : async [(Nat, PendingPayment)] {
    if (not isMaster(msg.caller)) { return [] };
    let buf = Buffer.Buffer<(Nat, PendingPayment)>(0);
    for ((id, p) in pendingPayments.entries()) {
      buf.add((id, p));
    };
    Buffer.toArray(buf)
  };

  /// User requests a paid tier. Does not credit tokens until master confirms ICP received.
  public shared(msg) func requestPaidSubscription(tokenAmount : Nat) : async Text {
    if (isBannedUser(msg.caller)) { return "You are banned" };
    if (not paymentsEnabled) {
      return "Payments are not live yet. Use test subscribe or wait for launch.";
    };

    switch (priceForTokens(tokenAmount)) {
      case null { return "Invalid tier. Choose 200, 400, or 600." };
      case (?price) {
        let id = nextPendingId;
        nextPendingId += 1;
        pendingPayments.put(id, {
          user = msg.caller;
          tokens = tokenAmount;
          priceE8s = price;
          requestedAt = Time.now();
        });
        "Request #" # Nat.toText(id) # " recorded. Send " #
          Nat.toText(price) # " e8s ICP (" #
          Nat.toText(tokenAmount) # " tokens). Tokens are added after confirmation."
      };
    }
  };

  /// Master confirms ICP was received and credits tokens.
  public shared(msg) func adminConfirmPayment(pendingId : Nat) : async Text {
    if (not isMaster(msg.caller)) { return "Not authorized" };

    switch (pendingPayments.get(pendingId)) {
      case null { return "Pending payment not found" };
      case (?p) {
        creditTokens(p.user, p.tokens);
        totalIcpReceivedE8s += p.priceE8s;
        pendingPayments.delete(pendingId);
        "Confirmed. Credited " # Nat.toText(p.tokens) # " tokens. Treasury +" #
          Nat.toText(p.priceE8s) # " e8s."
      };
    }
  };

  public shared(msg) func adminRejectPayment(pendingId : Nat) : async Text {
    if (not isMaster(msg.caller)) { return "Not authorized" };
    switch (pendingPayments.get(pendingId)) {
      case null { return "Pending payment not found" };
      case (?_) {
        pendingPayments.delete(pendingId);
        "Pending payment rejected and removed"
      };
    }
  };

  public query func getLimits() : async Limits {
    {
      freeTierLimit = freeTierLimit;
      dailyLimit = dailyLimit;
      tokensPerPost = tokensPerPost;
      tokensPerLove = tokensPerLove;
      tokensPerMessage = tokensPerMessage;
      freeMaxLength = freeMaxLength;
      paidMaxLength = paidMaxLength;
      maxCommentLength = maxCommentLength;
      reportsToHide = reportsToHide;
    }
  };

  public shared(msg) func adminSetLimits(
    freeTierLimit_ : Nat,
    dailyLimit_ : Nat,
    tokensPerPost_ : Nat,
    tokensPerLove_ : Nat,
    tokensPerMessage_ : Nat,
    freeMaxLength_ : Nat,
    paidMaxLength_ : Nat,
    maxCommentLength_ : Nat,
    reportsToHide_ : Nat
  ) : async Text {
    if (not isMaster(msg.caller)) { return "Not authorized" };
    if (freeMaxLength_ == 0 or paidMaxLength_ == 0 or maxCommentLength_ == 0) {
      return "Character limits must be at least 1";
    };
    if (reportsToHide_ == 0) { return "Reports to hide must be at least 1" };

    freeTierLimit := freeTierLimit_;
    dailyLimit := dailyLimit_;
    tokensPerPost := tokensPerPost_;
    tokensPerLove := tokensPerLove_;
    tokensPerMessage := tokensPerMessage_;
    freeMaxLength := freeMaxLength_;
    paidMaxLength := paidMaxLength_;
    maxCommentLength := maxCommentLength_;
    reportsToHide := reportsToHide_;
    "Limits updated"
  };

  public shared(msg) func adminGrantTokens(to : Principal, amount : Nat) : async Bool {
    if (not isMaster(msg.caller)) { return false };
    if (amount == 0) { return true };
    creditTokens(to, amount);
    true
  };

  public shared(msg) func adminHidePost(postId : Nat) : async Bool {
    if (not isMaster(msg.caller)) { return false };
    switch (posts.get(postId)) {
      case null { false };
      case (?post) {
        posts.put(postId, {
          id = post.id; author = post.author; content = post.content; imageURL = post.imageURL;
          timestamp = post.timestamp; likes = post.likes; loves = post.loves;
          reportCount = post.reportCount; isHidden = true;
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
          id = post.id; author = post.author; content = post.content; imageURL = post.imageURL;
          timestamp = post.timestamp; likes = post.likes; loves = post.loves;
          reportCount = 0; isHidden = false;
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

  public query func isBanned(user : Principal) : async Bool { isBannedUser(user) };

  public query(msg) func getBannedUsers() : async [Principal] {
    if (not isMaster(msg.caller)) { return [] };
    let buf = Buffer.Buffer<Principal>(0);
    for ((p, flag) in banned.entries()) {
      if (flag) { buf.add(p) };
    };
    Buffer.toArray(buf)
  };

  public query(msg) func getSiteStats() : async SiteStats {
    if (not isMaster(msg.caller)) {
      return {
        totalPosts = 0; visiblePosts = 0; hiddenPosts = 0; totalComments = 0;
        totalProfiles = 0; totalBalances = 0; reportedPosts = 0; totalReportFlags = 0;
        bannedUsers = 0; tokensInCirculation = 0;
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
      if (post.reportCount > 0 or post.isHidden) { buf.add(post) };
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

  /// Test-mode free subscribe. Locked when payments are enabled (except master).
  public shared(msg) func subscribe(tokenAmount : Nat) : async Text {
    if (isBannedUser(msg.caller)) { return "You are banned" };
    if (paymentsEnabled and not isMaster(msg.caller)) {
      return "Payments are live. Use requestPaidSubscription instead.";
    };
    switch (priceForTokens(tokenAmount)) {
      case null {
        if (not isMaster(msg.caller)) { return "Invalid tier" };
      };
      case (?_) {};
    };
    creditTokens(msg.caller, tokenAmount);
    "Added " # Nat.toText(tokenAmount) # " tokens"
  };

  private func spendTokensInternal(user : Principal, amount : Nat) : Bool {
    if (amount == 0) { return true };
    var balance = getUserBalance(user);
    balance := maybeReset(user, balance);
    if (balance.tokens < amount) { return false };
    userBalances.put(user, {
      tokens = balance.tokens - amount;
      postsThisMonth = balance.postsThisMonth;
      postsToday = balance.postsToday;
      lastReset = balance.lastReset;
      lastDailyReset = balance.lastDailyReset;
    });
    true
  };

  public shared(msg) func spendTokens(amount : Nat) : async Bool {
    if (isBannedUser(msg.caller)) { return false };
    spendTokensInternal(msg.caller, amount)
  };

  /// Charge for a DM. Free for master, and free while payments are off (test mode).
  public shared(msg) func chargeForMessage() : async Bool {
    if (isBannedUser(msg.caller)) { return false };
    if (isMaster(msg.caller)) { return true };
    if (not paymentsEnabled) { return true };
    spendTokensInternal(msg.caller, tokensPerMessage)
  };

  public query func getTokensPerMessage() : async Nat { tokensPerMessage };

  public query func isMessagingFree() : async Bool {
    not paymentsEnabled
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
          isFreeTier = current.postsThisMonth < freeTierLimit;
        }
      };
      case null { null };
    }
  };

  public query func getTiers() : async [Nat] { tiers };

  public shared(msg) func makePost(content : Text, imageURL : ?Text) : async ?Nat {
    if (isBannedUser(msg.caller)) { return null };
    var balance = getUserBalance(msg.caller);
    balance := maybeReset(msg.caller, balance);
    let master = isMaster(msg.caller);
    let isFree = balance.postsThisMonth < freeTierLimit;
    let maxLength = if (master or not isFree) { paidMaxLength } else { freeMaxLength };
    if (Text.size(content) > maxLength) { return null };
    if (not master) {
      if (balance.postsToday >= dailyLimit) { return null };
      if (not isFree and balance.tokens < tokensPerPost) { return null };
    };
    let postId = nextPostId;
    nextPostId += 1;
    posts.put(postId, {
      id = postId; author = msg.caller; content = content; imageURL = imageURL;
      timestamp = Time.now(); likes = 0; loves = 0; reportCount = 0; isHidden = false;
    });
    indexPost(postId, content);
    let newTokens = if (master or isFree) { balance.tokens } else { balance.tokens - tokensPerPost };
    userBalances.put(msg.caller, {
      tokens = newTokens;
      postsThisMonth = balance.postsThisMonth + 1;
      postsToday = balance.postsToday + 1;
      lastReset = balance.lastReset;
      lastDailyReset = balance.lastDailyReset;
    });
    ?postId
  };

  /// Author can update post text (and optional image URL). Respects length limits.
  public shared(msg) func editPost(postId : Nat, content : Text, imageURL : ?Text) : async Text {
    if (isBannedUser(msg.caller)) { return "You are banned" };
    if (Text.size(content) == 0) { return "Content cannot be empty" };
    switch (posts.get(postId)) {
      case null { return "Post not found" };
      case (?post) {
        if (not Principal.equal(post.author, msg.caller)) {
          return "Only the author can edit this post";
        };
        if (post.isHidden) { return "Cannot edit a hidden post" };
        var balance = getUserBalance(msg.caller);
        balance := maybeReset(msg.caller, balance);
        let master = isMaster(msg.caller);
        let isFree = balance.postsThisMonth < freeTierLimit;
        let maxLength = if (master or not isFree) { paidMaxLength } else { freeMaxLength };
        if (Text.size(content) > maxLength) {
          return "Post is too long for your tier";
        };
        posts.put(postId, {
          id = post.id;
          author = post.author;
          content = content;
          imageURL = imageURL;
          timestamp = post.timestamp;
          likes = post.likes;
          loves = post.loves;
          reportCount = post.reportCount;
          isHidden = post.isHidden;
        });
        // Re-index new words (old keyword entries may remain; search skips missing posts)
        indexPost(postId, content);
        "Post updated"
      };
    }
  };

  /// Author can permanently remove their post. Master can also delete any post.
  public shared(msg) func deletePost(postId : Nat) : async Text {
    if (isBannedUser(msg.caller)) { return "You are banned" };
    switch (posts.get(postId)) {
      case null { return "Post not found" };
      case (?post) {
        let authorOk = Principal.equal(post.author, msg.caller);
        let masterOk = isMaster(msg.caller);
        if (not authorOk and not masterOk) {
          return "Only the author or master can delete this post";
        };
        posts.delete(postId);
        postLikers.delete(postId);
        postLovers.delete(postId);
        reports.delete(postId);
        // Drop comment index for this post (comment records may remain orphaned)
        postComments.delete(postId);
        "Post deleted"
      };
    }
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
          if (not p.isHidden and Principal.equal(p.author, author)) { buf.add(p) };
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
              if (Principal.equal(r, msg.caller)) { return "You already reported this post" };
            };
            let newReporters = Array.append(reporters, [msg.caller]);
            reports.put(postId, newReporters);
            let newCount = newReporters.size();
            let shouldHide = newCount >= reportsToHide;
            posts.put(postId, {
              id = post.id; author = post.author; content = post.content; imageURL = post.imageURL;
              timestamp = post.timestamp; likes = post.likes; loves = post.loves;
              reportCount = newCount; isHidden = shouldHide;
            });
            if (shouldHide) { return "Post has been hidden due to multiple reports" }
            else { return "Report submitted. Thank you." }
          };
          case null {
            reports.put(postId, [msg.caller]);
            posts.put(postId, {
              id = post.id; author = post.author; content = post.content; imageURL = post.imageURL;
              timestamp = post.timestamp; likes = post.likes; loves = post.loves;
              reportCount = 1; isHidden = false;
            });
            return "Report submitted. Thank you.";
          };
        }
      };
    }
  };

  public query func hasLiked(postId : Nat, user : Principal) : async Bool {
    switch (postLikers.get(postId)) {
      case (?list) { principalInList(list, user) };
      case null { false };
    }
  };

  public query func hasLoved(postId : Nat, user : Principal) : async Bool {
    switch (postLovers.get(postId)) {
      case (?list) { principalInList(list, user) };
      case null { false };
    }
  };

  public shared(msg) func likePost(postId : Nat) : async Bool {
    if (isBannedUser(msg.caller)) { return false };
    switch (posts.get(postId)) {
      case (?post) {
        if (post.isHidden) { return false };
        // Already liked — do not increment again
        switch (postLikers.get(postId)) {
          case (?list) {
            if (principalInList(list, msg.caller)) { return false };
            postLikers.put(postId, Array.append(list, [msg.caller]));
          };
          case null {
            postLikers.put(postId, [msg.caller]);
          };
        };
        posts.put(postId, {
          id = post.id; author = post.author; content = post.content; imageURL = post.imageURL;
          timestamp = post.timestamp; likes = post.likes + 1; loves = post.loves;
          reportCount = post.reportCount; isHidden = post.isHidden;
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
        // Already loved — do not charge tokens or increment again
        switch (postLovers.get(postId)) {
          case (?list) {
            if (principalInList(list, msg.caller)) { return false };
          };
          case null {};
        };
        var balance = getUserBalance(msg.caller);
        balance := maybeReset(msg.caller, balance);
        if (balance.tokens < tokensPerLove) { return false };
        userBalances.put(msg.caller, {
          tokens = balance.tokens - tokensPerLove;
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
        switch (postLovers.get(postId)) {
          case (?list) { postLovers.put(postId, Array.append(list, [msg.caller])); };
          case null { postLovers.put(postId, [msg.caller]); };
        };
        posts.put(postId, {
          id = post.id; author = post.author; content = post.content; imageURL = post.imageURL;
          timestamp = post.timestamp; likes = post.likes; loves = post.loves + 1;
          reportCount = post.reportCount; isHidden = post.isHidden;
        });
        true
      };
      case null { false };
    }
  };

  public shared(msg) func addComment(postId : Nat, content : Text) : async ?Nat {
    if (isBannedUser(msg.caller)) { return null };
    if (Text.size(content) > maxCommentLength) { return null };
    switch (posts.get(postId)) {
      case null { return null };
      case (?p) { if (p.isHidden) { return null } };
    };
    let commentId = nextCommentId;
    nextCommentId += 1;
    comments.put(commentId, {
      id = commentId; postId = postId; author = msg.caller; content = content; timestamp = Time.now();
    });
    switch (postComments.get(postId)) {
      case (?list) { postComments.put(postId, Array.append(list, [commentId])); };
      case null { postComments.put(postId, [commentId]); };
    };
    ?commentId
  };

  /// Author can edit their comment text.
  public shared(msg) func editComment(commentId : Nat, content : Text) : async Text {
    if (isBannedUser(msg.caller)) { return "You are banned" };
    if (Text.size(content) == 0) { return "Content cannot be empty" };
    if (Text.size(content) > maxCommentLength) { return "Comment is too long" };
    switch (comments.get(commentId)) {
      case null { return "Comment not found" };
      case (?c) {
        if (not Principal.equal(c.author, msg.caller)) {
          return "Only the author can edit this comment";
        };
        comments.put(commentId, {
          id = c.id;
          postId = c.postId;
          author = c.author;
          content = content;
          timestamp = c.timestamp;
        });
        "Comment updated"
      };
    }
  };

  /// Author or master can delete a comment.
  public shared(msg) func deleteComment(commentId : Nat) : async Text {
    if (isBannedUser(msg.caller)) { return "You are banned" };
    switch (comments.get(commentId)) {
      case null { return "Comment not found" };
      case (?c) {
        let authorOk = Principal.equal(c.author, msg.caller);
        let masterOk = isMaster(msg.caller);
        if (not authorOk and not masterOk) {
          return "Only the author or master can delete this comment";
        };
        comments.delete(commentId);
        // Remove id from post's comment list
        switch (postComments.get(c.postId)) {
          case (?ids) {
            let buf = Buffer.Buffer<Nat>(0);
            for (id in ids.vals()) {
              if (id != commentId) { buf.add(id) };
            };
            postComments.put(c.postId, Buffer.toArray(buf));
          };
          case null {};
        };
        "Comment deleted"
      };
    }
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
    let lower = Text.toLowercase(keyword);
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
