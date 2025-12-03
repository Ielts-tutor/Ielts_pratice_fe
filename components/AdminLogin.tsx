import React, { useState } from 'react';
import { Box, Button, Card, CardContent, CardHeader, TextField, Typography } from '@mui/material';

interface AdminLoginProps {
  onSuccess: () => void;
  onBack: () => void;
}

const ADMIN_PASSWORD = '123123';

const AdminLogin: React.FC<AdminLoginProps> = ({ onSuccess, onBack }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setError('');
      onSuccess();
    } else {
      setError('Mật khẩu admin không đúng.');
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#f1f5f9',
        p: 2,
      }}
    >
      <Card sx={{ maxWidth: 420, width: '100%', borderRadius: 4, boxShadow: 6 }}>
        <CardHeader
          title={
            <Typography variant="h5" fontWeight={700}>
              Admin Dashboard
            </Typography>
          }
          subheader="Đăng nhập để xem danh sách user và dữ liệu học."
        />
        <CardContent>
          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              type="password"
              label="Mật khẩu Admin"
              value={password}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => setPassword(event.target.value)}
              fullWidth
              size="small"
            />
            {error && (
              <Typography color="error" variant="body2">
                {error}
              </Typography>
            )}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
              <Button variant="outlined" onClick={onBack}>
                Quay lại học viên
              </Button>
              <Button type="submit" variant="contained">
                Đăng nhập
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default AdminLogin;


