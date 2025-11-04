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
  List,
  ListItem,
  ListItemText,
  Avatar,
  Alert
} from '@mui/material';
import {
  MoreVert,
  Edit,
  Delete,
  Person,
  Email,
  Phone,
  Assignment,
  TrendingUp,
  TrendingDown,
  Remove,
  Visibility,
  VisibilityOff,
  History
} from '@mui/icons-material';
import { Counselor, Case } from '../../types';

interface CounselorCardProps {
  counselor: Counselor;
  assignedCases: Case[];
  onEdit: (counselor: Counselor) => void;
  onDelete: (counselorId: string) => void;
  canEdit: boolean;
  canDelete: boolean;
}

const CounselorCard: React.FC<CounselorCardProps> = ({
  counselor,
  assignedCases,
  onEdit,
  onDelete,
  canEdit,
  canDelete
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [showRecentCases, setShowRecentCases] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEdit = () => {
    onEdit(counselor);
    handleMenuClose();
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteConfirm = () => {
    onDelete(counselor.id);
    setDeleteDialogOpen(false);
  };

  const getWorkloadColor = (level: 'low' | 'moderate' | 'high') => {
    switch (level) {
      case 'low': return 'success';
      case 'moderate': return 'warning';
      case 'high': return 'error';
      default: return 'default';
    }
  };

  const getWorkloadIcon = (level: 'low' | 'moderate' | 'high') => {
    switch (level) {
      case 'low': return <TrendingDown />;
      case 'moderate': return <Remove />;
      case 'high': return <TrendingUp />;
      default: return <Remove />;
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  const activeCases = assignedCases.filter(caseItem => caseItem.status === 'active');
  const waitingCases = assignedCases.filter(caseItem => caseItem.status === 'waiting');

  return (
    <>
      <Card sx={{ mb: 2, '&:hover': { boxShadow: 3 } }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
            <Box display="flex" alignItems="flex-start" flex={1} sx={{ mr: 1 }}>
              <Avatar sx={{ mr: 1.5, bgcolor: 'primary.main', mt: 0.5 }}>
                {counselor.fullName.charAt(0).toUpperCase()}
              </Avatar>
              <Box flex={1}>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <Typography variant="h6" component="h3" sx={{ mr: 1 }}>
                    {counselor.fullName}
                  </Typography>
                  <Chip
                    icon={getWorkloadIcon(counselor.workloadLevel)}
                    label={`${counselor.workloadLevel.charAt(0).toUpperCase() + counselor.workloadLevel.slice(1)}`}
                    color={getWorkloadColor(counselor.workloadLevel)}
                    size="small"
                  />
                </Box>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <Email fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">
                    {counselor.email}
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <Phone fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">
                    {counselor.phoneNumber}
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <Assignment fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">
                    {counselor.activeCases} active cases
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Added: {formatDate(counselor.createdAt)}
                  </Typography>
                </Box>
              </Box>
            </Box>
            
            {(canEdit || canDelete) && (
              <Box display="flex" alignItems="center">
                <IconButton
                  size="small"
                  onClick={handleMenuOpen}
                  aria-label="more actions"
                >
                  <MoreVert />
                </IconButton>
              </Box>
            )}
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Centered sections */}
          <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
            {/* Specialties */}
            <Box textAlign="center">
              <Typography variant="subtitle2" gutterBottom>
                Specialties
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={0.5} justifyContent="center">
                {counselor.specialties.map((specialty) => (
                  <Chip
                    key={specialty}
                    label={specialty}
                    size="small"
                    variant="outlined"
                    color="primary"
                  />
                ))}
              </Box>
            </Box>

            {/* Case Summary */}
            <Box textAlign="center" sx={{ width: '100%' }}>
              <Typography variant="subtitle2" gutterBottom>
                Case Summary
              </Typography>
              <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
                <Box sx={{ flex: 1, textAlign: 'center', minWidth: '80px' }}>
                  <Typography variant="h4" color="primary.main">
                    {activeCases.length}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Active Cases
                  </Typography>
                </Box>
                <Box sx={{ flex: 1, textAlign: 'center', minWidth: '80px' }}>
                  <Typography variant="h4" color="warning.main">
                    {waitingCases.length}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Waiting Cases
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Divider between Case Summary and Recent Cases */}
            <Divider sx={{ my: 2, width: '100%' }} />

            {/* Recent Cases */}
            {assignedCases.length > 0 && (
              <Box textAlign="center" sx={{ width: '100%' }}>
                {!showRecentCases ? (
                  // When hidden: only show eye icon
                  <Box display="flex" justifyContent="center" alignItems="center" mb={1}>
                    <IconButton
                      size="small"
                      onClick={() => setShowRecentCases(!showRecentCases)}
                      aria-label={showRecentCases ? 'hide recent cases' : 'show recent cases'}
                    >
                      {showRecentCases ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </Box>
                ) : (
                  // When visible: show title and eye icon below
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Recent Cases
                    </Typography>
                    <Box display="flex" justifyContent="center" alignItems="center" mb={1}>
                      <IconButton
                        size="small"
                        onClick={() => setShowRecentCases(!showRecentCases)}
                        aria-label={showRecentCases ? 'hide recent cases' : 'show recent cases'}
                      >
                        {showRecentCases ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </Box>
                    {/* Two per row grid layout */}
                    <Box sx={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(2, 1fr)', 
                      gap: 1,
                      width: '100%'
                    }}>
                      {assignedCases.slice(0, 6).map((caseItem) => (
                        <Box 
                          key={caseItem.id} 
                          sx={{ 
                            p: 1, 
                            border: '1px solid', 
                            borderColor: 'divider',
                            borderRadius: 1,
                            textAlign: 'left',
                            backgroundColor: 'background.paper'
                          }}
                        >
                          <Typography variant="body2" sx={{ fontWeight: 'medium', mb: 0.5 }}>
                            {caseItem.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {caseItem.status.charAt(0).toUpperCase() + caseItem.status.slice(1)} • {formatDate(caseItem.createdAt)}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                    
                    {/* See History Button */}
                    {assignedCases.length > 0 && (
                      <Box sx={{ mt: 2, textAlign: 'center' }}>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<History />}
                          onClick={() => setHistoryModalOpen(true)}
                          sx={{ 
                            fontSize: '0.75rem',
                            px: 2,
                            py: 0.5
                          }}
                        >
                          See History ({assignedCases.length} cases)
                        </Button>
                      </Box>
                    )}
                  </Box>
                )}
              </Box>
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
            Edit
          </MenuItem>
        )}
        {canDelete && (
          <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>
            <Delete sx={{ mr: 1 }} />
            Delete
          </MenuItem>
        )}
      </Menu>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Counselor</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete counselor "{counselor.fullName}"? This action cannot be undone.
          </Typography>
          {assignedCases.length > 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              This counselor has {assignedCases.length} assigned cases. You may want to reassign these cases before deleting.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Case History Modal */}
      <Dialog
        open={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        maxWidth="lg"
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            m: { xs: 1, sm: 2 },
            maxHeight: { xs: '95vh', sm: '90vh' }
          }
        }}
      >
        <DialogTitle sx={{ 
          fontSize: { xs: '1.25rem', sm: '1.5rem' },
          pb: { xs: 1, sm: 2 }
        }}>
          Case History - {counselor.fullName}
        </DialogTitle>
        <DialogContent sx={{ 
          px: { xs: 1.5, sm: 3 },
          py: { xs: 1, sm: 2 }
        }}>
          <Box sx={{ 
            display: "flex", 
            flexDirection: "column", 
            gap: { xs: 1, sm: 2 }, 
            mt: 1 
          }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Total Cases: {assignedCases.length}
            </Typography>
            
            {/* Cases List */}
            <Box sx={{ maxHeight: '400px', overflowY: 'auto' }}>
              {assignedCases.map((caseItem) => (
                <Box 
                  key={caseItem.id} 
                  sx={{ 
                    p: 2, 
                    border: '1px solid', 
                    borderColor: 'divider',
                    borderRadius: 1,
                    mb: 1,
                    backgroundColor: 'background.paper',
                    '&:hover': {
                      backgroundColor: 'action.hover'
                    }
                  }}
                >
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                    <Typography variant="h6" sx={{ fontWeight: 'medium' }}>
                      {caseItem.title}
                    </Typography>
                    <Chip
                      label={caseItem.status.charAt(0).toUpperCase() + caseItem.status.slice(1)}
                      color={
                        caseItem.status === 'active' ? 'info' :
                        caseItem.status === 'waiting' ? 'warning' :
                        caseItem.status === 'finished' ? 'success' : 'error'
                      }
                      size="small"
                    />
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    <strong>Counseled Person:</strong> {caseItem.counseledName} ({caseItem.age} years old)
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    <strong>Issue Types:</strong> {caseItem.issueTypes.join(', ')}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    <strong>Phone:</strong> {caseItem.phoneNumber}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    <strong>Created:</strong> {formatDate(caseItem.createdAt)}
                  </Typography>
                  
                  {caseItem.description && (
                    <Typography variant="body2" color="text.secondary">
                      <strong>Description:</strong> {caseItem.description}
                    </Typography>
                  )}
                </Box>
              ))}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ 
          px: { xs: 1.5, sm: 3 },
          py: { xs: 1, sm: 2 }
        }}>
          <Button 
            onClick={() => setHistoryModalOpen(false)}
            variant="outlined"
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CounselorCard;
