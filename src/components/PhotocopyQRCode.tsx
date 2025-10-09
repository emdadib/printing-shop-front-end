import React from 'react';
import {
  Box,
  Typography,
  Button,
  Paper
} from '@mui/material';
import {
  QrCode,
  Print,
  Share
} from '@mui/icons-material';

interface PhotocopyQRCodeProps {
  url?: string;
}

const PhotocopyQRCode: React.FC<PhotocopyQRCodeProps> = ({ 
  url = `${window.location.origin}/photocopy` 
}) => {
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Photocopy Service',
          text: 'Access our photocopy service',
          url: url
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(url).then(() => {
        alert('URL copied to clipboard!');
      });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Paper 
      sx={{ 
        p: 3, 
        textAlign: 'center',
        maxWidth: 400,
        mx: 'auto',
        '@media print': {
          boxShadow: 'none',
          border: '1px solid #ccc'
        }
      }}
    >
      <Typography variant="h5" gutterBottom>
        Photocopy Service
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
        Scan QR code to access photocopy service
      </Typography>

      {/* QR Code Placeholder - In a real app, you'd use a QR code library */}
      <Box
        sx={{
          width: 200,
          height: 200,
          border: '2px solid #ccc',
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mx: 'auto',
          mb: 2,
          bgcolor: '#f5f5f5'
        }}
      >
        <QrCode sx={{ fontSize: 100, color: '#666' }} />
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {url}
      </Typography>

      <Box display="flex" gap={1} justifyContent="center">
        <Button
          variant="outlined"
          startIcon={<Share />}
          onClick={handleShare}
          size="small"
        >
          Share
        </Button>
        <Button
          variant="outlined"
          startIcon={<Print />}
          onClick={handlePrint}
          size="small"
        >
          Print
        </Button>
      </Box>
    </Paper>
  );
};

export default PhotocopyQRCode;
