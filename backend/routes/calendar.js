import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import CalendarEvent from '../models/CalendarEvent.js';
import { logEvent } from '../services/loggingService.js';

const router = express.Router();

// 1. Retrieve all calendar events (with recurring expansions) - Admin/Manager only
router.get('/', protect, authorize('SUPER_ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const events = await CalendarEvent.find()
      .populate('task')
      .populate('project')
      .populate('assignedTo', 'name email');

    const expandedEvents = [];

    for (const event of events) {
      expandedEvents.push(event);

      if (event.recurrence && event.recurrence !== 'none') {
        const start = new Date(event.start);
        const end = new Date(event.end);
        const limitDate = event.recurrenceEnd 
          ? new Date(event.recurrenceEnd) 
          : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days maximum limit
        
        let currStart = new Date(start);
        let currEnd = new Date(end);

        // Generate virtual occurrences
        while (true) {
          if (event.recurrence === 'daily') {
            currStart.setDate(currStart.getDate() + 1);
            currEnd.setDate(currEnd.getDate() + 1);
          } else if (event.recurrence === 'weekly') {
            currStart.setDate(currStart.getDate() + 7);
            currEnd.setDate(currEnd.getDate() + 7);
          } else if (event.recurrence === 'monthly') {
            currStart.setMonth(currStart.getMonth() + 1);
            currEnd.setMonth(currEnd.getMonth() + 1);
          }

          if (currStart > limitDate) break;

          const occurrence = event.toObject();
          occurrence._id = `${event._id}_${currStart.getTime()}`; // generate a virtual ID
          occurrence.start = new Date(currStart);
          occurrence.end = new Date(currEnd);
          occurrence.isOccurrence = true;
          expandedEvents.push(occurrence);
        }
      }
    }

    return res.status(200).json({ success: true, data: expandedEvents });
  } catch (err) {
    next(err);
  }
});

// 2. Create a calendar event
router.post('/', protect, authorize('SUPER_ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const { 
      title, 
      description, 
      start, 
      end, 
      allDay, 
      assignedTo, 
      type, 
      color, 
      projectId, 
      taskId,
      recurrence,
      recurrenceEnd
    } = req.body;

    const event = new CalendarEvent({
      title,
      description,
      start: new Date(start),
      end: new Date(end),
      allDay: allDay || false,
      assignedTo: assignedTo || null,
      project: projectId || null,
      task: taskId || null,
      type: type || 'custom',
      recurrence: recurrence || 'none',
      recurrenceEnd: recurrenceEnd ? new Date(recurrenceEnd) : null,
      color: color || 'var(--accent)'
    });

    await event.save();

    await logEvent({
      userId: req.user._id,
      userName: req.user.name,
      action: 'SYSTEM_SETTING_CHANGE',
      details: { message: 'Calendar event created', eventId: event._id }
    });

    return res.status(201).json({ success: true, data: event });
  } catch (err) {
    next(err);
  }
});

// 3. Update event (e.g. drag & drop, resize)
router.put('/:id', protect, authorize('SUPER_ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const { start, end, title, description, allDay, color, recurrence, recurrenceEnd } = req.body;
    
    // In case of virtual occurrence edit, strip occurrence timestamp suffix
    const cleanId = req.params.id.split('_')[0];

    const event = await CalendarEvent.findById(cleanId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (start) event.start = new Date(start);
    if (end) event.end = new Date(end);
    if (title) event.title = title;
    if (description) event.description = description;
    if (allDay !== undefined) event.allDay = allDay;
    if (color) event.color = color;
    if (recurrence) event.recurrence = recurrence;
    if (recurrenceEnd !== undefined) event.recurrenceEnd = recurrenceEnd ? new Date(recurrenceEnd) : null;

    await event.save();

    return res.status(200).json({ success: true, data: event });
  } catch (err) {
    next(err);
  }
});

// 4. Delete calendar event
router.delete('/:id', protect, authorize('SUPER_ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const cleanId = req.params.id.split('_')[0];
    const event = await CalendarEvent.findByIdAndDelete(cleanId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    await logEvent({
      userId: req.user._id,
      userName: req.user.name,
      action: 'SYSTEM_SETTING_CHANGE',
      details: { message: 'Calendar event deleted', eventId: cleanId }
    });

    return res.status(200).json({ success: true, message: 'Event deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

export default router;
