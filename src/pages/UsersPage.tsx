import React from 'react'
import { Box, Typography, Paper } from '@mui/material'
import { Helmet } from 'react-helmet-async'

const UsersPage: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Users - PrintShop Management</title>
      </Helmet>
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          Users
        </Typography>
        <Paper sx={{ p: 3 }}>
          <Typography variant="body1" color="text.secondary">
            User management page - Coming soon
          </Typography>
        </Paper>
      </Box>
    </>
  )
}

export default UsersPage 