import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
  Typography,
} from '@mui/material';
import { Counselor, Case } from '../../types';
import { t } from '../../utils/translations';

interface CounselorDeleteDialogProps {
  open: boolean;
  counselor: Counselor | null;
  assignedCases: Case[];
  onClose: () => void;
  onConfirm: () => void;
}

const CounselorDeleteDialog: React.FC<CounselorDeleteDialogProps> = ({
  open,
  counselor,
  assignedCases,
  onClose,
  onConfirm,
}) => {
  if (!counselor) return null;

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{t.deleteWarnings.deleteCounselor}</DialogTitle>
      <DialogContent>
        <Typography>
          {t.deleteWarnings.deleteCounselorConfirm.replace('{name}', counselor.fullName)}
        </Typography>
        {assignedCases.length > 0 && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            {t.deleteWarnings.deleteCounselorWarning.replace(
              '{count}',
              assignedCases.length.toString()
            )}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t.common.cancel}</Button>
        <Button onClick={onConfirm} color="error" variant="contained">
          {t.common.delete}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CounselorDeleteDialog;
