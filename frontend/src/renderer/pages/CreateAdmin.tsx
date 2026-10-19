/**
 * First-run administrator creation
 * Shown only while the server has no user accounts at all.
 */

import React, { useState } from 'react';
import { Alert, Button, Card, Form, Input, Typography, theme } from 'antd';
import { LockOutlined, SafetyCertificateOutlined, UserOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import ServerSettings from '../components/ServerSettings';

const { Title, Text, Paragraph } = Typography;

interface BootstrapFormValues {
  username: string;
  display_name?: string;
  password: string;
  confirm: string;
}

const CreateAdmin: React.FC = () => {
  const { bootstrap } = useAuth();
  const { token } = theme.useToken();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (values: BootstrapFormValues): Promise<void> => {
    setSubmitting(true);
    setError(null);
    try {
      await bootstrap(values.username.trim(), values.password, values.display_name);
    } catch (err: any) {
      setError(err?.message || 'Could not create the administrator account');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        padding: 24,
        background: token.colorBgLayout,
      }}
    >
      <Card style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <SafetyCertificateOutlined style={{ fontSize: 40, color: token.colorPrimary }} />
          <Title level={3} style={{ marginTop: 12, marginBottom: 4 }}>
            Create your administrator account
          </Title>
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            This server has no accounts yet. The first account you create becomes the
            administrator and can add more users later.
          </Paragraph>
        </div>

        {error && (
          <Alert
            type="error"
            message={error}
            showIcon
            style={{ marginBottom: 16 }}
            closable
            onClose={() => setError(null)}
          />
        )}

        <Form<BootstrapFormValues> layout="vertical" onFinish={handleSubmit} requiredMark={false}>
          <Form.Item
            name="username"
            label="Username"
            rules={[
              { required: true, message: 'Please choose a username' },
              { min: 3, message: 'Username must be at least 3 characters' },
              {
                pattern: /^[A-Za-z0-9._-]+$/,
                message: 'Use only letters, numbers, dots, dashes or underscores',
              },
            ]}
          >
            <Input prefix={<UserOutlined />} placeholder="admin" autoFocus size="large" />
          </Form.Item>

          <Form.Item name="display_name" label="Display name (optional)">
            <Input placeholder="Your name" size="large" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[
              { required: true, message: 'Please choose a password' },
              { min: 8, message: 'Password must be at least 8 characters' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="confirm"
            label="Confirm password"
            dependencies={['password']}
            rules={[
              { required: true, message: 'Please confirm your password' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('The two passwords do not match'));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Repeat your password"
              autoComplete="new-password"
              size="large"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" block size="large" loading={submitting}>
              Create Account
            </Button>
          </Form.Item>
        </Form>

        <Text type="secondary" style={{ display: 'block', marginTop: 16, fontSize: 12 }}>
          Forgot these credentials later? Run{' '}
          <code>python -m app.cli reset-password --username &lt;name&gt;</code> on the server.
        </Text>
      </Card>

      <ServerSettings />
    </div>
  );
};

export default CreateAdmin;
