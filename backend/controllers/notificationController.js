import Notification from '../models/Notification.js';

const MANAGER_BLOCKED_TITLE_REGEX = /(Payment|Invoice|Commission|Payout|Refund|Revenue|Lead|Enquiry|Referral Booking|New Referral)/i;

function getManagerAllowedFilter(user) {
  if (!user || (user.role || '').toUpperCase() !== 'MANAGER') return {};
  // Manager: only operational Project/Task/Employee notifications, never financial/customer acquisition
  return { title: { $not: MANAGER_BLOCKED_TITLE_REGEX } };
}

export const getNotifications = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      type = '',
      priority = '',
      read = '',
      startDate = '',
      endDate = ''
    } = req.query;

    const filter = { user: req.user._id, ...getManagerAllowedFilter(req.user) };

    if (type) filter.type = type;
    if (priority) filter.priority = priority;
    if (read === 'true') filter.isRead = true;
    else if (read === 'false') filter.isRead = false;

    if (search) {
      const trimmedSearch = search.toString().trim();
      if (trimmedSearch.length > 100) {
        return res.status(400).json({ error: 'Search query too long (max 100 characters)' });
      }
      const escapedSearch = trimmedSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedSearch, 'i');
      filter.$or = [
        { title: regex },
        { message: regex },
        { referenceId: regex }
      ];
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({ user: req.user._id, isRead: false })
    ]);

    return res.status(200).json({
      success: true,
      data: notifications,
      unreadCount,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasMore: skip + limitNum < total
      }
    });
  } catch (err) {
    next(err);
  }
};

export const getUnreadCount = async (req, res, next) => {
  try {
    const cacheKey = `notifications:unread:${req.user._id}`;
    const { safeGet, safeSet } = await import('../config/redis.js');
    try {
      const cached = await safeGet(cacheKey);
      if (cached !== null) {
        return res.status(200).json({ success: true, unreadCount: parseInt(cached, 10) });
      }
    } catch {}
    const filter = { user: req.user._id, isRead: false, ...getManagerAllowedFilter(req.user) };
    const count = await Notification.countDocuments(filter);
    safeSet(cacheKey, String(count), 30).catch(() => {});
    return res.status(200).json({ success: true, unreadCount: count });
  } catch (err) {
    next(err);
  }
};

export const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { isRead: true, readAt: new Date() },
      { returnDocument: 'after' }
    );
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    try {
      const { safeDel } = await import('../config/redis.js');
      await safeDel(`notifications:unread:${req.user._id}`);
    } catch {}
    return res.status(200).json({ success: true, data: notification });
  } catch (err) {
    next(err);
  }
};

export const markAllAsRead = async (req, res, next) => {
  try {
    const result = await Notification.updateMany(
      { user: req.user._id, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    try {
      const { safeDel } = await import('../config/redis.js');
      await safeDel(`notifications:unread:${req.user._id}`);
    } catch {}
    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
      modifiedCount: result.modifiedCount
    });
  } catch (err) {
    next(err);
  }
};

export const bulkMarkAsRead = async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Notification IDs array is required' });
    }
    const result = await Notification.updateMany(
      { _id: { $in: ids }, user: req.user._id, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    try {
      const { safeDel } = await import('../config/redis.js');
      await safeDel(`notifications:unread:${req.user._id}`);
    } catch {}
    return res.status(200).json({
      success: true,
      modifiedCount: result.modifiedCount
    });
  } catch (err) {
    next(err);
  }
};

export const bulkDelete = async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Notification IDs array is required' });
    }
    const result = await Notification.deleteMany({
      _id: { $in: ids },
      user: req.user._id
    });
    return res.status(200).json({
      success: true,
      deletedCount: result.deletedCount
    });
  } catch (err) {
    next(err);
  }
};

export const clearRead = async (req, res, next) => {
  try {
    const result = await Notification.deleteMany({ user: req.user._id, isRead: true });
    return res.status(200).json({
      success: true,
      deletedCount: result.deletedCount
    });
  } catch (err) {
    next(err);
  }
};

export const deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    return res.status(200).json({ success: true, message: 'Notification deleted' });
  } catch (err) {
    next(err);
  }
};
