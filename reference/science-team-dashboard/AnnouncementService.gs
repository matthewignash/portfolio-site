/**
 * AnnouncementService.gs
 * Backend logic for the Announcements Feed.
 * Manages Posts tab: create, edit, delete, pin/unpin.
 */

const AnnouncementService = (function() {

  const SHEET = 'Posts';

  /**
   * Get all posts, sorted: pinned first, then newest first.
   * @returns {Array<Object>}
   */
  function getPosts() {
    try {
      const posts = DataService.getSheetData(SHEET);
      // Sort: pinned first, then by timestamp descending
      posts.sort((a, b) => {
        const aPinned = a.Pinned === true || a.Pinned === 'TRUE';
        const bPinned = b.Pinned === true || b.Pinned === 'TRUE';
        if (aPinned && !bPinned) return -1;
        if (!aPinned && bPinned) return 1;
        return (b.Timestamp || '').localeCompare(a.Timestamp || '');
      });
      return posts;
    } catch (error) {
      logError('getPosts', error);
      throw new Error(error.message);
    }
  }

  /**
   * Create a new post.
   * @param {string} message
   * @param {string} category
   * @returns {Object} the created post
   */
  function createPost(message, category, eventDate, eventTime) {
    try {
      if (!message || message.trim().length === 0) {
        throw new Error('Post cannot be empty.');
      }
      const maxLen = parseInt(DataService.getConfigValue('MaxPostLength') || '500');
      if (message.length > maxLen) {
        throw new Error('Message exceeds ' + maxLen + ' characters.');
      }
      const user = getCurrentUser();
      const post = {
        PostId: generateId('post_'),
        Author: user.email,
        AuthorName: user.name,
        Message: message.trim(),
        Category: category || 'General',
        Timestamp: new Date().toISOString(),
        Pinned: false,
        Edited: false,
        EditedTimestamp: '',
        EventDate: eventDate || '',
        EventTime: eventTime || ''
      };
      DataService.appendRow(SHEET, post);
      return post;
    } catch (error) {
      logError('createPost', error);
      throw new Error(error.message);
    }
  }

  /**
   * Edit an existing post. Only the author or an admin can edit.
   * @param {string} postId
   * @param {string} message
   * @returns {Object} the updated post
   */
  function editPost(postId, message) {
    try {
      if (!message || message.trim().length === 0) {
        throw new Error('Post cannot be empty.');
      }
      const maxLen = parseInt(DataService.getConfigValue('MaxPostLength') || '500');
      if (message.length > maxLen) {
        throw new Error('Message exceeds ' + maxLen + ' characters.');
      }
      const user = getCurrentUser();
      const data = DataService.getSheetData(SHEET);
      const idx = data.findIndex(p => p.PostId === postId);
      if (idx === -1) throw new Error('Post not found.');

      const post = data[idx];
      if (post.Author !== user.email && !user.isAdmin) {
        throw new Error('You can only edit your own posts.');
      }

      post.Message = message.trim();
      post.Edited = true;
      post.EditedTimestamp = new Date().toISOString();
      DataService.updateRow(SHEET, idx, post);
      return post;
    } catch (error) {
      logError('editPost', error);
      throw new Error(error.message);
    }
  }

  /**
   * Delete a post. Only the author or an admin can delete.
   * @param {string} postId
   * @returns {Object} { success: true }
   */
  function deletePost(postId) {
    try {
      const user = getCurrentUser();
      const data = DataService.getSheetData(SHEET);
      const idx = data.findIndex(p => p.PostId === postId);
      if (idx === -1) throw new Error('Post not found.');

      const post = data[idx];
      if (post.Author !== user.email && !user.isAdmin) {
        throw new Error('You can only delete your own posts.');
      }

      DataService.deleteRow(SHEET, idx);
      return { success: true };
    } catch (error) {
      logError('deletePost', error);
      throw new Error(error.message);
    }
  }

  /**
   * Toggle pin status on a post. Admin only.
   * @param {string} postId
   * @returns {Object} the updated post
   */
  function togglePin(postId) {
    try {
      const user = getCurrentUser();
      if (!user.isAdmin) throw new Error('Only admins can pin posts.');

      const data = DataService.getSheetData(SHEET);
      const idx = data.findIndex(p => p.PostId === postId);
      if (idx === -1) throw new Error('Post not found.');

      const post = data[idx];
      const wasPinned = post.Pinned === true || post.Pinned === 'TRUE';
      post.Pinned = !wasPinned;
      DataService.updateRow(SHEET, idx, post);
      return post;
    } catch (error) {
      logError('togglePin', error);
      throw new Error(error.message);
    }
  }

  /**
   * Get announcements that have an EventDate within the given range.
   * Used by the waterfall month calendar to show event/deadline dots.
   * @param {string} startDate - YYYY-MM-DD
   * @param {string} endDate - YYYY-MM-DD
   * @returns {Array<Object>}
   */
  function getAnnouncementsByDateRange(startDate, endDate) {
    try {
      const posts = DataService.getSheetData(SHEET);
      return posts.filter(p => {
        if (!p.EventDate) return false;
        return p.EventDate >= startDate && p.EventDate <= endDate;
      });
    } catch (error) {
      logError('getAnnouncementsByDateRange', error);
      throw new Error(error.message);
    }
  }

  return { getPosts, createPost, editPost, deletePost, togglePin, getAnnouncementsByDateRange };
})();
