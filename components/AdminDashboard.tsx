import React, { useEffect, useMemo, useState } from 'react';
import {
  AppBar,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Toolbar,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Stack,
  Tabs,
  Tab,
  LinearProgress,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import { VocabItem } from '../types';
import {
  AdminUserDetail,
  AdminUserSummary,
  fetchAdminUserDetail,
  fetchAdminUsers,
} from '../services/apiService';

interface AdminDashboardProps {
  onLogout: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'vocab' | 'notes' | 'chat'>(
    'overview',
  );
  
  // Note: loading state removed as it's not used in the UI

  // Load list of users from backend
  const loadUsers = async () => {
    try {
      setError(null);
      const list = await fetchAdminUsers();
      setUsers(list);
      if (list.length && !selectedUserId) {
        setSelectedUserId(list[0].userId);
      }
    } catch (e: any) {
      console.error(e);
      setError('Không thể tải danh sách user từ backend.');
      setUsers([]);
    }
  };

  useEffect(() => {
    void loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load detail for selected user
  useEffect(() => {
    if (!selectedUserId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    const run = async () => {
      setError(null);
      try {
        const data = await fetchAdminUserDetail(selectedUserId);
        if (!cancelled) {
          setDetail(data);
        }
      } catch (e: any) {
        console.error(e);
        if (!cancelled) {
          setError('Không thể tải dữ liệu chi tiết từ backend.');
          setDetail(null);
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [selectedUserId]);

  const selectedUser = useMemo(
    () => users.find((u) => u.userId === selectedUserId) || null,
    [users, selectedUserId],
  );

  const handleRefresh = () => {
    setSelectedUserId(null);
    setUsers([]);
    setDetail(null);
    void loadUsers();
  };

  const handleClearUserData = () => {
    if (!selectedUser) return;
    if (!window.confirm(`Hiện tại chỉ xem dữ liệu Mongo, chưa hỗ trợ xoá trực tiếp.`)) {
      return;
    }
  };

  const handleDeleteUser = () => {
    if (!selectedUser) return;
    if (!window.confirm('Chưa hỗ trợ xoá user trực tiếp trong Mongo.')) {
      return;
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f1f5f9' }}>
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
            Admin Dashboard - IELTS Master
          </Typography>
          <Button
            color="inherit"
            startIcon={<LogoutIcon />}
            onClick={onLogout}
            size="small"
          >
            Thoát Admin
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>
          <Paper sx={{ width: 280, flexShrink: 0, borderRadius: 3, overflow: 'hidden' }}>
            <Box sx={{ p: 2, borderBottom: '1px solid #e2e8f0' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="subtitle1" fontWeight={600}>
                  Người dùng
                </Typography>
                <Button size="small" onClick={handleRefresh}>
                  Tải lại
                </Button>
              </Stack>
              <Typography variant="caption" color="text.secondary">
                Chỉ hiển thị user đã từng đăng nhập trên trình duyệt này.
              </Typography>
            </Box>
            <List dense disablePadding sx={{ maxHeight: '70vh', overflow: 'auto' }}>
              {users.length === 0 && !error && (
                <ListItem>
                  <ListItemText
                    primary="Chưa có user nào."
                    secondary="Học viên cần đăng nhập ít nhất một lần."
                    primaryTypographyProps={{ variant: 'body2' }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                </ListItem>
              )}
              {error && (
                <ListItem>
                  <ListItemText
                    primary={error}
                    primaryTypographyProps={{ variant: 'body2', color: 'error' }}
                  />
                </ListItem>
              )}
              {users.map((u) => (
                <ListItemButton
                  key={u.userId}
                  selected={u.userId === selectedUserId}
                  onClick={() => setSelectedUserId(u.userId)}
                >
                  <ListItemText
                    primary={
                      <Typography variant="body2" fontWeight={600} noWrap>
                        {u.name}
                      </Typography>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary" noWrap>
                        Lần cuối:{' '}
                        {u.lastLoginAt
                          ? new Date(u.lastLoginAt).toLocaleString()
                          : 'chưa có dữ liệu'}
                      </Typography>
                    }
                  />
                </ListItemButton>
              ))}
            </List>
          </Paper>

          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Paper sx={{ p: 2.5, borderRadius: 3 }} elevation={2}>
              {selectedUser && detail ? (
                <>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    justifyContent="space-between"
                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                    spacing={1.5}
                  >
                    <Box>
                      <Typography variant="h6" fontWeight={700}>
                        {selectedUser.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Tham gia: {new Date(selectedUser.joinedAt).toLocaleString()}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1}>
                      <Button size="small" variant="outlined" onClick={handleClearUserData}>
                        Xoá dữ liệu học
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        onClick={handleDeleteUser}
                      >
                        Xoá tài khoản
                      </Button>
                    </Stack>
                  </Stack>
                  <Stack direction="row" spacing={1.5} mt={2} flexWrap="wrap">
                    <Chip
                      label={`Từ vựng: ${detail.vocab?.length ?? 0}`}
                      color="primary"
                      size="small"
                    />
                    <Chip
                      label={`Bài ghi chú: ${detail.lessonNotes?.length ?? 0}`}
                      color="secondary"
                      size="small"
                    />
                    <Chip
                      label={`Lượt chat: ${detail.chatHistory?.length ?? 0}`}
                      size="small"
                    />
                  </Stack>

                  {/* KPI mini "chart" */}
                  <Box sx={{ mt: 3, display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        Tổng từ vựng
                      </Typography>
                      <Typography variant="h6" fontWeight={700}>
                        {detail.vocab?.length ?? 0}
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(100, (detail.vocab?.length ?? 0) * 5)}
                        sx={{ mt: 1, height: 6, borderRadius: 3 }}
                      />
                    </Paper>
                    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        Bài ghi chú
                      </Typography>
                      <Typography variant="h6" fontWeight={700}>
                        {detail.lessonNotes?.length ?? 0}
                      </Typography>
                      <LinearProgress
                        color="secondary"
                        variant="determinate"
                        value={Math.min(100, (detail.lessonNotes?.length ?? 0) * 10)}
                        sx={{ mt: 1, height: 6, borderRadius: 3 }}
                      />
                    </Paper>
                    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        Lượt chat
                      </Typography>
                      <Typography variant="h6" fontWeight={700}>
                        {detail.chatHistory?.length ?? 0}
                      </Typography>
                      <LinearProgress
                        color="success"
                        variant="determinate"
                        value={Math.min(100, (detail.chatHistory?.length ?? 0) / 2)}
                        sx={{ mt: 1, height: 6, borderRadius: 3 }}
                      />
                    </Paper>
                  </Box>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Chọn một user ở bên trái để xem chi tiết.
                </Typography>
              )}
            </Paper>

            {selectedUser && detail && (
              <>
                <Paper sx={{ borderRadius: 3 }}>
                  <Tabs
                    value={activeTab}
                    onChange={(_e, v) => setActiveTab(v)}
                    variant="scrollable"
                    scrollButtons="auto"
                  >
                    <Tab value="overview" label="Tổng quan" />
                    <Tab value="vocab" label="Từ vựng" />
                    <Tab value="notes" label="Ghi chú" />
                    <Tab value="chat" label="Hoạt động chat" />
                  </Tabs>
                </Paper>

                {(activeTab === 'overview' || activeTab === 'vocab') && (
                  <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    Từ vựng đã lưu
                  </Typography>
                  {(!detail.vocab || detail.vocab.length === 0) ? (
                    <Typography variant="body2" color="text.secondary">
                      User này chưa lưu từ vựng nào.
                    </Typography>
                  ) : (
                    <Box sx={{ maxHeight: 260, overflow: 'auto' }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell>Từ</TableCell>
                            <TableCell>Loại từ</TableCell>
                            <TableCell>Nghĩa ngắn</TableCell>
                            <TableCell>Ngày tạo</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {(detail.vocab as VocabItem[]).map((w) => (
                            <TableRow key={w.id || w.word} hover>
                              <TableCell>{w.word}</TableCell>
                              <TableCell>{(w as any).type}</TableCell>
                              <TableCell>{(w as any).short_meaning}</TableCell>
                              <TableCell>
                                {w.createdAt
                                  ? new Date(w.createdAt).toLocaleDateString()
                                  : '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Box>
                  )}
                  </Paper>
                )}

                {(activeTab === 'overview' || activeTab === 'notes') && (
                  <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    Ghi chú chung
                  </Typography>
                  {detail.globalNotes && detail.globalNotes.text ? (
                    <Box sx={{ maxHeight: 160, overflow: 'auto', whiteSpace: 'pre-wrap' }}>
                      <Typography variant="body2">{detail.globalNotes.text}</Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: 'block', mt: 1 }}
                      >
                        Lưu lần cuối:{' '}
                        {new Date(detail.globalNotes.savedAt).toLocaleString()}
                      </Typography>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Chưa có ghi chú chung cho user này.
                    </Typography>
                  )}
                  </Paper>
                )}

                {(activeTab === 'overview' || activeTab === 'notes') && (
                  <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    Các bài ghi chú chi tiết
                  </Typography>
                  {(!detail.lessonNotes || detail.lessonNotes.length === 0) ? (
                    <Typography variant="body2" color="text.secondary">
                      Chưa có sổ ghi chú nào.
                    </Typography>
                  ) : (
                    <Box sx={{ maxHeight: 260, overflow: 'auto' }}>
                      {detail.lessonNotes?.map((ln: any) => (
                        <Box key={ln.id} sx={{ mb: 2.5 }}>
                          <Typography variant="body2" fontWeight={600}>
                            {ln.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Cập nhật: {new Date(ln.updatedAt).toLocaleString()}
                          </Typography>
                          {ln.tasks && ln.tasks.length > 0 && (
                            <Box sx={{ mt: 0.5 }}>
                              <Typography variant="caption" color="text.secondary">
                                Nhiệm vụ:
                              </Typography>
                              <ul style={{ margin: 0, paddingLeft: 16 }}>
                                {ln.tasks.slice(0, 3).map((t: { id: string; text: string; done?: boolean }) => (
                                  <li key={t.id}>
                                    <Typography
                                      variant="caption"
                                      color={t.done ? 'text.secondary' : 'text.primary'}
                                    >
                                      {t.done ? '[Đã xong] ' : ''}
                                      {t.text}
                                    </Typography>
                                  </li>
                                ))}
                              </ul>
                            </Box>
                          )}
                          <Divider sx={{ mt: 1.5 }} />
                        </Box>
                      ))}
                    </Box>
                  )}
                  </Paper>
                )}

                {activeTab === 'chat' && (
                  <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      Lịch sử chat gần đây
                    </Typography>
                    {(!detail.chatHistory || detail.chatHistory.length === 0) ? (
                      <Typography variant="body2" color="text.secondary">
                        User này chưa có hoạt động chat nào được lưu.
                      </Typography>
                    ) : (
                      <Box sx={{ maxHeight: 280, overflow: 'auto' }}>
                        {detail.chatHistory
                          ?.slice(-20)
                          .map((c, idx) => (
                            <Box
                              key={`${c.timestamp}-${idx}`}
                              sx={{
                                mb: 1.5,
                                p: 1.5,
                                borderRadius: 2,
                                bgcolor: c.role === 'user' ? 'grey.100' : 'white',
                                border: '1px solid',
                                borderColor: c.role === 'user' ? 'grey.300' : 'grey.200',
                              }}
                            >
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ display: 'block', mb: 0.5 }}
                              >
                                {c.role === 'user' ? 'Học viên' : 'AI'} •{' '}
                                {new Date(c.timestamp).toLocaleString()}
                              </Typography>
                              <Typography variant="body2">{c.text}</Typography>
                            </Box>
                          ))}
                      </Box>
                    )}
                  </Paper>
                )}
              </>
            )}
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default AdminDashboard;


