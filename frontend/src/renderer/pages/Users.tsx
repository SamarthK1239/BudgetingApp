/**
 * User management
 * Admins manage accounts here; everyone can change their own password.
 */

import React, { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Popconfirm,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { DeleteOutlined, EditOutlined, KeyOutlined, UserAddOutlined } from '@ant-design/icons';
import apiClient, { AuthUser } from '../api/client';
import { useAuth } from '../contexts/AuthContext';

const { Title, Text } = Typography;

interface CreateUserValues {
  username: string;
  display_name?: string;
  password: string;
  is_admin: boolean;
}

interface EditUserValues {
  display_name?: string;
  is_admin: boolean;
  is_active: boolean;
  password?: string;
}

interface ChangePasswordValues {
  current_password: string;
  new_password: string;
  confirm: string;
}

const Users: React.FC = () => {
  const { user: currentUser, refresh } = useAuth();
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<AuthUser | null>(null);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [createForm] = Form.useForm<CreateUserValues>();
  const [editForm] = Form.useForm<EditUserValues>();
  const [passwordForm] = Form.useForm<ChangePasswordValues>();

  const isAdmin = Boolean(currentUser?.is_admin);

  const loadUsers = async (): Promise<void> => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setUsers(await apiClient.getUsers());
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Could not load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const handleCreate = async (values: CreateUserValues): Promise<void> => {
    setSubmitting(true);
    try {
      await apiClient.createUser({
        username: values.username.trim(),
        password: values.password,
        display_name: values.display_name || undefined,
        is_admin: values.is_admin,
      });
      message.success('User created');
      setCreateOpen(false);
      createForm.resetFields();
      await loadUsers();
    } catch (err: any) {
      message.error(err?.message || 'Could not create the user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (values: EditUserValues): Promise<void> => {
    if (!editing) return;
    setSubmitting(true);
    try {
      await apiClient.updateUser(editing.id, {
        display_name: values.display_name || undefined,
        is_admin: values.is_admin,
        is_active: values.is_active,
        password: values.password || undefined,
      });
      message.success('User updated');
      setEditing(null);
      editForm.resetFields();
      await loadUsers();
    } catch (err: any) {
      message.error(err?.message || 'Could not update the user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (user: AuthUser): Promise<void> => {
    try {
      await apiClient.deleteUser(user.id);
      message.success(`Deleted ${user.username}`);
      await loadUsers();
    } catch (err: any) {
      message.error(err?.message || 'Could not delete the user');
    }
  };

  const handleChangePassword = async (values: ChangePasswordValues): Promise<void> => {
    setSubmitting(true);
    try {
      await apiClient.changePassword(values.current_password, values.new_password);
      message.success('Password updated. Other sessions were signed out.');
      setPasswordOpen(false);
      passwordForm.resetFields();
      await refresh();
    } catch (err: any) {
      message.error(err?.message || 'Could not change the password');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: 'Username',
      dataIndex: 'username',
      key: 'username',
      render: (value: string, record: AuthUser) => (
        <Space>
          <Text strong>{value}</Text>
          {record.id === currentUser?.id && <Tag color="blue">you</Tag>}
        </Space>
      ),
    },
    {
      title: 'Display name',
      dataIndex: 'display_name',
      key: 'display_name',
      render: (value: string | null) => value || <Text type="secondary">—</Text>,
    },
    {
      title: 'Role',
      dataIndex: 'is_admin',
      key: 'is_admin',
      render: (value: boolean) =>
        value ? <Tag color="gold">Administrator</Tag> : <Tag>Member</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (value: boolean) =>
        value ? <Tag color="green">Active</Tag> : <Tag color="red">Disabled</Tag>,
    },
    {
      title: 'Last login',
      dataIndex: 'last_login_at',
      key: 'last_login_at',
      render: (value: string | null) =>
        value ? new Date(value).toLocaleString() : <Text type="secondary">Never</Text>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: AuthUser) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setEditing(record);
              editForm.setFieldsValue({
                display_name: record.display_name || undefined,
                is_admin: record.is_admin,
                is_active: record.is_active,
                password: undefined,
              });
            }}
          >
            Edit
          </Button>
          <Popconfirm
            title={`Delete ${record.username}?`}
            description="This cannot be undone. Budget data is shared and will be kept."
            okText="Delete"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(record)}
            disabled={record.id === currentUser?.id}
          >
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              disabled={record.id === currentUser?.id}
            >
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <Title level={2} style={{ margin: 0 }}>
          Users
        </Title>
        <Space>
          <Button icon={<KeyOutlined />} onClick={() => setPasswordOpen(true)}>
            Change my password
          </Button>
          {isAdmin && (
            <Button type="primary" icon={<UserAddOutlined />} onClick={() => setCreateOpen(true)}>
              Add User
            </Button>
          )}
        </Space>
      </div>

      {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />}

      {isAdmin ? (
        <Card>
          <Table
            rowKey="id"
            columns={columns}
            dataSource={users}
            loading={loading}
            pagination={false}
          />
        </Card>
      ) : (
        <Card>
          <Text type="secondary">
            Only administrators can manage user accounts. You can still change your own
            password using the button above.
          </Text>
        </Card>
      )}

      <Modal
        title="Add user"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form<CreateUserValues>
          form={createForm}
          layout="vertical"
          onFinish={handleCreate}
          initialValues={{ is_admin: false }}
          requiredMark={false}
        >
          <Form.Item
            name="username"
            label="Username"
            rules={[
              { required: true, message: 'Please enter a username' },
              { min: 3, message: 'Username must be at least 3 characters' },
              {
                pattern: /^[A-Za-z0-9._-]+$/,
                message: 'Use only letters, numbers, dots, dashes or underscores',
              },
            ]}
          >
            <Input placeholder="username" />
          </Form.Item>

          <Form.Item name="display_name" label="Display name (optional)">
            <Input placeholder="Their name" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[
              { required: true, message: 'Please enter a password' },
              { min: 8, message: 'Password must be at least 8 characters' },
            ]}
          >
            <Input.Password placeholder="At least 8 characters" autoComplete="new-password" />
          </Form.Item>

          <Form.Item name="is_admin" label="Administrator" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" block loading={submitting}>
              Create User
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editing ? `Edit ${editing.username}` : 'Edit user'}
        open={Boolean(editing)}
        onCancel={() => setEditing(null)}
        footer={null}
        destroyOnClose
      >
        <Form<EditUserValues>
          form={editForm}
          layout="vertical"
          onFinish={handleEdit}
          requiredMark={false}
        >
          <Form.Item name="display_name" label="Display name">
            <Input placeholder="Their name" />
          </Form.Item>

          <Form.Item name="is_admin" label="Administrator" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item name="is_active" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item
            name="password"
            label="Reset password (optional)"
            rules={[{ min: 8, message: 'Password must be at least 8 characters' }]}
            extra="Setting a new password signs this user out everywhere."
          >
            <Input.Password placeholder="Leave blank to keep current" autoComplete="new-password" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" block loading={submitting}>
              Save Changes
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Change my password"
        open={passwordOpen}
        onCancel={() => setPasswordOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form<ChangePasswordValues>
          form={passwordForm}
          layout="vertical"
          onFinish={handleChangePassword}
          requiredMark={false}
        >
          <Form.Item
            name="current_password"
            label="Current password"
            rules={[{ required: true, message: 'Please enter your current password' }]}
          >
            <Input.Password autoComplete="current-password" />
          </Form.Item>

          <Form.Item
            name="new_password"
            label="New password"
            rules={[
              { required: true, message: 'Please enter a new password' },
              { min: 8, message: 'Password must be at least 8 characters' },
            ]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>

          <Form.Item
            name="confirm"
            label="Confirm new password"
            dependencies={['new_password']}
            rules={[
              { required: true, message: 'Please confirm your new password' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('new_password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('The two passwords do not match'));
                },
              }),
            ]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" block loading={submitting}>
              Update Password
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Users;
