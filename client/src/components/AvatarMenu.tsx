import React, { useState, useEffect } from 'react';
import {
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  CircularProgress,
} from '@mui/material';
import {
  Business,
  Add,
  Logout,
  Settings,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getMyOrganizations, createOrganization } from '../services/organizationService';
import type { Organization } from '../services/organizationService';

/**
 * Avatar Menu Component
 * Shows user avatar with dropdown menu for organizations
 */
const AvatarMenu: React.FC = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [orgDescription, setOrgDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const open = Boolean(anchorEl);

  useEffect(() => {
    if (open && user) {
      fetchOrganizations();
    }
  }, [open, user]);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      const response = await getMyOrganizations();
      setOrganizations(response.data.organizations);
    } catch (error) {
      console.error('Error fetching organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleCreateOrganization = () => {
    setCreateDialogOpen(true);
    handleClose();
  };

  const handleCreateSubmit = async () => {
    if (!orgName.trim()) return;

    try {
      setCreating(true);
      const response = await createOrganization({
        name: orgName.trim(),
        description: orgDescription.trim() || undefined,
      });
      
      // Navigate to organization dashboard
      navigate(`/dashboard/${response.data.organization.id}`);
      setCreateDialogOpen(false);
      setOrgName('');
      setOrgDescription('');
    } catch (error: any) {
      console.error('Error creating organization:', error);
      alert(error.response?.data?.message || 'Failed to create organization');
    } finally {
      setCreating(false);
    }
  };

  const handleOrganizationClick = (organizationId: string) => {
    navigate(`/dashboard/${organizationId}`);
    handleClose();
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    handleClose();
  };

  return (
    <>
      <Avatar
        onClick={handleClick}
        sx={{
          cursor: 'pointer',
          bgcolor: 'primary.main',
        }}
      >
        {user?.name.charAt(0).toUpperCase()}
      </Avatar>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={handleCreateOrganization}>
          <ListItemIcon>
            <Add fontSize="small" />
          </ListItemIcon>
          <ListItemText>Create Organization</ListItemText>
        </MenuItem>

        <Divider />

        {loading ? (
          <MenuItem disabled>
            <CircularProgress size={20} />
          </MenuItem>
        ) : organizations.length > 0 ? (
          organizations.map((org) => (
            <MenuItem
              key={org.id}
              onClick={() => handleOrganizationClick(org.id)}
            >
              <ListItemIcon>
                <Business fontSize="small" />
              </ListItemIcon>
              <ListItemText primary={org.name} />
            </MenuItem>
          ))
        ) : (
          <MenuItem disabled>
            <ListItemText primary="No organizations" />
          </MenuItem>
        )}

        <Divider />

        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <Logout fontSize="small" />
          </ListItemIcon>
          <ListItemText>Logout</ListItemText>
        </MenuItem>
      </Menu>

      {/* Create Organization Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Organization</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Organization Name"
            fullWidth
            required
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            disabled={creating}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Description (Optional)"
            fullWidth
            multiline
            rows={3}
            value={orgDescription}
            onChange={(e) => setOrgDescription(e.target.value)}
            disabled={creating}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)} disabled={creating}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateSubmit}
            variant="contained"
            disabled={!orgName.trim() || creating}
          >
            {creating ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AvatarMenu;

