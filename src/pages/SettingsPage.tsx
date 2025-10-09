import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Save,
  Settings,
  Business,
  Security,
  Email,
  Refresh
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Helmet } from 'react-helmet-async';
import { CURRENCIES } from '@/utils/currency';
import { apiService } from '@/services/api';

interface Setting {
  id: string;
  key: string;
  value: string;
  description?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}



const settingSchema = yup.object({
  key: yup.string().required('Key is required'),
  value: yup.string().required('Value is required'),
  description: yup.string(),
  isPublic: yup.boolean()
});

const businessSchema = yup.object({
  companyName: yup.string().required('Company name is required'),
  companyAddress: yup.string().required('Company address is required'),
  companyPhone: yup.string().required('Company phone is required'),
  companyEmail: yup.string().email('Valid email required').required('Company email is required'),
  companyLogo: yup.string(),
  taxRate: yup.number().min(0).max(1).required('Tax rate is required'),
  currency: yup.string().required('Currency is required'),
  businessHours: yup.string().required('Business hours are required'),
  timezone: yup.string().required('Timezone is required')
});

const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingSetting, setEditingSetting] = useState<Setting | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [settingToDelete, setSettingToDelete] = useState<Setting | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm({
    resolver: yupResolver(settingSchema),
    defaultValues: {
      key: '',
      value: '',
      description: '',
      isPublic: false
    }
  });

  const {
    control: businessControl,
    handleSubmit: handleBusinessSubmit,
    reset: resetBusiness,
    formState: { errors: businessErrors }
  } = useForm({
    resolver: yupResolver(businessSchema),
    defaultValues: {
      companyName: '',
      companyAddress: '',
      companyPhone: '',
      companyEmail: '',
      companyLogo: '',
      taxRate: 0.08,
      currency: 'BDT',
      businessHours: '9:00 AM - 6:00 PM',
      timezone: 'UTC'
    }
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (settings.length > 0) {
      loadBusinessSettings();
    }
  }, [settings]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/settings');
      if (response.success && Array.isArray(response.data)) {
        setSettings(response.data);
      } else if (Array.isArray(response)) {
        setSettings(response);
      } else {
        setSettings([]);
      }
    } catch (err) {
      setError('Failed to load settings');
      console.error('Settings fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (setting?: Setting) => {
    if (setting) {
      setEditingSetting(setting);
      reset({
        key: setting.key,
        value: setting.value,
        description: setting.description || '',
        isPublic: setting.isPublic
      });
    } else {
      setEditingSetting(null);
      reset({
        key: '',
        value: '',
        description: '',
        isPublic: false
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingSetting(null);
    reset();
  };

  const handleDeleteClick = (setting: Setting) => {
    setSettingToDelete(setting);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!settingToDelete) return;

    try {
      await apiService.delete(`/settings/${settingToDelete.key}`);
      fetchSettings();
      setDeleteDialogOpen(false);
      setSettingToDelete(null);
      setSuccess('Setting deleted successfully');
    } catch (err) {
      setError('Failed to delete setting');
      console.error('Delete setting error:', err);
    }
  };

  const onSubmit = async (data: any) => {
    try {
      if (editingSetting) {
        await apiService.put(`/settings/${editingSetting.key}`, data);
      } else {
        await apiService.post('/settings', data);
      }
      fetchSettings();
      handleCloseDialog();
      setSuccess(editingSetting ? 'Setting updated successfully' : 'Setting created successfully');
    } catch (err) {
      setError(editingSetting ? 'Failed to update setting' : 'Failed to create setting');
      console.error('Setting save error:', err);
    }
  };

  const onBusinessSubmit = async (data: any) => {
    try {
      // Create or update business settings
      const updates = Object.entries(data).map(([key, value]) => ({
        key: key.toUpperCase(),
        value: String(value),
        description: `Business setting: ${key}`,
        isPublic: true
      }));

      // Process updates with a small delay between each to avoid rate limiting
      for (let i = 0; i < updates.length; i++) {
        const update = updates[i];
        try {
          // Try to update first
          await apiService.put(`/settings/${update.key}`, update);
        } catch (updateError: any) {
          // If update fails (404), try to create
          if (updateError.response?.status === 404) {
            await apiService.post('/settings', update);
          } else {
            throw updateError;
          }
        }
        
        // Add a small delay between requests to avoid rate limiting
        if (i < updates.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      fetchSettings();
      setSuccess('Business settings updated successfully');
    } catch (err) {
      setError('Failed to update business settings');
      console.error('Business settings error:', err);
    }
  };

  const getSettingValue = (key: string) => {
    const setting = settings.find(s => s.key === key);
    return setting?.value || '';
  };

  const loadBusinessSettings = () => {
    const taxRateValue = getSettingValue('TAXRATE');
    const parsedTaxRate = taxRateValue ? parseFloat(taxRateValue) : 0;
    
    const businessData = {
      companyName: getSettingValue('COMPANYNAME'),
      companyAddress: getSettingValue('COMPANYADDRESS'),
      companyPhone: getSettingValue('COMPANYPHONE'),
      companyEmail: getSettingValue('COMPANYEMAIL'),
      companyLogo: getSettingValue('COMPANYLOGO'),
      taxRate: isNaN(parsedTaxRate) ? 0 : parsedTaxRate,
      currency: getSettingValue('CURRENCY') || 'BDT',
      businessHours: getSettingValue('BUSINESSHOURS') || '9:00 AM - 6:00 PM',
      timezone: getSettingValue('TIMEZONE') || 'UTC'
    };

    resetBusiness(businessData);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <Helmet>
        <title>Settings - PrintShop Management</title>
      </Helmet>
      <Box p={3}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4">Settings</Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
          >
            Add Setting
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        {/* Settings Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
            <Tab label="General" icon={<Settings />} />
            <Tab label="Business" icon={<Business />} />
            <Tab label="Security" icon={<Security />} />
            <Tab label="Email" icon={<Email />} />
          </Tabs>
        </Box>

        {/* General Settings Tab */}
        {activeTab === 0 && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>General Settings</Typography>
              
              {/* Service Toggles */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom color="primary">
                  Service Configuration
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Card variant="outlined">
                      <CardContent>
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Box>
                            <Typography variant="h6">Photocopy Service</Typography>
                            <Typography variant="body2" color="text.secondary">
                              Enable/disable the photocopy service page
                            </Typography>
                          </Box>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={getSettingValue('PHOTOCOPY_SERVICE_ENABLED') === 'true'}
                                onChange={async (e) => {
                                  try {
                                    const value = e.target.checked ? 'true' : 'false';
                                    const settingData = {
                                      key: 'PHOTOCOPY_SERVICE_ENABLED',
                                      value: value,
                                      description: 'Enable or disable the photocopy service',
                                      isPublic: true
                                    };

                                    // Try to update first, if it fails (404), create new setting
                                    try {
                                      await apiService.put('/settings/PHOTOCOPY_SERVICE_ENABLED', settingData);
                                    } catch (updateError: any) {
                                      if (updateError.response?.status === 404) {
                                        // Setting doesn't exist, create it
                                        await apiService.post('/settings', settingData);
                                      } else {
                                        throw updateError;
                                      }
                                    }

                                    fetchSettings();
                                    setSuccess('Photocopy service setting updated successfully');
                                  } catch (err) {
                                    console.error('Photocopy setting error:', err);
                                    setError('Failed to update photocopy service setting');
                                  }
                                }}
                              />
                            }
                            label={getSettingValue('PHOTOCOPY_SERVICE_ENABLED') === 'true' ? 'Enabled' : 'Disabled'}
                          />
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Box>

              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                All Settings
              </Typography>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Key</TableCell>
                      <TableCell>Value</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell>Public</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {settings.map((setting) => (
                      <TableRow key={setting.id}>
                        <TableCell>
                          <Typography variant="subtitle2">{setting.key}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                            {setting.value}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {setting.description || 'No description'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={setting.isPublic ? 'Public' : 'Private'}
                            color={setting.isPublic ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton size="small" onClick={() => handleOpenDialog(setting)}>
                            <Edit />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            onClick={() => handleDeleteClick(setting)}
                            color="error"
                          >
                            <Delete />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        )}

                 {/* Business Settings Tab */}
         {activeTab === 1 && (
           <Card>
             <CardContent>
               <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                 <Typography variant="h6">Business Settings</Typography>
                 <Button
                   variant="outlined"
                   startIcon={<Refresh />}
                   onClick={loadBusinessSettings}
                 >
                   Load Current Settings
                 </Button>
               </Box>
               <form onSubmit={handleBusinessSubmit(onBusinessSubmit)}>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="companyName"
                      control={businessControl}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Company Name"
                          error={!!businessErrors.companyName}
                          helperText={businessErrors.companyName?.message}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="companyPhone"
                      control={businessControl}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Company Phone"
                          error={!!businessErrors.companyPhone}
                          helperText={businessErrors.companyPhone?.message}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Controller
                      name="companyAddress"
                      control={businessControl}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Company Address"
                          multiline
                          rows={2}
                          error={!!businessErrors.companyAddress}
                          helperText={businessErrors.companyAddress?.message}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Controller
                      name="companyLogo"
                      control={businessControl}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Company Logo URL"
                          placeholder="https://example.com/logo.png"
                          error={!!businessErrors.companyLogo}
                          helperText={businessErrors.companyLogo?.message || "Enter the URL of your company logo"}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="companyEmail"
                      control={businessControl}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Company Email"
                          type="email"
                          error={!!businessErrors.companyEmail}
                          helperText={businessErrors.companyEmail?.message}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="currency"
                      control={businessControl}
                      render={({ field }) => (
                        <FormControl fullWidth error={!!businessErrors.currency}>
                          <InputLabel>Currency</InputLabel>
                          <Select {...field} label="Currency">
                            {Object.entries(CURRENCIES).map(([code, info]) => (
                              <MenuItem key={code} value={code}>
                                {info.symbol} {info.name} ({code})
                              </MenuItem>
                            ))}
                          </Select>
                          {businessErrors.currency && (
                            <Typography variant="caption" color="error" sx={{ mt: 1, ml: 2 }}>
                              {businessErrors.currency.message}
                            </Typography>
                          )}
                        </FormControl>
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="taxRate"
                      control={businessControl}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Tax Rate (%)"
                          type="number"
                          inputProps={{ min: 0, max: 100, step: 0.01 }}
                          error={!!businessErrors.taxRate}
                          helperText={businessErrors.taxRate?.message}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="businessHours"
                      control={businessControl}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Business Hours"
                          error={!!businessErrors.businessHours}
                          helperText={businessErrors.businessHours?.message}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Button type="submit" variant="contained" startIcon={<Save />}>
                      Save Business Settings
                    </Button>
                  </Grid>
                </Grid>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Security Settings Tab */}
        {activeTab === 2 && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Security Settings</Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Session Timeout (minutes)"
                    type="number"
                    defaultValue={30}
                    inputProps={{ min: 5, max: 480 }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Max Login Attempts"
                    type="number"
                    defaultValue={5}
                    inputProps={{ min: 3, max: 10 }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Minimum Password Length"
                    type="number"
                    defaultValue={8}
                    inputProps={{ min: 6, max: 20 }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={<Switch defaultChecked />}
                    label="Enable Audit Logging"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={<Switch />}
                    label="Require Two-Factor Authentication"
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button variant="contained" startIcon={<Save />}>
                    Save Security Settings
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* Email Settings Tab */}
        {activeTab === 3 && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Email Settings</Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="SMTP Host"
                    defaultValue="smtp.gmail.com"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="SMTP Port"
                    type="number"
                    defaultValue={587}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="SMTP Username"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="SMTP Password"
                    type="password"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="From Email"
                    type="email"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="From Name"
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button variant="contained" startIcon={<Save />}>
                    Save Email Settings
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* Create/Edit Setting Dialog */}
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>
            {editingSetting ? 'Edit Setting' : 'Add New Setting'}
          </DialogTitle>
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogContent>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Controller
                    name="key"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Setting Key"
                        error={!!errors.key}
                        helperText={errors.key?.message}
                        disabled={!!editingSetting}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Controller
                    name="value"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Setting Value"
                        multiline
                        rows={3}
                        error={!!errors.value}
                        helperText={errors.value?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Controller
                    name="description"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Description"
                        multiline
                        rows={2}
                        error={!!errors.description}
                        helperText={errors.description?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Controller
                    name="isPublic"
                    control={control}
                    render={({ field }) => (
                      <FormControlLabel
                        control={
                          <Switch
                            checked={field.value}
                            onChange={field.onChange}
                          />
                        }
                        label="Public Setting"
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDialog}>Cancel</Button>
              <Button type="submit" variant="contained">
                {editingSetting ? 'Update' : 'Create'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>Delete Setting</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete the setting{' '}
              <strong>{settingToDelete?.key}</strong>? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleDeleteConfirm} color="error" variant="contained">
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </>
  );
};

export default SettingsPage;