/**
 * CollabSpace Post Service — Post, Comment, Reaction CRUD + Batch Endpoint
 *
 * Manages posts, comments, and reactions on collaboration boards in the
 * external CollabSpace spreadsheet. Uses CollabConfigService.gs helpers
 * for all external sheet operations and CollabBoardService.gs for
 * access validation and activity logging.
 *
 * @version 1.0.0
 */

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_POST_CONTENT_ = 2000;
const MAX_COMMENT_CONTENT_ = 1000;
const MAX_LINK_URL_ = 500;
const MAX_LINK_LABEL_ = 100;

const VALID_COLOR_TAGS_ = ['yellow', 'blue', 'green', 'pink', 'purple', 'orange', 'gray'];
const VALID_CONTENT_TYPES_ = ['text', 'link', 'image'];
const VALID_REACTION_TYPES_ = ['thumbsup', 'heart', 'lightbulb', 'clap', 'check'];


// ============================================================================
// BATCH ENDPOINT
// ============================================================================

/**
 * Get all data for a board in a single RPC call.
 * Returns board, posts, comments, reactions, and the caller's membership role.
 *
 * Visibility rules:
 * - Posts with isDeleted='true' are excluded
 * - If board.postApproval='required' AND user is member/viewer, only show
 *   posts where isApproved='true' OR authorEmail matches the current user
 * - When board.allowAnonymous=true, strip authorEmail and set
 *   authorName='Anonymous' for other users' posts
 *
 * @param {string} boardId
 * @returns {Object} { board, posts, comments, reactions, memberRole }
 */
function getBoardData(boardId) {
  const user = getCurrentUser();
  const email = user.email.toLowerCase();
  if (!boardId) throw new Error('Board ID is required.');

  // Validate access and get board
  const boardRows = findCollabRows_('CollabBoards', 'boardId', boardId);
  if (boardRows.length === 0) throw new Error('Board not found.');
  const b = boardRows[0];

  const memberRole = validateBoardAccess_(boardId, email, user.isAdmin);

  const board = {
    boardId: String(b.boardId),
    title: b.title || '',
    description: b.description || '',
    boardType: b.boardType || 'freeform',
    layoutMode: b.layoutMode || 'wall',
    mapId: b.mapId || '',
    hexId: b.hexId || '',
    classId: b.classId || '',
    courseId: b.courseId || '',
    createdBy: b.createdBy || '',
    isArchived: String(b.isArchived) === 'true',
    allowAnonymous: String(b.allowAnonymous) === 'true',
    postApproval: b.postApproval || 'none',
    maxPostsPerStudent: parseInt(b.maxPostsPerStudent, 10) || 0,
    defaultColumnsJson: b.defaultColumnsJson || '',
    createdAt: b.createdAt || '',
    updatedAt: b.updatedAt || '',
    memberRole: memberRole
  };

  const isModeratorPlus = (memberRole === 'owner' || memberRole === 'moderator');
  const requiresApproval = board.postApproval === 'required';

  // Read posts, comments, reactions once each
  const allPosts = findCollabRows_('CollabPosts', 'boardId', boardId);
  const allComments = findCollabRows_('CollabComments', 'boardId', boardId);
  const allReactions = findCollabRows_('CollabReactions', 'boardId', boardId);

  // Filter and transform posts
  const posts = [];
  for (let i = 0; i < allPosts.length; i++) {
    const p = allPosts[i];

    // Exclude deleted
    if (String(p.isDeleted) === 'true') continue;

    // Approval visibility: if approval required and user is not moderator+,
    // only show approved posts or the user's own posts
    if (requiresApproval && !isModeratorPlus) {
      if (String(p.isApproved) !== 'true' &&
          String(p.authorEmail).toLowerCase() !== email) {
        continue;
      }
    }

    const post = {
      postId: String(p.postId),
      boardId: String(p.boardId),
      authorEmail: String(p.authorEmail || ''),
      authorName: p.authorName || '',
      contentText: p.contentText || '',
      contentType: p.contentType || 'text',
      attachmentUrl: p.attachmentUrl || '',
      attachmentLabel: p.attachmentLabel || '',
      linkUrl: p.linkUrl || '',
      linkLabel: p.linkLabel || '',
      columnLabel: p.columnLabel || '',
      sortOrder: parseInt(p.sortOrder, 10) || 0,
      colorTag: p.colorTag || '',
      isPinned: String(p.isPinned) === 'true',
      isApproved: String(p.isApproved) === 'true',
      isDeleted: false,
      createdAt: p.createdAt || '',
      updatedAt: p.updatedAt || ''
    };

    // Anonymous handling: strip email for other users' posts
    if (board.allowAnonymous &&
        post.authorName === 'Anonymous' &&
        post.authorEmail.toLowerCase() !== email) {
      post.authorEmail = '';
    }

    posts.push(post);
  }

  // Filter comments (exclude deleted)
  const comments = [];
  for (let i = 0; i < allComments.length; i++) {
    const c = allComments[i];
    if (String(c.isDeleted) === 'true') continue;

    const comment = {
      commentId: String(c.commentId),
      postId: String(c.postId),
      boardId: String(c.boardId),
      authorEmail: String(c.authorEmail || ''),
      authorName: c.authorName || '',
      contentText: c.contentText || '',
      isDeleted: false,
      createdAt: c.createdAt || '',
      updatedAt: c.updatedAt || '',
      replyToCommentId: c.replyToCommentId || ''
    };

    // Anonymous handling for comments
    if (board.allowAnonymous &&
        comment.authorName === 'Anonymous' &&
        comment.authorEmail.toLowerCase() !== email) {
      comment.authorEmail = '';
    }

    comments.push(comment);
  }

  // Filter reactions (exclude removed)
  const reactions = [];
  for (let i = 0; i < allReactions.length; i++) {
    const r = allReactions[i];
    if (String(r.isRemoved) === 'true') continue;

    reactions.push({
      reactionId: String(r.reactionId),
      postId: String(r.postId),
      boardId: String(r.boardId),
      authorEmail: String(r.authorEmail || ''),
      reactionType: r.reactionType || '',
      createdAt: r.createdAt || ''
    });
  }

  return {
    board: board,
    posts: posts,
    comments: comments,
    reactions: reactions,
    memberRole: memberRole
  };
}


