import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Divider,
  CircularProgress,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import {
  MoreVert,
  Edit,
  Delete,
  Person,
  Phone,
  CalendarToday,
  Note
} from '@mui/icons-material';
import { Case, CaseStatus, IssueType } from '../../types';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { t } from '../../utils/translations';

interface CaseCardProps {
  caseData: Case;
  onEdit: (caseData: Case) => void;
  onDelete: (caseId: string) => void;
  canEdit: boolean;
  canDelete: boolean;
  latestNote?: string; // Optional latest note content for preview
  showViewAllNotes?: boolean; // Show "View All Notes" button
  showLatestNote?: boolean; // Show "Latest Meeting Note" section
  showSessionReports?: boolean; // Show "Gestionează Rapoartele" button
  onSessionReportClick?: () => void; // Callback for session report button
}

const CaseCard: React.FC<CaseCardProps> = ({
  caseData,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
  latestNote,
  showViewAllNotes = false,
  showLatestNote = true, // Default to true to maintain backward compatibility
  showSessionReports = false,
  onSessionReportClick
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [descriptionModalOpen, setDescriptionModalOpen] = useState(false);
  const [allNotes, setAllNotes] = useState<any[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEdit = () => {
    onEdit(caseData);
    handleMenuClose();
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteConfirm = () => {
    onDelete(caseData.id);
    setDeleteDialogOpen(false);
  };

  const handleViewAllNotes = async () => {
    setNotesDialogOpen(true);
    setNotesLoading(true);
    
    try {
      const notesRef = collection(db, 'meetingNotes');
      const notesQuery = query(notesRef, where('caseId', '==', caseData.id));
      const notesSnapshot = await getDocs(notesQuery);
      
      const notesData = notesSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          content: data.content,
          createdAt: data.createdAt.toDate(),
          createdBy: data.createdBy,
          createdByName: data.createdByName
        };
      });
      
      // Sort by creation date (newest first)
      notesData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setAllNotes(notesData);
    } catch (error) {
      console.error('Error loading notes:', error);
    } finally {
      setNotesLoading(false);
    }
  };

  const handleCloseNotesDialog = () => {
    setNotesDialogOpen(false);
    setAllNotes([]);
  };

  const getStatusColor = (status: CaseStatus) => {
    switch (status) {
      case 'waiting': return 'warning';
      case 'active': return 'info';
      case 'unfinished': return 'error';
      case 'finished': return 'success';
      default: return 'default';
    }
  };

  const getIssueTypeColor = (issueType: IssueType) => {
    switch (issueType) {
      case 'spiritual': return 'secondary';
      case 'relational': return 'info';
      case 'personal': return 'default';
      default: return 'default';
    }
  };

  const translateIssueType = (issueType: IssueType): string => {
    const translations: Record<IssueType, string> = {
      spiritual: t.issueTypes.spiritual,
      relational: t.issueTypes.relational || t.issueTypes.family,
      personal: t.issueTypes.personal
    };
    return translations[issueType] || issueType;
  };

  const translateSex = (sex?: string, age?: number): string => {
    if (!sex) return '';
    const isAdult = age !== undefined && age > 17;
    if (sex === 'masculin') {
      return isAdult ? t.cases.sexMasculinAdult : t.cases.sexMasculinMinor;
    } else if (sex === 'feminin') {
      return isAdult ? t.cases.sexFemininAdult : t.cases.sexFemininMinor;
    }
    return '';
  };

  const translateCivilStatus = (status: string, sex?: string): string => {
    const isFeminin = sex === 'feminin';
    const statusLower = status.toLowerCase();
    
    if (isFeminin && t.civilStatus.feminin) {
      const femininTranslations = t.civilStatus.feminin as Record<string, string>;
      if (femininTranslations[statusLower]) {
        return femininTranslations[statusLower];
      }
    } else if (!isFeminin && t.civilStatus.masculin) {
      const masculinTranslations = t.civilStatus.masculin as Record<string, string>;
      if (masculinTranslations[statusLower]) {
        return masculinTranslations[statusLower];
      }
    }
    
    // Fallback to generic translations
    const translations: Record<string, string> = {
      unmarried: t.civilStatus.unmarried,
      single: t.civilStatus.single,
      married: t.civilStatus.married,
      divorced: t.civilStatus.divorced,
      engaged: t.civilStatus.engaged,
      widowed: t.civilStatus.widowed
    };
    return translations[statusLower] || status;
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  return (
    <>
      <Card sx={{ 
        mb: { xs: 1, sm: 2 }, 
        '&:hover': { boxShadow: 3 },
        borderRadius: { xs: 2, sm: 1 }
      }}>
        <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
          {/* Header with Title and Status/Actions */}
          <Box 
            display="flex" 
            flexDirection={{ xs: 'row', sm: 'row' }}
            justifyContent="space-between" 
            alignItems={{ xs: 'flex-start', sm: 'flex-start' }}
            mb={2}
            gap={1}
          >
            <Box flex={1} sx={{ width: '100%' }}>
              <Typography 
                variant="h6" 
                component="h3" 
                gutterBottom
                sx={{ 
                  fontSize: { xs: '1rem', sm: '1.25rem' },
                  lineHeight: 1.3
                }}
              >
                {caseData.title}
              </Typography>
            </Box>
            
            <Box 
              display="flex" 
              alignItems="center" 
              gap={1}
              flexDirection={{ xs: 'column', sm: 'row' }}
              alignSelf={{ xs: 'flex-start', sm: 'flex-start' }}
            >
              <Chip
                label={caseData.status.charAt(0).toUpperCase() + caseData.status.slice(1)}
                color={getStatusColor(caseData.status)}
                size="small"
                sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}
              />
              {(canEdit || canDelete) && (
                <IconButton
                  size="small"
                  onClick={handleMenuOpen}
                  aria-label="more actions"
                  sx={{ p: 0.5 }}
                >
                  <MoreVert fontSize="small" />
                </IconButton>
              )}
            </Box>
          </Box>

          {/* Client Information */}
          <Box mb={2}>
            <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={1} mb={1}>
              <Box display="flex" alignItems="center" gap={1}>
                <Person fontSize="small" color="action" />
                <Typography 
                  variant="body2" 
                  color="text.secondary"
                  sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                >
                  {caseData.counseledName}, {caseData.age} {t.cases.years}{caseData.sex && `, ${translateSex(caseData.sex, caseData.age)}`}
                </Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={1}>
                <Phone fontSize="small" color="action" />
                <Typography 
                  variant="body2" 
                  color="text.secondary"
                  sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                >
                  {caseData.phoneNumber}
                </Typography>
              </Box>
            </Box>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <CalendarToday fontSize="small" color="action" />
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
              >
                {t.cases.createdLabel}: {formatDate(caseData.createdAt)}
              </Typography>
            </Box>
          </Box>

          <Box mb={2}>
            <Typography 
              variant="subtitle2" 
              gutterBottom
              sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
            >
              {t.cases.issueTypesTitle}:
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={0.5}>
              {caseData.issueTypes.map((issueType) => (
                <Chip
                  key={issueType}
                  label={translateIssueType(issueType)}
                  color={getIssueTypeColor(issueType)}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}
                />
              ))}
            </Box>
          </Box>

          <Box mb={2}>
            <Typography 
              variant="subtitle2" 
              gutterBottom
              sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
            >
              {t.cases.civilStatusTitle}:
            </Typography>
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
            >
              {translateCivilStatus(caseData.civilStatus, caseData.sex)}
            </Typography>
          </Box>

          {caseData.assignedCounselorName && (
            <Box mb={2}>
              <Typography 
                variant="subtitle2" 
                gutterBottom
                sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
              >
                {t.cases.assignedCounselorTitle}:
              </Typography>
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
              >
                {caseData.assignedCounselorName}
              </Typography>
            </Box>
          )}

          <Divider sx={{ my: { xs: 1.5, sm: 2 } }} />

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              {t.cases.problemDescription}:
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', mb: 2 }}>
              {caseData.description && caseData.description.length > 150 
                ? `${caseData.description.substring(0, 150)}...` 
                : (caseData.description || t.cases.noDescriptionProvided)}
            </Typography>
            {caseData.description && caseData.description.length > 150 && (
              <Button
                size="small"
                onClick={() => setDescriptionModalOpen(true)}
                sx={{ 
                  color: '#ffc700',
                  textTransform: 'none',
                  mt: 1
                }}
              >
                Vezi Descrierea Completă
              </Button>
            )}
            
            {/* Latest Meeting Note in Description Section - Only for leaders */}
            {showLatestNote && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography 
                  variant="subtitle2" 
                  gutterBottom
                  sx={{ 
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    color: '#ffc700',
                    fontWeight: 'bold'
                  }}
                >
              <Note fontSize="small" />
              {t.meetingNotes.latestMeetingNote}:
            </Typography>
                
                {latestNote ? (
                  <Box>
                    <Typography 
                      variant="body2" 
                      color="text.secondary" 
                      sx={{ 
                        fontSize: { xs: '0.75rem', sm: '0.875rem' },
                        fontStyle: 'italic',
                        maxHeight: '60px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        backgroundColor: '#f8f9fa',
                        p: 1,
                        borderRadius: 1,
                        border: '1px solid #e0e0e0',
                        mb: 1
                      }}
                    >
                      {latestNote}
                    </Typography>
                    {showViewAllNotes && (
                      <Button
                        size="small"
                        onClick={handleViewAllNotes}
                        sx={{ 
                          color: '#ffc700',
                          textTransform: 'none',
                          fontSize: { xs: '0.7rem', sm: '0.75rem' }
                        }}
                      >
                        {t.meetingNotes.viewAllNotes}
                      </Button>
                    )}
                  </Box>
                ) : (
                  <Box>
                    <Typography 
                      variant="body2" 
                      color="text.secondary" 
                      sx={{ 
                        fontSize: { xs: '0.75rem', sm: '0.875rem' },
                        fontStyle: 'italic',
                        backgroundColor: '#f8f9fa',
                        p: 1,
                        borderRadius: 1,
                        border: '1px solid #e0e0e0',
                        mb: 1
                      }}
                    >
                      {t.meetingNotes.noMeetingNotesYet}
                    </Typography>
                    {showViewAllNotes && (
                      <Button
                        size="small"
                        onClick={handleViewAllNotes}
                        sx={{ 
                          color: '#ffc700',
                          textTransform: 'none',
                          fontSize: { xs: '0.7rem', sm: '0.75rem' }
                        }}
                      >
                        {t.meetingNotes.viewAllNotes}
                      </Button>
                    )}
                  </Box>
                )}
              </>
            )}
            
            {/* Gestionează Rapoartele Button - Only for leaders */}
            {showSessionReports && onSessionReportClick && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography 
                  variant="subtitle2" 
                  gutterBottom
                  sx={{ 
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    color: '#ffc700',
                    fontWeight: 'bold'
                  }}
                >
                  <CalendarToday fontSize="small" />
                  {t.adminTools.manageReports}:
                </Typography>
                <Button
                  size="small"
                  onClick={onSessionReportClick}
                  sx={{ 
                    color: '#ffc700',
                    textTransform: 'none',
                    fontSize: { xs: '0.7rem', sm: '0.75rem' }
                  }}
                  >
                  {t.adminTools.openReports}
                </Button>
              </>
            )}
          </Box>

        </CardContent>
      </Card>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {canEdit && (
          <MenuItem onClick={handleEdit}>
            <Edit sx={{ mr: 1 }} />
            {t.common.edit}
          </MenuItem>
        )}
        {canDelete && (
          <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>
            <Delete sx={{ mr: 1 }} />
            {t.common.delete}
          </MenuItem>
        )}
      </Menu>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>{t.deleteWarnings.deleteCase}</DialogTitle>
        <DialogContent>
          <Typography>
            {t.deleteWarnings.deleteCaseConfirm.replace('{title}', caseData.title)}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>{t.common.cancel}</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            {t.common.delete}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View All Notes Dialog */}
      <Dialog 
        open={notesDialogOpen} 
        onClose={handleCloseNotesDialog} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Note />
            {t.meetingNotes.allMeetingNotes} - {caseData.title}
          </Box>
        </DialogTitle>
        <DialogContent>
          {notesLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : allNotes.length > 0 ? (
            <List>
              {allNotes.map((note, index) => (
                <React.Fragment key={note.id}>
                  <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                    <Box sx={{ width: '100%', mb: 1 }}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Note #{allNotes.length - index} - {note.createdByName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {note.createdAt.toLocaleDateString()} at {note.createdAt.toLocaleTimeString()}
                      </Typography>
                    </Box>
                    <ListItemText
                      primary={
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            whiteSpace: 'pre-wrap',
                            backgroundColor: '#f8f9fa',
                            p: 2,
                            borderRadius: 1,
                            border: '1px solid #e0e0e0'
                          }}
                        >
                          {note.content}
                        </Typography>
                      }
                    />
                  </ListItem>
                  {index < allNotes.length - 1 && <Divider sx={{ my: 1 }} />}
                </React.Fragment>
              ))}
            </List>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Note sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                {t.meetingNotes.noNotes}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t.meetingNotes.noMeetingNotesAdded}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseNotesDialog}>
            {t.common.close}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Full Description Modal */}
      <Dialog 
        open={descriptionModalOpen} 
        onClose={() => setDescriptionModalOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Descriere - {caseData.counseledName}
        </DialogTitle>
        <DialogContent>
          <Typography 
            variant="body1" 
            color="text.secondary" 
            sx={{ 
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              py: 2
            }}
          >
            {caseData.description || 'Nu există descriere'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDescriptionModalOpen(false)}>
            Închide
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CaseCard;
