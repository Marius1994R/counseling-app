import React from 'react';
import { Counselor, Case } from '../../types';
import { t } from '../../utils/translations';
import ConfirmDialog from '../common/ConfirmDialog';

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
    <ConfirmDialog
      open={open}
      title={t.deleteWarnings.deleteCounselor}
      message={t.deleteWarnings.deleteCounselorConfirm.replace('{name}', counselor.fullName)}
      warningMessage={
        assignedCases.length > 0
          ? t.deleteWarnings.deleteCounselorWarning.replace(
              '{count}',
              assignedCases.length.toString()
            )
          : undefined
      }
      variant="danger"
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
};

export default CounselorDeleteDialog;