// ============================================================================
// POST CRUD
// ============================================================================

/**
 * Create a new post on a board.
 * Requires member+ access.
 *
 * @param {string} boardId
 * @param {Object} postData - { contentText, contentType, linkUrl, linkLabel, colorTag, columnLabel, anonymous }
 * @returns {Object} created post
 */
function createPost(boardId, postData) {
  const user = getCurrentUser();
  const email = user.email.toLowerCase();
  if (!boardId) throw new Error('Board ID is required.');
  if (!postData) throw new Error('Post data is required.');

  // Validate board access
  const role = validateBoardAccess_(boardId, email, user.isAdmin);
  if (role === 'viewer') throw new Error('Viewers cannot create posts.');

  // Get board for settings
  const boardRows = findCollabRows_('CollabBoards', 'boardId', boardId);
  if (boardRows.length === 0) throw new Error('Board not found.');
  const board = boardRows[0];

  // Enforce maxPostsPerStudent (0 = unlimited)
  const maxPosts = parseInt(board.maxPostsPerStudent, 10) || 0;
  if (maxPosts > 0 && role !== 'owner' && role !== 'moderator') {
    const count = countUserPosts_(boardId, email);
    if (count >= maxPosts) {
      throw new Error('You have reached the maximum of ' + maxPosts + ' post(s) on this board.');
    }
  }

  // Validate content
  const contentText = sanitizePostContent_(postData.contentText, MAX_POST_CONTENT_);
  if (!contentText) throw new Error('Post content is required.');

  // Validate content type
  const contentType = (postData.contentType && VALID_CONTENT_TYPES_.indexOf(postData.contentType) !== -1)
    ? postData.contentType : 'text';

  // Validate link URL (if provided)
  let linkUrl = '';
  let linkLabel = '';
  if (postData.linkUrl) {
    linkUrl = String(postData.linkUrl).trim();
    if (linkUrl.length > MAX_LINK_URL_) throw new Error('Link URL is too long (max ' + MAX_LINK_URL_ + ' chars).');
    if (linkUrl && !linkUrl.match(/^https?:\/\//i)) throw new Error('Link URL must start with http:// or https://.');
    linkLabel = postData.linkLabel ? String(postData.linkLabel).trim().substring(0, MAX_LINK_LABEL_) : '';
  }

  // Validate color tag
  const colorTag = (postData.colorTag && VALID_COLOR_TAGS_.indexOf(postData.colorTag) !== -1)
    ? postData.colorTag : '';

  // Column label (for columns layout)
  const columnLabel = postData.columnLabel ? String(postData.columnLabel).trim().substring(0, 100) : '';

  // Post approval: auto-approve for moderators/owners, or if approval not required
  const requiresApproval = String(board.postApproval) === 'required';
  const isModeratorPlus = (role === 'owner' || role === 'moderator');
  const isApproved = (!requiresApproval || isModeratorPlus) ? 'true' : 'false';

  // Anonymous handling
  const wantsAnonymous = postData.anonymous === true && String(board.allowAnonymous) === 'true';
  const authorName = wantsAnonymous ? 'Anonymous' : (user.name || email);

  const postId = generatePostId_();
  const timestamp = now_();

  const postRow = {
    postId: postId,
    boardId: boardId,
    authorEmail: email, // Always store real email server-side
    authorName: authorName,
    contentText: contentText,
    contentType: contentType,
    attachmentUrl: '',
    attachmentLabel: '',
    linkUrl: linkUrl,
    linkLabel: linkLabel,
    columnLabel: columnLabel,
    sortOrder: 0,
    colorTag: colorTag,
    isPinned: 'false',
    isApproved: isApproved,
    isDeleted: 'false',
    createdAt: timestamp,
    updatedAt: timestamp
  };

  appendCollabRow_('CollabPosts', postRow);

  logCollabActivity_(boardId, email, 'post_created', postId, 'post', '');

  return {
    postId: postId,
    boardId: boardId,
    authorEmail: wantsAnonymous ? '' : email,
    authorName: authorName,
    contentText: contentText,
    contentType: contentType,
    linkUrl: linkUrl,
    linkLabel: linkLabel,
    columnLabel: columnLabel,
    colorTag: colorTag,
    isPinned: false,
    isApproved: isApproved === 'true',
    createdAt: timestamp,
    updatedAt: timestamp
  };
}


/**
 * Update an existing post.
 * Post author or board owner/moderator.
 * Updatable fields: contentText, colorTag, columnLabel, linkUrl, linkLabel.
 * isPinned: moderator+ only.
 *
 * @param {string} postId
 * @param {Object} updates - fields to update
 * @returns {Object} { success: true }
 */
function updatePost(postId, updates) {
  const user = getCurrentUser();
  const email = user.email.toLowerCase();
  if (!postId) throw new Error('Post ID is required.');
  if (!updates) throw new Error('Updates are required.');

  const access = validatePostAccess_(postId, email, user.isAdmin);
  const isAuthor = access.isAuthor;
  const isModeratorPlus = access.isModeratorPlus;

  if (!isAuthor && !isModeratorPlus) {
    throw new Error('You can only edit your own posts or moderate as an owner/moderator.');
  }

  const safeUpdates = {};
  safeUpdates.updatedAt = now_();

  if (updates.contentText !== undefined) {
    safeUpdates.contentText = sanitizePostContent_(updates.contentText, MAX_POST_CONTENT_);
  }
  if (updates.colorTag !== undefined) {
    safeUpdates.colorTag = (VALID_COLOR_TAGS_.indexOf(updates.colorTag) !== -1) ? updates.colorTag : '';
  }
  if (updates.columnLabel !== undefined) {
    safeUpdates.columnLabel = String(updates.columnLabel).trim().substring(0, 100);
  }
  if (updates.linkUrl !== undefined) {
    const url = String(updates.linkUrl).trim();
    if (url && !url.match(/^https?:\/\//i)) throw new Error('Link URL must start with http:// or https://.');
    if (url.length > MAX_LINK_URL_) throw new Error('Link URL is too long.');
    safeUpdates.linkUrl = url;
  }
  if (updates.linkLabel !== undefined) {
    safeUpdates.linkLabel = String(updates.linkLabel).trim().substring(0, MAX_LINK_LABEL_);
  }
  // isPinned: moderator+ only
  if (updates.isPinned !== undefined && isModeratorPlus) {
    safeUpdates.isPinned = updates.isPinned ? 'true' : 'false';
  }

  updateCollabRow_('CollabPosts', 'postId', postId, safeUpdates);

  logCollabActivity_(access.boardId, email, 'post_updated', postId, 'post', '');

  return { success: true };
}


/**
 * Soft-delete a post.
 * Post author or board owner/moderator.
 *
 * @param {string} postId
 * @returns {Object} { success: true }
 */
function deletePost(postId) {
  const user = getCurrentUser();
  const email = user.email.toLowerCase();
  if (!postId) throw new Error('Post ID is required.');

  const access = validatePostAccess_(postId, email, user.isAdmin);
  if (!access.isAuthor && !access.isModeratorPlus) {
    throw new Error('You can only delete your own posts or moderate as an owner/moderator.');
  }

  updateCollabRow_('CollabPosts', 'postId', postId, {
    isDeleted: 'true',
    updatedAt: now_()
  });

  logCollabActivity_(access.boardId, email, 'post_deleted', postId, 'post', '');

  return { success: true };
}


/**
 * Approve a pending post.
 * Owner/moderator only.
 *
 * @param {string} postId
 * @returns {Object} { success: true }
 */
function approvePost(postId) {
  const user = getCurrentUser();
  const email = user.email.toLowerCase();
  if (!postId) throw new Error('Post ID is required.');

  const access = validatePostAccess_(postId, email, user.isAdmin);
  if (!access.isModeratorPlus) {
    throw new Error('Only board owners and moderators can approve posts.');
  }

  updateCollabRow_('CollabPosts', 'postId', postId, {
    isApproved: 'true',
    updatedAt: now_()
  });

  logCollabActivity_(access.boardId, email, 'post_approved', postId, 'post', '');

  return { success: true };
}


/**
 * Toggle pin status on a post.
 * Owner/moderator only.
 *
 * @param {string} postId
 * @returns {Object} { success: true, isPinned: boolean }
 */
function pinPost(postId) {
  const user = getCurrentUser();
  const email = user.email.toLowerCase();
  if (!postId) throw new Error('Post ID is required.');

  const access = validatePostAccess_(postId, email, user.isAdmin);
  if (!access.isModeratorPlus) {
    throw new Error('Only board owners and moderators can pin posts.');
  }

  const newPinned = String(access.post.isPinned) !== 'true';

  updateCollabRow_('CollabPosts', 'postId', postId, {
    isPinned: newPinned ? 'true' : 'false',
    updatedAt: now_()
  });

  logCollabActivity_(access.boardId, email, newPinned ? 'post_pinned' : 'post_unpinned', postId, 'post', '');

  return { success: true, isPinned: newPinned };
}


// ============================================================================
// COMMENT CRUD
// ============================================================================

/**
 * Create a comment on a post.
 * Requires member+ access to the board.
 *
 * @param {string} boardId
 * @param {string} postId
 * @param {string} contentText
 * @param {boolean} [anonymous] - opt-in anonymous (only works if board allows it)
 * @returns {Object} created comment
 */
function createComment(boardId, postId, contentText, anonymous) {
  const user = getCurrentUser();
  const email = user.email.toLowerCase();
  if (!boardId) throw new Error('Board ID is required.');
  if (!postId) throw new Error('Post ID is required.');

  // Validate board access
  const role = validateBoardAccess_(boardId, email, user.isAdmin);
  if (role === 'viewer') throw new Error('Viewers cannot comment.');

  // Validate post exists and is not deleted
  const posts = findCollabRows_('CollabPosts', 'postId', postId);
  if (posts.length === 0) throw new Error('Post not found.');
  if (String(posts[0].isDeleted) === 'true') throw new Error('Cannot comment on a deleted post.');
  if (String(posts[0].boardId) !== String(boardId)) throw new Error('Post does not belong to this board.');

  // Validate content
  const text = sanitizePostContent_(contentText, MAX_COMMENT_CONTENT_);
  if (!text) throw new Error('Comment text is required.');

  // Get board for anonymous check — opt-in only (matching createPost pattern)
  const boardRows = findCollabRows_('CollabBoards', 'boardId', boardId);
  const board = boardRows.length > 0 ? boardRows[0] : {};
  const wantsAnonymous = anonymous === true && String(board.allowAnonymous) === 'true';
  const authorName = wantsAnonymous ? 'Anonymous' : (user.name || email);

  const commentId = generateCommentId_();
  const timestamp = now_();

  const commentRow = {
    commentId: commentId,
    postId: postId,
    boardId: boardId,
    authorEmail: email,
    authorName: authorName,
    contentText: text,
    isDeleted: 'false',
    createdAt: timestamp,
    updatedAt: timestamp,
    replyToCommentId: ''
  };

  appendCollabRow_('CollabComments', commentRow);

  logCollabActivity_(boardId, email, 'comment_created', commentId, 'comment', JSON.stringify({ postId: postId }));

  return {
    commentId: commentId,
    postId: postId,
    boardId: boardId,
    authorEmail: email,
    authorName: authorName,
    contentText: text,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}


/**
 * Soft-delete a comment.
 * Comment author or board owner/moderator.
 *
 * @param {string} commentId
 * @returns {Object} { success: true }
 */
function deleteComment(commentId) {
  const user = getCurrentUser();
  const email = user.email.toLowerCase();
  if (!commentId) throw new Error('Comment ID is required.');

  // Find the comment
  const comments = findCollabRows_('CollabComments', 'commentId', commentId);
  if (comments.length === 0) throw new Error('Comment not found.');
  const comment = comments[0];

  const boardId = String(comment.boardId);
  const isAuthor = String(comment.authorEmail).toLowerCase() === email;

  // Check moderator access if not author
  let isModeratorPlus = false;
  if (!isAuthor) {
    const role = validateBoardAccess_(boardId, email, user.isAdmin);
    isModeratorPlus = (role === 'owner' || role === 'moderator');
    if (!isModeratorPlus) {
      throw new Error('You can only delete your own comments or moderate as an owner/moderator.');
    }
  }

  updateCollabRow_('CollabComments', 'commentId', commentId, {
    isDeleted: 'true',
    updatedAt: now_()
  });

  logCollabActivity_(boardId, email, 'comment_deleted', commentId, 'comment', '');

  return { success: true };
}


// ============================================================================
// REACTION TOGGLE
// ============================================================================

/**
 * Toggle a reaction on a post.
 * If the user has an active reaction of the same type, removes it.
 * Otherwise, adds a new reaction.
 *
 * @param {string} boardId
 * @param {string} postId
 * @param {string} reactionType - one of VALID_REACTION_TYPES_
 * @returns {Object} { action: 'added'|'removed' }
 */
function toggleReaction(boardId, postId, reactionType) {
  const user = getCurrentUser();
  const email = user.email.toLowerCase();
  if (!boardId) throw new Error('Board ID is required.');
  if (!postId) throw new Error('Post ID is required.');

  // Validate reaction type
  if (VALID_REACTION_TYPES_.indexOf(reactionType) === -1) {
    throw new Error('Invalid reaction type. Valid types: ' + VALID_REACTION_TYPES_.join(', '));
  }

  // Validate board access
  const role = validateBoardAccess_(boardId, email, user.isAdmin);
  if (role === 'viewer') throw new Error('Viewers cannot react to posts.');

  // Check for existing non-removed reaction by this user+type on this post
  const allReactions = findCollabRows_('CollabReactions', 'postId', postId);
  let existingReaction = null;

  for (let i = 0; i < allReactions.length; i++) {
    const r = allReactions[i];
    if (String(r.authorEmail).toLowerCase() === email &&
        String(r.reactionType) === reactionType &&
        String(r.isRemoved) !== 'true') {
      existingReaction = r;
      break;
    }
  }

  if (existingReaction) {
    // Remove existing reaction
    updateCollabRow_('CollabReactions', 'reactionId', String(existingReaction.reactionId), {
      isRemoved: 'true'
    });
    return { action: 'removed' };
  } else {
    // Add new reaction
    const reactionId = generateReactionId_();
    appendCollabRow_('CollabReactions', {
      reactionId: reactionId,
      postId: postId,
      boardId: boardId,
      authorEmail: email,
      reactionType: reactionType,
      createdAt: now_(),
      isRemoved: 'false'
    });
    return { action: 'added' };
  }
}


// ============================================================================
// PRIVATE HELPERS
// ============================================================================

/**
 * Count non-deleted posts by a user on a board.
 *
 * @param {string} boardId
 * @param {string} email - lowercase
 * @returns {number}
 * @private
 */
function countUserPosts_(boardId, email) {
  const posts = findCollabRows_('CollabPosts', 'boardId', boardId);
  let count = 0;
  for (let i = 0; i < posts.length; i++) {
    if (String(posts[i].authorEmail).toLowerCase() === email &&
        String(posts[i].isDeleted) !== 'true') {
      count++;
    }
  }
  return count;
}


/**
 * Validate access to a post and resolve board membership.
 * Returns post, board ID, and access flags.
 *
 * @param {string} postId
 * @param {string} email - lowercase
 * @param {boolean} isAdmin
 * @returns {Object} { post, boardId, isAuthor, isModeratorPlus }
 * @private
 */
function validatePostAccess_(postId, email, isAdmin) {
  const posts = findCollabRows_('CollabPosts', 'postId', postId);
  if (posts.length === 0) throw new Error('Post not found.');
  const post = posts[0];

  if (String(post.isDeleted) === 'true') throw new Error('This post has been deleted.');

  const boardId = String(post.boardId);
  const isAuthor = String(post.authorEmail).toLowerCase() === email;

  const role = validateBoardAccess_(boardId, email, isAdmin);
  const isModeratorPlus = (role === 'owner' || role === 'moderator');

  return {
    post: post,
    boardId: boardId,
    isAuthor: isAuthor,
    isModeratorPlus: isModeratorPlus
  };
}


/**
 * Sanitize and trim post/comment content.
 *
 * @param {string} text - raw input
 * @param {number} maxLen - maximum character length
 * @returns {string} trimmed text (may be empty)
 * @private
 */
function sanitizePostContent_(text, maxLen) {
  if (!text || typeof text !== 'string') return '';
  return text.trim().substring(0, maxLen);
}
