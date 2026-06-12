import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  List,
  ListItem,
  Divider,
  Link,
  Alert,
} from '@mui/material';
import { Event as EventIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useEvents } from '../../contexts/EventsContext';
import { t } from '../../utils/translations';
import {
  formatEventDateRange,
  formatEventTimeRange,
  getEventDisplayStyles,
} from '../Calendar/eventUtils';

interface EventNotificationsModalProps {
  open: boolean;
  onClose: () => void;
}

const EventNotificationsModal: React.FC<EventNotificationsModalProps> = ({ open, onClose }) => {
  const { unreadEvents, markEventsAsRead } = useEvents();
  const navigate = useNavigate();
  const eventStyles = getEventDisplayStyles();
  const [displayEvents, setDisplayEvents] = useState<typeof unreadEvents>([]);

  // Snapshot unread events when opening — marking as read must not clear the modal list
  useEffect(() => {
    if (!open) {
      setDisplayEvents([]);
      return;
    }
    const snapshot = [...unreadEvents];
    setDisplayEvents(snapshot);
    if (snapshot.length > 0) {
      markEventsAsRead(snapshot.map((e) => e.id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- capture unreadEvents only when modal opens
  }, [open]);

  const handleGoToCalendar = (startDate: Date) => {
    onClose();
    navigate(`/calendar?date=${startDate.toISOString().split('T')[0]}`);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <EventIcon sx={{ color: eventStyles.accent }} />
          {t.events.notificationsTitle}
        </Box>
      </DialogTitle>
      <DialogContent>
        {displayEvents.length === 0 ? (
          <Typography color="text.secondary" textAlign="center" py={2}>
            {t.events.noUnread}
          </Typography>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t.events.notificationsSubtitle}
            </Typography>
            <List disablePadding>
              {displayEvents.map((event, index) => (
                <React.Fragment key={event.id}>
                  <ListItem
                    sx={{
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      py: 2,
                      px: 0,
                      borderLeft: 4,
                      borderColor: eventStyles.accent,
                      pl: 2,
                      cursor: 'pointer',
                    }}
                    onClick={() => handleGoToCalendar(event.startDate)}
                  >
                    <Typography variant="subtitle1" fontWeight={600}>
                      {event.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {formatEventDateRange(event)} · {formatEventTimeRange(event)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {event.description}
                    </Typography>
                    {event.registrationUrl && (
                      <>
                        <Alert severity="warning" sx={{ mt: 1.5, width: '100%' }} className="rounded-lg">
                          {t.events.registrationMandatory}
                        </Alert>
                        <Link
                          href={event.registrationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          variant="body2"
                          sx={{ mt: 1 }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {t.events.registrationLink}
                        </Link>
                      </>
                    )}
                  </ListItem>
                  {index < displayEvents.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t.common.close}</Button>
        <Button
          variant="contained"
          onClick={() => {
            onClose();
            navigate('/calendar');
          }}
          sx={{ backgroundColor: '#C99700', '&:hover': { backgroundColor: '#B8860B' } }}
        >
          {t.navigation.calendar}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EventNotificationsModal;
