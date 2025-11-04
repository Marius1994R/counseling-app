import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  useMediaQuery,
  useTheme,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material';
import {
  AccountCircle,
  Dashboard,
  Assignment,
  CalendarToday,
  Logout,
  Menu as MenuIcon,
  AdminPanelSettings
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { t } from '../../utils/translations';

const Header: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
    handleClose();
  };

  const handleMobileMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const handleMobileMenuClose = () => {
    setMobileMenuOpen(false);
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    handleMobileMenuClose();
  };

  const handleAdminTools = () => {
    navigate('/admin');
    handleClose();
  };


  // Navigation items based on user role
  const getNavigationItems = () => {
    const baseItems = [
      { label: t.navigation.dashboard, path: '/', icon: <Dashboard /> },
      { label: t.navigation.cases, path: '/cases', icon: <Assignment /> },
      { label: t.navigation.myProfile, path: '/profile', icon: <AccountCircle /> },
      { label: t.navigation.calendar, path: '/calendar', icon: <CalendarToday /> },
    ];
    
    return baseItems;
  };

  const navigationItems = getNavigationItems();

  return (
    <>
      <AppBar position="sticky" sx={{ 
        backgroundColor: '#ffffff',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        borderBottom: '1px solid #e0e0e0',
        top: 0,
        zIndex: 1100
      }}>
        <Toolbar>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1 }}>
            <Box
              component="img"
              src="/favicon.svg"
              alt="Consiliere360"
              sx={{
                width: 32,
                height: 32
              }}
            />
            {!isMobile && (
              <Typography 
                variant="h6" 
                component="div" 
                sx={{ 
                  fontWeight: 'bold',
                  fontSize: { xs: '1rem', sm: '1.25rem' },
                  color: '#ffc700'
                }}
              >
                Consiliere360
              </Typography>
            )}
          </Box>
          
          {/* Desktop Navigation */}
          {!isMobile && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {navigationItems.map((item) => (
                <Button
                  key={item.path}
                  startIcon={item.icon}
                  onClick={() => navigate(item.path)}
                  sx={{
                    color: location.pathname === item.path ? '#ffc700' : '#666666',
                    backgroundColor: location.pathname === item.path ? 'rgba(255, 199, 0, 0.1)' : 'transparent',
                    fontWeight: location.pathname === item.path ? 'bold' : 'normal',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 199, 0, 0.1)',
                      color: '#ffc700'
                    }
                  }}
                >
                  {item.label}
                </Button>
              ))}
            </Box>
          )}

          {/* Mobile Menu Button */}
          {isMobile && (
            <IconButton
              size="large"
              aria-label="open mobile menu"
              onClick={handleMobileMenuToggle}
              sx={{ color: '#666666' }}
            >
              <MenuIcon />
            </IconButton>
          )}
            
          <IconButton
            size="large"
            aria-label="account of current user"
            aria-controls="menu-appbar"
            aria-haspopup="true"
            onClick={handleMenu}
            sx={{ color: '#666666' }}
          >
            <Avatar sx={{ 
              width: 32, 
              height: 32, 
              bgcolor: '#ffc700',
              color: '#ffffff',
              fontWeight: 'bold'
            }}>
              {currentUser?.fullName.charAt(0).toUpperCase()}
            </Avatar>
          </IconButton>
          
          <Menu
            id="menu-appbar"
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorEl)}
            onClose={handleClose}
          >
            <MenuItem disabled>
              <Box>
                <Typography variant="subtitle2">{currentUser?.fullName}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {currentUser?.role ? currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1) : ''}
                </Typography>
              </Box>
            </MenuItem>
            {(currentUser?.role === 'leader' || currentUser?.role === 'admin') && (
              <MenuItem key="admin-tools" onClick={handleAdminTools}>
                <AdminPanelSettings sx={{ mr: 1 }} />
                {t.navigation.adminTools}
              </MenuItem>
            )}
            <MenuItem onClick={handleLogout}>
              <Logout sx={{ mr: 1 }} />
              {t.navigation.logout}
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Mobile Navigation Drawer */}
      <Drawer
        anchor="right"
        open={mobileMenuOpen}
        onClose={handleMobileMenuClose}
        sx={{
          '& .MuiDrawer-paper': {
            width: 280,
            backgroundColor: '#ffffff',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
          }
        }}
      >
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
            <Box
              component="img"
              src="/favicon.svg"
              alt="Consiliere360"
              sx={{
                width: 32,
                height: 32
              }}
            />
            <Typography 
              variant="h6" 
              component="div" 
              sx={{ 
                fontWeight: 'bold',
                color: '#ffc700'
              }}
            >
              Consiliere360
            </Typography>
          </Box>
          
          <List>
            {navigationItems.map((item) => (
              <ListItem 
                key={item.path}
                component="div"
                onClick={() => handleNavigation(item.path)}
                sx={{
                  borderRadius: 1,
                  mb: 0.5,
                  cursor: 'pointer',
                  backgroundColor: location.pathname === item.path ? 'rgba(255, 199, 0, 0.1)' : 'transparent',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 199, 0, 0.1)'
                  }
                }}
              >
                <ListItemIcon sx={{ color: location.pathname === item.path ? '#ffc700' : '#666666' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.label}
                  sx={{ 
                    color: location.pathname === item.path ? '#ffc700' : '#333333',
                    fontWeight: location.pathname === item.path ? 'bold' : 'normal'
                  }}
                />
              </ListItem>
            ))}
            {(currentUser?.role === 'leader' || currentUser?.role === 'admin') && (
              <ListItem 
                key="admin-tools-mobile"
                component="div"
                onClick={() => handleNavigation('/admin')}
                sx={{
                  borderRadius: 1,
                  mb: 0.5,
                  cursor: 'pointer',
                  backgroundColor: location.pathname === '/admin' ? 'rgba(255, 199, 0, 0.1)' : 'transparent',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 199, 0, 0.1)'
                  }
                }}
              >
                <ListItemIcon sx={{ color: location.pathname === '/admin' ? '#ffc700' : '#666666' }}>
                  <AdminPanelSettings />
                </ListItemIcon>
                <ListItemText 
                  primary={t.navigation.adminTools}
                  sx={{ 
                    color: location.pathname === '/admin' ? '#ffc700' : '#333333',
                    fontWeight: location.pathname === '/admin' ? 'bold' : 'normal'
                  }}
                />
              </ListItem>
            )}
          </List>
          
          <Divider sx={{ my: 2 }} />
          
          <Box sx={{ px: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              {currentUser?.fullName || 'User'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {currentUser?.role ? currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1) : 'Guest'}
            </Typography>
          </Box>
        </Box>
      </Drawer>
    </>
  );
};

export default Header;