import React from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  Typography,
} from '@mui/material';
import {
  AssignmentTurnedIn,
  CakeOutlined,
  FavoriteBorder,
  PersonOutline,
  SourceOutlined,
} from '@mui/icons-material';
import { Case } from '../../types';
import {
  translateCivilStatus,
  translateIssueType,
  translateReferralSource,
  translateSex,
} from '../Cases/casesUtils';
import { t } from '../../utils/translations';

interface CaseProposalDialogProps {
  open: boolean;
  caseItem?: Case;
  fallbackTitle?: string;
  loading: boolean | 'accept' | 'refuse' | null;
  error?: string | null;
  onAccept: () => void;
  onRefuse: () => void;
}

const CaseProposalDialog: React.FC<CaseProposalDialogProps> = ({
  open,
  caseItem,
  fallbackTitle,
  loading,
  error,
  onAccept,
  onRefuse,
}) => {
  const isBusy = Boolean(loading);
  const isAccepting = loading === true || loading === 'accept';
  const isRefusing = loading === 'refuse';
  const personDetails = caseItem
    ? [
        caseItem.age ? `${caseItem.age} ${t.cases.years}` : null,
        translateSex(caseItem.sex, caseItem.age) || null,
        translateCivilStatus(caseItem.civilStatus, caseItem.sex) || null,
      ].filter(Boolean)
    : [];

  return (
    <Dialog
      open={open}
      onClose={() => undefined}
      disableEscapeKeyDown
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(15, 23, 42, 0.2)',
        },
      }}
    >
      <Box
        sx={{
          px: { xs: 2.5, sm: 3.5 },
          py: 3,
          color: '#fff',
          background: 'linear-gradient(135deg, #8A6500 0%, #C99700 100%)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              display: 'grid',
              placeItems: 'center',
              width: 44,
              height: 44,
              borderRadius: 2,
              backgroundColor: 'rgba(255, 255, 255, 0.18)',
            }}
          >
            <AssignmentTurnedIn />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={700} lineHeight={1.25}>
              {t.dashboard.newCaseProposed}
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.35, color: 'rgba(255, 255, 255, 0.82)' }}>
              {t.dashboard.newCaseProposedMessage}
            </Typography>
          </Box>
        </Box>
      </Box>

      <DialogContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
        <Box
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2.5,
            overflow: 'hidden',
            backgroundColor: '#fff',
          }}
        >
          <Box sx={{ p: 2.5, borderBottom: caseItem ? '1px solid' : 0, borderColor: 'divider' }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 2,
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h6" fontWeight={700} sx={{ color: 'text.primary' }}>
                  {caseItem?.title || fallbackTitle || t.cases.caseTitle}
                </Typography>
              </Box>
              {caseItem?.priority === 'high' && (
                <Chip
                  label={t.cases.priorityBadge}
                  size="small"
                  sx={{
                    flexShrink: 0,
                    color: '#B42318',
                    backgroundColor: '#FEF3F2',
                    fontWeight: 700,
                  }}
                />
              )}
            </Box>

            {caseItem && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                <Box
                  sx={{
                    display: 'grid',
                    placeItems: 'center',
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    color: '#8A6500',
                    backgroundColor: '#FFF8E1',
                  }}
                >
                  <PersonOutline fontSize="small" />
                </Box>
                <Box>
                  <Typography variant="body2" fontWeight={700}>
                    {caseItem.counseledName}
                  </Typography>
                  {personDetails.length > 0 && (
                    <Typography variant="caption" color="text.secondary">
                      {personDetails.join(' · ')}
                    </Typography>
                  )}
                </Box>
              </Box>
            )}
          </Box>

          {caseItem && (
            <Box sx={{ p: 2.5, backgroundColor: '#F8FAFC' }}>
              {caseItem.issueTypes.length > 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 2 }}>
                  {caseItem.issueTypes.map((issueType) => (
                    <Chip
                      key={issueType}
                      label={translateIssueType(issueType)}
                      size="small"
                      sx={{
                        color: '#475569',
                        backgroundColor: '#fff',
                        border: '1px solid #E2E8F0',
                        fontWeight: 600,
                      }}
                    />
                  ))}
                </Box>
              )}

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
                  gap: 1.5,
                  mb: caseItem.description ? 2 : 0,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SourceOutlined fontSize="small" sx={{ color: 'text.secondary' }} />
                  <Box>
                    <Typography variant="caption" display="block" color="text.secondary">
                      {t.cases.referralSource}
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {translateReferralSource(caseItem.referralSource)}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CakeOutlined fontSize="small" sx={{ color: 'text.secondary' }} />
                  <Box>
                    <Typography variant="caption" display="block" color="text.secondary">
                      {t.cases.age}
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {caseItem.age} {t.cases.years}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {caseItem.description && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 1,
                    p: 1.5,
                    borderRadius: 2,
                    backgroundColor: '#fff',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <FavoriteBorder fontSize="small" sx={{ mt: 0.15, color: '#8A6500' }} />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="caption" display="block" color="text.secondary">
                      {t.cases.problemDescription}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        mt: 0.35,
                        color: 'text.primary',
                        display: '-webkit-box',
                        WebkitBoxOrient: 'vertical',
                        WebkitLineClamp: 4,
                        overflow: 'hidden',
                        whiteSpace: 'pre-line',
                      }}
                    >
                      {caseItem.description}
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </Box>

        {!caseItem && (
          <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
            Detaliile complete ale cazului nu sunt disponibile momentan.
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          px: { xs: 2.5, sm: 3.5 },
          pb: 3,
          pt: 0,
          gap: 1,
          flexDirection: { xs: 'column-reverse', sm: 'row' },
          '& > :not(style) ~ :not(style)': { ml: 0 },
        }}
      >
        <Button
          onClick={onRefuse}
          disabled={isBusy}
          variant="outlined"
          color="inherit"
          fullWidth
          startIcon={isRefusing ? <CircularProgress size={17} color="inherit" /> : undefined}
          sx={{ borderColor: '#CBD5E1', color: '#475569', fontWeight: 700, py: 1.1 }}
        >
          {t.dashboard.refuseProposal}
        </Button>
        <Button
          variant="contained"
          onClick={onAccept}
          disabled={isBusy}
          fullWidth
          startIcon={isAccepting ? <CircularProgress size={17} color="inherit" /> : undefined}
          sx={{
            py: 1.1,
            fontWeight: 700,
            backgroundColor: '#C99700',
            boxShadow: 'none',
            '&:hover': { backgroundColor: '#B8860B', boxShadow: 'none' },
          }}
        >
          {t.dashboard.acceptProposal}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CaseProposalDialog;
