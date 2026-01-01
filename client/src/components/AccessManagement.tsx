import React, { useState } from 'react';
import {
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Menu,
  MenuItem,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  FormControl,
  InputLabel,
  Alert,
} from '@mui/material';
import {
  Add,
  MoreVert,
  Delete,
  Edit,
} from '@mui/icons-material';
import { addMember, removeMember, updateMemberRole } from '../services/organizationService';
import type { OrganizationDetail } from '../services/organizationService';

interface AccessManagementProps {
  organization: OrganizationDetail;
  onUpdate: () => void;
}

/**
 * Access Management Component
 * Allows owners/admins to add and manage organization members
 */
const AccessManagement: React.FC<AccessManagementProps> = ({ organization, onUpdate }) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'viewer' | 'editor' | 'admin'>('viewer');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editRole, setEditRole] = useState<'viewer' | 'editor' | 'admin'>('viewer');

  const handleAddMember = async () => {
    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await addMember(organization.id, { email: email.trim(), role });
      setSuccess('Member added successfully');
      setEmail('');
      setRole('viewer');
      setAddDialogOpen(false);
      onUpdate();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, memberId: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedMember(memberId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedMember(null);
  };

  const handleDelete = async () => {
    if (!selectedMember) return;

    try {
      setLoading(true);
      await removeMember(organization.id, selectedMember);
      setSuccess('Member removed successfully');
      handleMenuClose();
      onUpdate();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to remove member');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (memberId: string, currentRole: 'viewer' | 'editor' | 'admin') => {
    setSelectedMember(memberId);
    setEditRole(currentRole);
    setEditDialogOpen(true);
    handleMenuClose();
  };

  const handleUpdateRole = async () => {
    if (!selectedMember) return;

    try {
      setLoading(true);
      await updateMemberRole(organization.id, selectedMember, editRole);
      setSuccess('Member role updated successfully');
      setEditDialogOpen(false);
      setSelectedMember(null);
      onUpdate();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update role');
    } finally {
      setLoading(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'error';
      case 'editor':
        return 'warning';
      case 'viewer':
        return 'default';
      default:
        return 'default';
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Manage Access</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setAddDialogOpen(true)}
        >
          Add Member
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {/* Owner Row */}
            <TableRow>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {organization.owner.name}
                  <Chip label="Owner" color="primary" size="small" />
                </Box>
              </TableCell>
              <TableCell>{organization.owner.email}</TableCell>
              <TableCell>
                <Chip label="Owner" color="primary" />
              </TableCell>
              <TableCell align="right">-</TableCell>
            </TableRow>

            {/* Members Rows */}
            {organization.members.map((member) => (
              <TableRow key={member.user.id}>
                <TableCell>{member.user.name}</TableCell>
                <TableCell>{member.user.email}</TableCell>
                <TableCell>
                  <Chip label={member.role} color={getRoleColor(member.role) as any} />
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    onClick={(e) => handleMenuOpen(e, member.user.id)}
                  >
                    <MoreVert />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}

            {organization.members.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  <Typography color="text.secondary">
                    No members yet. Add members to grant access.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add Member Dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Member</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Email Address"
            type="email"
            fullWidth
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth>
            <InputLabel>Role</InputLabel>
            <Select
              value={role}
              label="Role"
              onChange={(e) => setRole(e.target.value as 'viewer' | 'editor' | 'admin')}
              disabled={loading}
            >
              <MenuItem value="viewer">Viewer (Read-only)</MenuItem>
              <MenuItem value="editor">Editor (Upload & Manage)</MenuItem>
              <MenuItem value="admin">Admin (Full Access)</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleAddMember}
            variant="contained"
            disabled={!email.trim() || loading}
          >
            {loading ? 'Adding...' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Update Member Role</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Role</InputLabel>
            <Select
              value={editRole}
              label="Role"
              onChange={(e) => setEditRole(e.target.value as 'viewer' | 'editor' | 'admin')}
              disabled={loading}
            >
              <MenuItem value="viewer">Viewer (Read-only)</MenuItem>
              <MenuItem value="editor">Editor (Upload & Manage)</MenuItem>
              <MenuItem value="admin">Admin (Full Access)</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleUpdateRole}
            variant="contained"
            disabled={loading}
          >
            {loading ? 'Updating...' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem
          onClick={() => {
            const member = organization.members.find(
              (m) => m.user.id === selectedMember
            );
            if (member) {
              handleEdit(selectedMember!, member.role);
            }
          }}
        >
          <Edit sx={{ mr: 1 }} />
          Edit Role
        </MenuItem>
        <MenuItem onClick={handleDelete}>
          <Delete sx={{ mr: 1 }} />
          Remove
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default AccessManagement;

