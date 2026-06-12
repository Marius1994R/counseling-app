import React, { useEffect } from 'react';
import { Alert, Snackbar } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { isAdminOrLeader } from '../../utils/roleAuth';

const ADMIN_ONLY_PATHS = ['/admin', '/counselors'];

const RoleUpdateNotifier: React.FC = () => {
  const { roleUpdateNotice, clearRoleUpdateNotice } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!roleUpdateNotice) return;

    const lostAdminAccess =
      isAdminOrLeader(roleUpdateNotice.previousRole) &&
      !isAdminOrLeader(roleUpdateNotice.newRole);

    if (lostAdminAccess && ADMIN_ONLY_PATHS.some((path) => location.pathname.startsWith(path))) {
      navigate('/', { replace: true });
    }
  }, [roleUpdateNotice, location.pathname, navigate]);

  if (!roleUpdateNotice) {
    return null;
  }

  return (
    <Snackbar
      open
      autoHideDuration={8000}
      onClose={clearRoleUpdateNotice}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
    >
      <Alert
        onClose={clearRoleUpdateNotice}
        severity="info"
        sx={{ width: '100%' }}
        className="rounded-xl"
      >
        {roleUpdateNotice.message}
      </Alert>
    </Snackbar>
  );
};

export default RoleUpdateNotifier;
