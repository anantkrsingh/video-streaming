import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  Button,
  AppBar,
  Toolbar,
  Avatar,
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { getOrganization } from '../services/organizationService';
import type { OrganizationDetail } from '../services/organizationService';
import VideoList from './VideoList';
import VideoUpload from './VideoUpload';
import AccessManagement from './AccessManagement';
import AvatarMenu from './AvatarMenu';
import { useAuth } from '../contexts/AuthContext';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`org-tabpanel-${index}`}
      aria-labelledby={`org-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

/**
 * Organization Dashboard Component
 * Main dashboard for managing organization videos and access
 */
const OrganizationDashboard: React.FC = () => {
  const { organizationId } = useParams<{ organizationId: string }>();
  const [tabValue, setTabValue] = useState(0);
  const [organization, setOrganization] = useState<OrganizationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (organizationId) {
      fetchOrganization();
    }
  }, [organizationId]);

  const fetchOrganization = async () => {
    if (!organizationId) return;

    try {
      setLoading(true);
      const response = await getOrganization(organizationId);
      setOrganization(response.data.organization);
    } catch (error: any) {
      console.error('Error fetching organization:', error);
      if (error.response?.status === 403 || error.response?.status === 404) {
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  if (!organization) {
    return (
      <Container>
        <Typography variant="h4" sx={{ mt: 4 }}>
          Organization not found
        </Typography>
      </Container>
    );
  }

  const canManageAccess = organization.userRole === 'owner' || organization.userRole === 'admin';
  const canUpload = organization.userRole === 'owner' || organization.userRole === 'admin' || organization.userRole === 'editor';

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {organization.name}
          </Typography>
          <AvatarMenu />
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <Paper sx={{ mb: 3 }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="organization tabs">
            <Tab label="Videos" />
            {canUpload && <Tab label="Upload" />}
            {canManageAccess && <Tab label="Manage Access" />}
          </Tabs>
        </Paper>

        <TabPanel value={tabValue} index={0}>
          <VideoList 
            organizationId={organization.id} 
            organizationRole={organization.userRole}
            hideHeader={true}
          />
        </TabPanel>

        {canUpload && (
          <TabPanel value={tabValue} index={1}>
            <VideoUpload organizationId={organization.id} />
          </TabPanel>
        )}

        {canManageAccess && (
          <TabPanel value={tabValue} index={canUpload ? 2 : 1}>
            <AccessManagement organization={organization} onUpdate={fetchOrganization} />
          </TabPanel>
        )}
      </Container>
    </Box>
  );
};

export default OrganizationDashboard;

