import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
} from '@mui/material';
import { Case, Counselor } from '../../types';
import { t } from '../../utils/translations';
import { getStatusLabel, getStatusBadgeClass } from '../Cases/casesUtils';
import { formatCounselorDate } from './counselorsUtils';

interface CounselorCaseHistoryDialogProps {
  open: boolean;
  counselor: Counselor | null;
  assignedCases: Case[];
  onClose: () => void;
}

const CounselorCaseHistoryDialog: React.FC<CounselorCaseHistoryDialogProps> = ({
  open,
  counselor,
  assignedCases,
  onClose,
}) => {
  if (!counselor) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        {t.counselors.caseHistory} — {counselor.fullName}
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t.counselors.totalCases}: {assignedCases.length}
        </Typography>
        <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
          {assignedCases.map((caseItem) => (
            <Box
              key={caseItem.id}
              sx={{
                p: 2,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                mb: 1,
              }}
            >
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1} gap={1}>
                <Typography variant="subtitle1" fontWeight={600}>
                  {caseItem.title}
                </Typography>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${getStatusBadgeClass(caseItem.status)}`}
                >
                  {getStatusLabel(caseItem.status)}
                </span>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                {caseItem.counseledName} · {caseItem.age} ani
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                {caseItem.issueTypes.join(', ')}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatCounselorDate(caseItem.createdAt)}
              </Typography>
            </Box>
          ))}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="outlined">
          {t.common.close}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CounselorCaseHistoryDialog;
